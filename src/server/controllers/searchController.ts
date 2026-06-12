import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';

export const searchAll = async (req: AuthRequest, res: Response) => {
  let q = (req.query.q as string || '').trim();
  const type = req.query.type as string || 'all';
  const userId = req.user?.id;

  if (!q) {
    return res.json({ users: [], posts: [] });
  }

  try {
    let users: any[] = [];
    let posts: any[] = [];

    // Strip out leading '@' symbol to find exactly the intended usernames
    const cleanQ = q.startsWith('@') ? q.slice(1) : q;
    const searchPattern = `%${cleanQ}%`;
    const prefixPattern = `${cleanQ}%`;
    const userIdInt = userId ? parseInt(userId.toString(), 10) : null;

    // 1. Search Users if type is 'all' or 'users'
    if (type === 'all' || type === 'users') {
      const usersQuery = await pool.query(
        `SELECT id, username, email, bio, avatar_url, is_verified, role,
         (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
         COALESCE(
           CASE 
             WHEN $2::integer IS NULL THEN FALSE
             ELSE EXISTS (SELECT 1 FROM follows WHERE follower_id = $2::integer AND following_id = users.id)
           END, 
           FALSE
         ) as is_following
         FROM users 
         WHERE username ILIKE $1 OR bio ILIKE $1 OR email ILIKE $1
         ORDER BY 
           CASE 
             WHEN LOWER(username) = LOWER($3) THEN 1
             WHEN LOWER(username) LIKE LOWER($4) THEN 2
             ELSE 3 
           END,
           username ASC
         LIMIT 30`,
        [searchPattern, userIdInt, cleanQ, prefixPattern]
      );
      users = usersQuery.rows;
    }

    // 2. Search Posts if type is 'all' or 'posts'
    if (type === 'all' || type === 'posts') {
      const postsQuery = await pool.query(
        `SELECT p.*, u.username, u.email, u.avatar_url,
         (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
         COALESCE(
           CASE 
             WHEN $2::integer IS NULL THEN FALSE
             ELSE EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2::integer)
           END,
           FALSE
         ) as is_liked
         FROM posts p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.content ILIKE $1 OR u.username ILIKE $1
         ORDER BY p.created_at DESC
         LIMIT 30`,
        [searchPattern, userIdInt]
      );
      posts = postsQuery.rows;
    }

    res.json({ users, posts });
  } catch (err) {
    console.error("Error in searchAll controller:", err);
    res.status(500).json({ error: 'Failed to execute search' });
  }
};
