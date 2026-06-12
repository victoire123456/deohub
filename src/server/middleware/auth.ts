import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string | number;
    email: string;
    username?: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn("Auth failed: No bearer token provided");
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const verified = jwt.verify(token, secret) as { id: string | number; email: string; username?: string };
    req.user = verified;
    next();
  } catch (err: any) {
    console.error("Auth failed: Invalid or expired token verifying issue:", err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const verified = jwt.verify(token, secret) as { id: string | number; email: string; username?: string };
    req.user = verified;
  } catch (err: any) {
    console.warn("Optional Auth: Token verification failed:", err.message);
    // If token is invalid, we just don't set req.user
  }
  next();
};
