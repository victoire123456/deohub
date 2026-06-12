import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socketStore';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      `SELECT n.*, u.username as sender_username, u.email as sender_email, u.avatar_url as sender_avatar
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       WHERE n.receiver_id = $1
       ORDER BY n.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND receiver_id = $2',
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const createNotification = async (receiverId: number | string, senderId: number | string, type: string, postId?: number | string) => {
  if (receiverId.toString() === senderId.toString()) return null; // Don't notify self

  try {
    const result = await pool.query(
      'INSERT INTO notifications (receiver_id, sender_id, type, post_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [receiverId, senderId, type, postId]
    );

    const notification = result.rows[0];
    
    // Fetch sender info for real-time update
    const senderResult = await pool.query('SELECT username, email, avatar_url FROM users WHERE id = $1', [senderId]);
    if (senderResult.rows.length > 0) {
        notification.sender_username = senderResult.rows[0].username;
        notification.sender_email = senderResult.rows[0].email;
        notification.sender_avatar = senderResult.rows[0].avatar_url;
    }

    const io = getIO();
    if (io) {
      io.to(`user_${receiverId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};
