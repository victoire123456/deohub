import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socketStore';
import { createNotification } from './notificationController';

export const getConversations = async (req: AuthRequest, res: Response) => {
  const myId = req.user?.id;
  if (!myId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Fetch unique users that we have a message history with
    const conversationsResult = await pool.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (other_user.id)
               other_user.id AS user_id,
               other_user.username,
               other_user.avatar_url,
               other_user.e2ee_public_key,
               m.id AS last_message_id,
               m.message AS last_message,
               m.type AS last_message_type,
               m.status AS last_message_status,
               m.sender_id AS last_message_sender_id,
               m.created_at AS last_message_created_at,
               (
                 SELECT COUNT(*) FROM messages 
                 WHERE sender_id = other_user.id AND receiver_id = $1 AND status != 'seen'
               )::int AS unread_count
        FROM (
          SELECT id, sender_id, receiver_id, message, type, status, created_at,
                 CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id
          FROM messages
          WHERE (sender_id = $1 OR receiver_id = $1)
        ) m
        JOIN users other_user ON m.other_user_id = other_user.id
        ORDER BY other_user.id, m.created_at DESC
      ) conversations_sub
      ORDER BY last_message_created_at DESC`,
      [myId]
    );

    let list = conversationsResult.rows;

    // If conversations list is empty, fetch general users so user can chat to start cleanly
    if (list.length === 0) {
      const allUsers = await pool.query(
        `SELECT id AS user_id, username, avatar_url, e2ee_public_key,
                'Say hello!' AS last_message, 'text' AS last_message_type, 'sent' AS last_message_status,
                id AS last_message_sender_id, created_at AS last_message_created_at,
                0 AS unread_count
         FROM users
         WHERE id != $1
         ORDER BY username ASC
         LIMIT 30`,
        [myId]
      );
      list = allUsers.rows;
    }

    res.json(list);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const myId = req.user?.id;
  if (!myId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      `SELECT m.*, 
       parent.message AS reply_to_message,
       parent.sender_id AS reply_to_sender_id,
       parent_sender.username AS reply_to_sender_username,
       COALESCE(
         (SELECT json_agg(json_build_object('emoji', mr.emoji, 'user_id', mr.user_id, 'username', u.username))
          FROM message_reactions mr
          JOIN users u ON mr.user_id = u.id
          WHERE mr.message_id = m.id),
         '[]'::json
       ) AS reactions
       FROM messages m 
       LEFT JOIN messages parent ON m.reply_to_id = parent.id
       LEFT JOIN users parent_sender ON parent.sender_id = parent_sender.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
       OR (m.sender_id = $2 AND m.receiver_id = $1) 
       ORDER BY m.created_at ASC`,
      [myId, userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (
  senderId: string | number, 
  receiverId: string | number, 
  message: string, 
  type = 'text', 
  attachmentUrl: string | null = null, 
  replyToId: number | null = null
) => {
  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, type, attachment_url, reply_to_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'sent') RETURNING *`,
      [senderId, receiverId, message, type, attachmentUrl, replyToId]
    );

    const msg = result.rows[0];

    // Fetch parent reply info if present
    let reply_to_message = null;
    let reply_to_sender_username = null;
    if (replyToId) {
      const parentRes = await pool.query(
        `SELECT m.message, u.username FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = $1`,
        [replyToId]
      );
      if (parentRes.rows.length > 0) {
        reply_to_message = parentRes.rows[0].message;
        reply_to_sender_username = parentRes.rows[0].username;
      }
    }

    const fullMsg = {
      ...msg,
      reply_to_message,
      reply_to_sender_username,
      reactions: []
    };

    // Emit live message updates via Socket
    const io = getIO();
    if (io) {
      const roomA = `room_${senderId}_${receiverId}`;
      const roomB = `room_${receiverId}_${senderId}`;
      io.to(roomA).emit("receive_message", fullMsg);
      io.to(roomB).emit("receive_message", fullMsg);
      io.to(`user_${receiverId}`).emit("receive_message", fullMsg);
      io.to(`user_${senderId}`).emit("receive_message", fullMsg);
    }

    // Trigger Notification center update
    await createNotification(receiverId, senderId, 'message', undefined);

    return fullMsg;
  } catch (err) {
    console.error('Error saving message helper:', err);
    throw err;
  }
};

export const createMessageRoute = async (req: AuthRequest, res: Response) => {
  const senderId = req.user?.id;
  const { receiverId, message, type, attachmentUrl, replyToId } = req.body;

  if (!senderId) return res.status(401).json({ error: 'Unauthorized' });
  if (!receiverId) return res.status(400).json({ error: 'Receiver ID is required' });

  try {
    const savedMsg = await sendMessage(
      senderId, 
      receiverId, 
      message || '', 
      type || 'text', 
      attachmentUrl || null, 
      replyToId || null
    );
    res.json(savedMsg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
};

export const editMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { messageId } = req.params;
  const { text } = req.body;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      `UPDATE messages SET message = $1, is_edited = TRUE 
       WHERE id = $2 AND sender_id = $3 RETURNING *`,
      [text, messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Cannot edit this message' });
    }

    const updated = result.rows[0];

    const io = getIO();
    if (io) {
      const room1 = `room_${updated.sender_id}_${updated.receiver_id}`;
      const room2 = `room_${updated.receiver_id}_${updated.sender_id}`;
      const payload = { messageId, text: updated.message };
      io.to(room1).emit("message_edited", payload);
      io.to(room2).emit("message_edited", payload);
      io.to(`user_${updated.receiver_id}`).emit("message_edited", payload);
      io.to(`user_${updated.sender_id}`).emit("message_edited", payload);
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { messageId } = req.params;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      `DELETE FROM messages 
       WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2) RETURNING *`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Cannot delete this message' });
    }

    const deleted = result.rows[0];

    const io = getIO();
    if (io) {
      const room1 = `room_${deleted.sender_id}_${deleted.receiver_id}`;
      const room2 = `room_${deleted.receiver_id}_${deleted.sender_id}`;
      const payload = { messageId };
      io.to(room1).emit("message_deleted", payload);
      io.to(room2).emit("message_deleted", payload);
      io.to(`user_${deleted.receiver_id}`).emit("message_deleted", payload);
      io.to(`user_${deleted.sender_id}`).emit("message_deleted", payload);
    }

    res.json({ success: true, messageId, deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

export const toggleReaction = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user?.id;

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji is required' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [messageId, userId, emoji]
      );
    } else {
      await pool.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [messageId, userId, emoji]
      );
    }

    const result = await pool.query(
      `SELECT mr.emoji, mr.user_id, u.username
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1`,
      [messageId]
    );

    const messageDetails = await pool.query('SELECT sender_id, receiver_id FROM messages WHERE id = $1', [messageId]);
    if (messageDetails.rows.length > 0) {
      const msg = messageDetails.rows[0];
      const io = getIO();
      if (io) {
        const room1 = `room_${msg.sender_id}_${msg.receiver_id}`;
        const room2 = `room_${msg.receiver_id}_${msg.sender_id}`;
        const payload = { messageId, reactions: result.rows };
        io.to(room1).emit("receive_reaction", payload);
        io.to(room2).emit("receive_reaction", payload);
        io.to(`user_${msg.sender_id}`).emit("receive_reaction", payload);
        io.to(`user_${msg.receiver_id}`).emit("receive_reaction", payload);
      }
    }

    res.json({ messageId, reactions: result.rows });
  } catch (err) {
    console.error('Error toggling reaction:', err);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
};

export const markMessagesAsSeen = async (req: AuthRequest, res: Response) => {
  const myId = req.user?.id;
  const { userId } = req.params;

  if (!myId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await pool.query(
      `UPDATE messages SET status = 'seen' WHERE sender_id = $1 AND receiver_id = $2 AND status != 'seen'`,
      [userId, myId]
    );

    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit("messages_seen", { seenBy: myId, senderId: userId });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to mark messages as seen:', err);
    res.status(500).json({ error: 'Failed to mark messages as seen' });
  }
};
