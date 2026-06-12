import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { sendVerificationEmail } from '../lib/emailService';

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Make first registered user containing 'admin' in username an admin immediately, or check if username is 'admin'
    const defaultRole = cleanUsername.toLowerCase().includes('admin') ? 'admin' : 'user';
    
    // Generate a 6-digit email verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await pool.query(
      `INSERT INTO users (username, email, password, role, is_verified) 
       VALUES ($1, $2, $3, $4, TRUE) 
       RETURNING id, username, email, is_verified, role`,
      [cleanUsername, cleanEmail, hashedPassword, defaultRole]
    );

    res.status(201).json({ 
      user: result.rows[0],
      needsVerification: false
    });
  } catch (err: any) {
    console.error('Registration controller error:', err);
    
    const errMsg = String(err.message || '').toLowerCase();
    
    // Handle Postgres code 23505 (Unique Violation) OR Alasql / common unique constraint messages
    if (
      err.code === '23505' || 
      errMsg.includes('unique') || 
      errMsg.includes('duplicate') || 
      errMsg.includes('already exists')
    ) {
       return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    res.status(500).json({ error: `Registration failed: ${err.message || err}` });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, role: user.role }, secret, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const verifyCode = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    const canonicalEmail = email.trim().toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [canonicalEmail]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account is already verified. Please sign in.' });
    }

    if (!user.verification_code || user.verification_code !== code.toString().trim()) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (user.verification_expires) {
      const expirationDate = new Date(user.verification_expires);
      if (expirationDate.getTime() < Date.now()) {
        return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      }
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    res.json({ success: true, message: 'Your account has been verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

export const resendCode = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const canonicalEmail = email.trim().toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [canonicalEmail]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account is already verified. Please sign in.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      "UPDATE users SET verification_code = $1, verification_expires = NOW() + INTERVAL '15 minutes' WHERE id = $2",
      [verificationCode, user.id]
    );

    await sendVerificationEmail(user.email, user.username, verificationCode);

    res.json({ 
      success: true, 
      message: 'A new 6-digit verification code has been sent to your email.',
      devCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined
    });
  } catch (err) {
    console.error('Resend code error:', err);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const canonicalEmail = email.trim().toLowerCase();
    let result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [canonicalEmail]);
    let user = result.rows[0];

    if (!user) {
      // Auto-create of the account
      let usernamePart = canonicalEmail.split('@')[0];
      usernamePart = usernamePart.replace(/[^a-zA-Z0-9]/g, '');
      if (!usernamePart) usernamePart = 'user' + Math.floor(Math.random() * 10000);
      
      let finalUsername = usernamePart;
      let counter = 1;
      while (true) {
        const checkUser = await pool.query('SELECT id FROM users WHERE LOWER(username) = $1', [finalUsername.toLowerCase()]);
        if (checkUser.rows.length === 0) break;
        finalUsername = usernamePart + counter;
        counter++;
      }

      const defaultRole = canonicalEmail === 'iradukundadeogratias33@gmail.com' ? 'admin' : 'user';
      const secretRandomPassword = Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcrypt.hash(secretRandomPassword, 10);
      
      const insertResult = await pool.query(
        `INSERT INTO users (username, email, password, role, is_verified, avatar_url, bio) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, username, email, bio, avatar_url, is_verified, role`,
        [
          finalUsername,
          canonicalEmail,
          hashedPassword,
          defaultRole,
          true,
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}`,
          canonicalEmail === 'iradukundadeogratias33@gmail.com' 
            ? 'Platform Founder & System Administrator' 
            : 'DeoHub Explorer ✨'
        ]
      );
      user = insertResult.rows[0];
    } else {
      if (canonicalEmail === 'iradukundadeogratias33@gmail.com' && user.role !== 'admin') {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', user.id]);
        user.role = 'admin';
      }
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role }, 
      secret, 
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Google authorization error:', err);
    res.status(500).json({ error: 'Google login failed' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const result = await pool.query('SELECT id, username, email, avatar_url, bio, is_verified, role, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};
