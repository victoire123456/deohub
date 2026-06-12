import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from './notificationController';
import { getIO } from '../socketStore';

export const createPost = async (req: AuthRequest, res: Response) => {
  const { content, imageUrl, videoUrl } = req.body;
  const userId = req.user?.id;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO posts (user_id, content, image_url, video_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, content, imageUrl, videoUrl]
    );
    
    // Fetch with user info
    const fullPost = await pool.query(
      `SELECT p.*, u.username, u.email, u.avatar_url, u.is_verified 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
      [result.rows[0].id]
    );

    const postData = fullPost.rows[0];
    postData.like_count = "0";
    postData.comment_count = "0";
    postData.is_liked = false;

    const io = getIO();
    if (io) {
      io.emit('post_created', postData);
    }

    res.status(201).json(postData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const getPosts = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const result = await pool.query(
      `SELECT p.*, u.username, u.email, u.avatar_url, u.is_verified,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
       EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC`,
      [userId || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const existingLike = await pool.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    let liked = false;
    if (existingLike.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      liked = false;
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      liked = true;
      
      // Get post owner for notification
      const postOwnerResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
      if (postOwnerResult.rows.length > 0) {
        const receiverId = postOwnerResult.rows[0].user_id;
        await createNotification(receiverId, userId, 'like', parseInt(postId));
      }
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId]);
    const likeCount = parseInt(countResult.rows[0].count, 10);

    const io = getIO();
    if (io) {
      io.emit('post_like_updated', { postId: parseInt(postId, 10), likeCount, liked, userId });
    }

    res.json({ liked, like_count: likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export const getComments = async (req: Request, res: Response) => {
  const { postId } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.*, u.username, u.avatar_url, u.is_verified 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

export const createComment = async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const numericPostId = parseInt(postId, 10);
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);

    if (isNaN(numericPostId)) {
      return res.status(400).json({ error: 'Invalid post ID parameter' });
    }
    if (isNaN(numericUserId)) {
      return res.status(401).json({ error: 'Invalid user authentication' });
    }

    const result = await pool.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *',
      [numericUserId, numericPostId, content]
    );

    // Fetch comment with user info
    const commentWithUser = await pool.query(
      `SELECT c.*, u.username, u.avatar_url, u.is_verified 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    // Create notification for post owner
    const postOwnerResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [numericPostId]);
    if (postOwnerResult.rows.length > 0) {
      const receiverId = postOwnerResult.rows[0].user_id;
      if (receiverId !== numericUserId) {
        await createNotification(receiverId, numericUserId || 0, 'comment', numericPostId);
      }
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM comments WHERE post_id = $1', [numericPostId]);
    const commentCount = parseInt(countResult.rows[0].count, 10);

    const io = getIO();
    if (io) {
      io.emit('post_comment_created', { 
        postId: numericPostId, 
        comment: commentWithUser.rows[0], 
        commentCount 
      });
    }

    res.status(201).json(commentWithUser.rows[0]);
  } catch (err: any) {
    console.error('Failed to create comment error stack:', err);
    res.status(500).json({ error: `Failed to create comment: ${err.message}` });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (postResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this post' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

    const io = getIO();
    if (io) {
      io.emit('post_deleted', { postId: parseInt(postId, 10) });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
