import { Request, Response, NextFunction } from 'express';
import {
  RegisterSchema, LoginSchema, GoogleAuthSchema,
  registerUser, loginUser, googleAuth,
} from '../services/auth.service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = RegisterSchema.parse(req.body);
    const { user, token } = await registerUser(data);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);
    const { user, token } = await loginUser(data);
    res.json({ success: true, data: { user, token } });
  } catch (err) { next(err); }
};

export const googleSignIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential } = GoogleAuthSchema.parse(req.body);
    const { user, token } = await googleAuth(credential);
    res.json({ success: true, data: { user, token } });
  } catch (err) { next(err); }
};
