import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Pin algorithm to HS256 — prevents alg:none and RS256 confusion attacks
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as { id: string };

    if (typeof decoded.id !== 'string') {
      res.status(401).json({ success: false, message: 'Malformed token' });
      return;
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      // Same message as invalid token — don't reveal whether user exists
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
