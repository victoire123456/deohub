import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socketStore';

// Helper to seed dynamic default reels if database is empty
const ensureSeededReels = async () => {
  try {
    const check = await pool.query('SELECT COUNT(*) FROM reels');
    if (parseInt(check.rows[0].count) === 0) {
      // Find or create at least one user to link them to
      let userId: number;
      const userRes = await pool.query('SELECT id FROM users LIMIT 1');
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      } else {
        // Seed a default system user if somehow no users exist
        const newUser = await pool.query(
          "INSERT INTO users (username, email, password, bio, avatar_url) VALUES ('neoreels', 'reels@playback.net', 'hashedpwd', 'The official DeoHub reels account helper 🎬💜', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neoreels') RETURNING id"
        );
        userId = newUser.rows[0].id;
      }

      const sampleReels = [
        {
          video_url: 'https://assets.mixkit.co/videos/preview/mixkit-dancing-woman-in-the-city-at-night-12344-large.mp4',
          caption: 'Neon dreams in the city lights! 🌆🕺 #nightlife #vibes #deohub'
        },
        {
          video_url: 'https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-a-building-at-night-42284-large.mp4',
          caption: 'Lost in the cyberpunk neon loops. Absolutely breathtaking tonight! 🧬💫 #tokyo #neon'
        },
        {
          video_url: 'https://assets.mixkit.co/videos/preview/mixkit-night-city-with-neon-lights-and-traffic-42289-large.mp4',
          caption: 'Night city rush. Chase your electric dreams. 🚗💨 #latenight #cyberpunk'
        },
        {
          video_url: 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-at-night-with-neon-lights-42288-large.mp4',
          caption: 'Sending vibes out to the cosmic cloud! Let me know what you think 💜🤙'
        }
      ];

      for (const reel of sampleReels) {
        await pool.query(
          'INSERT INTO reels (user_id, video_url, caption) VALUES ($1, $2, $3)',
          [userId, reel.video_url, reel.caption]
        );
      }
      console.log('Seeded initial reels into database');
    }
  } catch (err) {
    console.warn('Seeding reels failed:', err);
  }
};

export const createReel = async (req: AuthRequest, res: Response) => {
  const { videoUrl, caption } = req.body;
  const userId = req.user?.id;

  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO reels (user_id, video_url, caption) VALUES ($1, $2, $3) RETURNING *',
      [userId, videoUrl, caption]
    );

    const fullReel = await pool.query(
      `SELECT r.*, u.username, u.avatar_url,
       0::bigint as like_count,
       0::bigint as comment_count,
       false as is_liked
       FROM reels r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.id = $1`,
      [result.rows[0].id]
    );

    const io = getIO();
    if (io) {
      io.emit('reel_created', fullReel.rows[0]);
    }

    res.status(201).json(fullReel.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reel' });
  }
};

export const getReels = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    await ensureSeededReels();

    const result = await pool.query(
      `SELECT r.*, u.username, u.avatar_url,
       (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as like_count,
       (SELECT COUNT(*) FROM reel_comments WHERE reel_id = r.id) as comment_count,
       EXISTS (SELECT 1 FROM reel_likes WHERE reel_id = r.id AND user_id = $1) as is_liked
       FROM reels r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`,
      [userId || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
};

export const toggleReelLike = async (req: AuthRequest, res: Response) => {
  const { reelId } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const existing = await pool.query(
      'SELECT id FROM reel_likes WHERE user_id = $1 AND reel_id = $2',
      [userId, reelId]
    );

    let liked = false;
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM reel_likes WHERE user_id = $1 AND reel_id = $2', [userId, reelId]);
      liked = false;
    } else {
      await pool.query('INSERT INTO reel_likes (user_id, reel_id) VALUES ($1, $2)', [userId, reelId]);
      liked = true;
    }

    const likeCountRes = await pool.query('SELECT COUNT(*) FROM reel_likes WHERE reel_id = $1', [reelId]);
    const checkCount = parseInt(likeCountRes.rows[0].count);

    const io = getIO();
    if (io) {
      io.emit('reel_like_updated', { reelId: parseInt(reelId), likeCount: checkCount, liked, userId });
    }

    res.json({ liked, like_count: checkCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle reel like' });
  }
};

export const getReelComments = async (req: AuthRequest, res: Response) => {
  const { reelId } = req.params;
  const userId = req.user?.id;
  try {
    const result = await pool.query(
      `SELECT rc.*, u.username, u.avatar_url,
              COALESCE(rc.like_count, 0) as like_count,
              EXISTS(SELECT 1 FROM reel_comment_likes rcl WHERE rcl.comment_id = rc.id AND rcl.user_id = $2) as is_liked
       FROM reel_comments rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.reel_id = $1
       ORDER BY rc.created_at ASC`,
      [reelId, userId || 0]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reel comments' });
  }
};

export const createReelComment = async (req: AuthRequest, res: Response) => {
  const { reelId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO reel_comments (user_id, reel_id, content, like_count) VALUES ($1, $2, $3, 0) RETURNING *',
      [userId, reelId, content]
    );

    const fullComment = await pool.query(
      `SELECT rc.*, u.username, u.avatar_url,
              0 as like_count,
              false as is_liked
       FROM reel_comments rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.id = $1`,
      [result.rows[0].id]
    );

    const commentCountRes = await pool.query('SELECT COUNT(*) FROM reel_comments WHERE reel_id = $1', [reelId]);
    const commentCount = parseInt(commentCountRes.rows[0].count);

    const io = getIO();
    if (io) {
      io.emit('reel_comment_created', { reelId: parseInt(reelId), comment: fullComment.rows[0], commentCount });
    }

    res.status(201).json(fullComment.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reel comment' });
  }
};

export const toggleReelCommentLike = async (req: AuthRequest, res: Response) => {
  const { commentId } = req.params;
  const userId = req.user?.id;

  try {
    const check = await pool.query(
      'SELECT id FROM reel_comment_likes WHERE user_id = $1 AND comment_id = $2',
      [userId, commentId]
    );

    let liked = false;
    if (check.rows.length > 0) {
      await pool.query('DELETE FROM reel_comment_likes WHERE id = $1', [check.rows[0].id]);
      await pool.query('UPDATE reel_comments SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) WHERE id = $1', [commentId]);
    } else {
      await pool.query(
        'INSERT INTO reel_comment_likes (user_id, comment_id) VALUES ($1, $2)',
        [userId, commentId]
      );
      await pool.query('UPDATE reel_comments SET like_count = COALESCE(like_count, 0) + 1 WHERE id = $1', [commentId]);
      liked = true;
    }

    const countRes = await pool.query('SELECT COALESCE(like_count, 0) as like_count FROM reel_comments WHERE id = $1', [commentId]);
    const likeCount = countRes.rows[0]?.like_count || 0;

    res.json({ liked, like_count: likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle comment like' });
  }
};
