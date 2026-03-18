import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { env } from '../config/env';

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

export const RegisterSchema = z.object({
  name:     z.string().min(2).max(50),
  email:    z.string().email(),
  password: z.string().min(6).max(100),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const GoogleAuthSchema = z.object({
  credential: z.string().min(1),
});

// ── Local auth ─────────────────────────────────────────────────────────────────

export const registerUser = async (data: z.infer<typeof RegisterSchema>) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw createError('Email already registered', 409);

  const user = await User.create({ ...data, authProvider: 'local' });
  const token = signToken(user.id);
  return { user, token };
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS   = 15 * 60 * 1000; // 15 minutes

export const loginUser = async (data: z.infer<typeof LoginSchema>) => {
  const user = await User.findOne({ email: data.email });

  // Use same message for non-existent user — prevents email enumeration
  if (!user) throw createError('Invalid email or password', 401);

  // Prevent password login on Google-only accounts
  if (user.authProvider === 'google' && !user.password) {
    throw createError('This account uses Google Sign-In. Please continue with Google.', 401);
  }

  // Account lockout check
  if (user.isLocked()) {
    const minutesLeft = Math.ceil(((user.lockUntil as Date).getTime() - Date.now()) / 60000);
    throw createError(`Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`, 423);
  }

  const valid = await user.comparePassword(data.password);

  if (!valid) {
    // Increment failed attempts
    user.loginAttempts += 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil      = new Date(Date.now() + LOCK_DURATION_MS);
      user.loginAttempts  = 0; // reset so next window starts fresh
    }
    await user.save();
    throw createError('Invalid email or password', 401);
  }

  // Successful login — clear lockout state
  if (user.loginAttempts > 0 || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil     = undefined;
    await user.save();
  }

  const token = signToken(user.id);
  return { user, token };
};

// ── Google OAuth ───────────────────────────────────────────────────────────────

export const googleAuth = async (credential: string) => {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw createError('Google Sign-In is not configured on this server', 501);
  }

  // Verify the ID token with Google
  const ticket = await googleClient.verifyIdToken({
    idToken:  credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw createError('Invalid Google token', 401);

  const { email, name, picture, sub: googleId } = payload;

  // Find existing user or create new one
  let user = await User.findOne({ email });

  if (user) {
    // If they registered with email/password, link their Google account
    if (!user.googleId) {
      user.googleId     = googleId;
      user.authProvider = 'google';
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }
  } else {
    user = await User.create({
      name:         name || email.split('@')[0],
      email,
      googleId,
      avatar:       picture,
      authProvider: 'google',
    });
  }

  const token = signToken(user.id);
  return { user, token };
};
