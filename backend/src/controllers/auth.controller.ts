import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  RegisterSchema, LoginSchema, GoogleAuthSchema, GithubAuthSchema,
  EmailSchema, VerifyEmailSchema, PhoneSchema, VerifyPhoneSchema,
  registerUser, loginUser, googleAuth, githubAuth,
  verifyEmail, resendEmailOtp, requestPhoneOtp, verifyPhoneOtp,
} from '../services/auth.service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = RegisterSchema.parse(req.body);
    const result = await registerUser(data);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await loginUser(data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = VerifyEmailSchema.parse(req.body);
    const result = await verifyEmail(data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const resend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = EmailSchema.parse(req.body);
    const result = await resendEmailOtp(email);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const googleSignIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential } = GoogleAuthSchema.parse(req.body);
    const result = await googleAuth(credential);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const githubSignIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = GithubAuthSchema.parse(req.body);
    const result = await githubAuth(code);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Phone (auth required) ──────────────────────────────────────────────────────

export const phoneRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = PhoneSchema.parse(req.body);
    const result = await requestPhoneOtp(req.user!.id, phone);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const phoneVerify = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = VerifyPhoneSchema.parse(req.body);
    const result = await verifyPhoneOtp(req.user!.id, code);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
