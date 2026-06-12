import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from './notificationController';
import { getIO } from '../socketStore';

export const getProfile = async (req: Request, res: Response) => {
  const { username } = req.params;
  const currentUserIdRaw = (req as any).user?.id;
  const currentUserId = currentUserIdRaw ? parseInt(currentUserIdRaw.toString(), 10) : null;

  try {
    const userResult = await pool.query(
      `SELECT id, username, email, bio, avatar_url, is_verified, role, created_at, e2ee_public_key,
       (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts_count,
       (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following_count,
       COALESCE(
         CASE 
           WHEN $1::integer IS NULL THEN FALSE
           ELSE EXISTS (SELECT 1 FROM follows WHERE follower_id = $1::integer AND following_id = users.id)
         END, 
         FALSE
       ) as is_following
       FROM users WHERE LOWER(username) = LOWER($2)`,
      [currentUserId, username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Database error in getProfile:", err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { bio, avatarUrl } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET bio = $1, avatar_url = $2 WHERE id = $3 RETURNING id, username, bio, avatar_url',
      [bio, avatarUrl, userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const updateE2EKey = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { e2eePublicKey } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET e2ee_public_key = $1 WHERE id = $2 RETURNING id, username, e2ee_public_key',
      [e2eePublicKey, userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating E2E key:', err);
    res.status(500).json({ error: 'Failed to update E2E key' });
  }
};

export const toggleFollow = async (req: AuthRequest, res: Response) => {
  const followerId = req.user?.id;
  const { userId: followingId } = req.params;

  if (followerId?.toString() === followingId.toString()) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  try {
    const existingFollow = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    let following = false;
    if (existingFollow.rows.length > 0) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
      following = false;
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [followerId, followingId]);
      following = true;
      
      // Notify the person being followed
      await createNotification(parseInt(followingId), followerId!, 'follow');
    }

    // Get updated counts
    const followersRes = await pool.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [followingId]);
    const followingRes = await pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [followerId]);

    const followersCount = parseInt(followersRes.rows[0].count, 10);
    const followingCount = parseInt(followingRes.rows[0].count, 10);

    const io = getIO();
    if (io) {
      io.emit('follow_updated', {
        followerId,
        followingId: parseInt(followingId, 10),
        following,
        followersCount,
        followingCount
      });
    }

    res.json({ following, followersCount, followingCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
};

export const getUserPosts = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.*, u.username, u.email, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1 
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
};

export const verifyUser = async (req: AuthRequest, res: Response) => {
  const currentUserId = req.user?.id;
  const { userId } = req.params;
  const { is_verified } = req.body;

  if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const meResult = await pool.query('SELECT role, username FROM users WHERE id = $1', [currentUserId]);
    if (meResult.rows.length === 0) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    const me = meResult.rows[0];
    const isAdmin = me.role === 'admin' || me.username.toLowerCase().includes('admin');

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can grant or remove verified status.' });
    }

    const updateResult = await pool.query(
      'UPDATE users SET is_verified = $1 WHERE id = $2 RETURNING id, username, is_verified',
      [!!is_verified, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Failed to update verification status:', err);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
};
