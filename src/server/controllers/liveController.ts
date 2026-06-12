import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from './notificationController';
import { getIO } from '../socketStore';

// Get active live streams
export const getActiveLiveStreams = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT ls.*, u.username, u.avatar_url, u.is_verified
      FROM live_streams ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.status = 'active'
      ORDER BY ls.created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to get active live streams:', err);
    res.status(500).json({ error: 'Failed to retrieve active live streams' });
  }
};

// Get ended/historical live streams
export const getLiveHistory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT ls.*, u.username, u.avatar_url, u.is_verified
      FROM live_streams ls
      JOIN users u ON ls.user_id = u.id
      ORDER BY ls.created_at DESC
      LIMIT 30
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to get live stream history:', err);
    res.status(500).json({ error: 'Failed to retrieve live stream history' });
  }
};

// Get single live stream details
export const getLiveStream = async (req: AuthRequest, res: Response) => {
  const { streamId } = req.params;
  try {
    const result = await pool.query(`
      SELECT ls.*, u.username, u.avatar_url, u.is_verified
      FROM live_streams ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.id = $1
    `, [streamId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Live stream not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Failed to get live stream:', err);
    res.status(500).json({ error: 'Failed to retrieve live stream details' });
  }
};

// Start a live stream session
export const startLiveStream = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { title } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Please enter a title for your live stream' });
  }

  try {
    // Generate a simple simulation stream key
    const streamKey = `live_${userId}_${Math.random().toString(36).substring(2, 10)}`;

    // Insert live stream record
    const result = await pool.query(`
      INSERT INTO live_streams (user_id, title, status, viewer_count, stream_key)
      VALUES ($1, $2, 'active', 0, $3)
      RETURNING *
    `, [userId, title.trim(), streamKey]);

    const liveStream = result.rows[0];

    // Fetch streamer user details
    const userRes = await pool.query('SELECT username, avatar_url, is_verified FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    const fullStreamData = {
      ...liveStream,
      username: user?.username,
      avatar_url: user?.avatar_url,
      is_verified: user?.is_verified
    };

    // Notify followers
    try {
      const followersRes = await pool.query(`
        SELECT follower_id FROM follows WHERE following_id = $1
      `, [userId]);

      const followers = followersRes.rows;
      for (const f of followers) {
        await createNotification(f.follower_id, userId, 'live', liveStream.id);
      }
    } catch (notifErr) {
      console.error('Failed to dispatch live stream notifications to followers:', notifErr);
    }

    // Broadcast stream started through socket so active streamers list updates dynamically
    const io = getIO();
    if (io) {
      io.emit('live_stream_started', fullStreamData);
    }

    res.status(201).json(fullStreamData);
  } catch (err: any) {
    console.error('Failed to start live stream:', err);
    res.status(500).json({ error: 'Failed to start live stream session' });
  }
};

// Stop/End active live stream session
export const endLiveStream = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { streamId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify stream ownership
    const checkRes = await pool.query(`
      SELECT user_id FROM live_streams WHERE id = $1
    `, [streamId]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Live stream not found' });
    }

    if (checkRes.rows[0].user_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You do not own this live stream' });
    }

    // End stream
    const result = await pool.query(`
      UPDATE live_streams
      SET status = 'ended', ended_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [streamId]);

    // Clear notifications for this live stream so followers stop seeing it
    try {
      await pool.query(`
        DELETE FROM notifications
        WHERE type = 'live' AND (post_id = $1 OR sender_id = $2)
      `, [streamId, userId]);
    } catch (notifErr) {
      console.error('Failed to clear live notifications:', notifErr);
    }

    const io = getIO();
    if (io) {
      io.to(`live_stream_${streamId}`).emit('live_stream_ended', { streamId });
      io.emit('live_stream_stopped_global', { streamId });
    }

    res.json({ success: true, stream: result.rows[0] });
  } catch (err: any) {
    console.error('Failed to end live stream:', err);
    res.status(500).json({ error: 'Failed to end live stream session' });
  }
};

// Get comments for live stream
export const getLiveComments = async (req: AuthRequest, res: Response) => {
  const { streamId } = req.params;

  try {
    const result = await pool.query(`
      SELECT lc.*, u.username, u.avatar_url
      FROM live_comments lc
      JOIN users u ON lc.user_id = u.id
      WHERE lc.live_stream_id = $1
      ORDER BY lc.created_at ASC
    `, [streamId]);

    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to fetch comments for stream:', err);
    res.status(500).json({ error: 'Failed to fetch messages comments' });
  }
};

// Create comment for live stream
export const createLiveComment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { streamId } = req.params;
  const { content } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment body cannot be empty' });
  }

  try {
    const insertRes = await pool.query(`
      INSERT INTO live_comments (live_stream_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [streamId, userId, content.trim()]);

    const userRes = await pool.query('SELECT username, avatar_url FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    const fullComment = {
      ...insertRes.rows[0],
      username: user?.username || 'Guest',
      avatar_url: user?.avatar_url || ''
    };

    // Broadcast comment
    const io = getIO();
    if (io) {
      io.to(`live_stream_${streamId}`).emit('live_comment_received', fullComment);
    }

    res.status(201).json(fullComment);
  } catch (err: any) {
    console.error('Failed to save comment:', err);
    res.status(500).json({ error: 'Failed to save stream comment' });
  }
};

// Post reaction for live stream
export const createLiveReaction = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { streamId } = req.params;
  const { reactionType } = req.body; // e.g. 'like', 'heart', 'laugh', 'fire'

  if (!reactionType) {
    return res.status(400).json({ error: 'Reaction type is required' });
  }

  try {
    if (userId) {
      await pool.query(`
        INSERT INTO live_reactions (live_stream_id, user_id, reaction_type)
        VALUES ($1, $2, $3)
      `, [streamId, userId, reactionType]);
    }

    // Broadcast reaction
    const io = getIO();
    if (io) {
      io.to(`live_stream_${streamId}`).emit('live_reaction_received', {
        streamId: parseInt(streamId),
        userId: userId || null,
        reactionType
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to post live stream reaction:', err);
    res.status(500).json({ error: 'Failed to register reaction' });
  }
};
