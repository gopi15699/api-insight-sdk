import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { env, githubEnabled } from '../config/env';
import { requestOtp, verifyOtp } from './otp.service';

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

export const GithubAuthSchema = z.object({
  code: z.string().min(1),
});

export const EmailSchema = z.object({
  email: z.string().email(),
});

export const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code:  z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// ── Local auth ─────────────────────────────────────────────────────────────────

export const registerUser = async (data: z.infer<typeof RegisterSchema>) => {
  const email = data.email.toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    // Allow an unverified account to restart verification instead of hard-failing.
    if (!existing.emailVerified && existing.authProvider === 'local') {
      await requestOtp({ destination: email, purpose: 'email_verify', channel: 'email' });
      return { requiresVerification: true as const, email };
    }
    throw createError('Email already registered', 409);
  }

  await User.create({ ...data, email, authProvider: 'local', emailVerified: false });
  await requestOtp({ destination: email, purpose: 'email_verify', channel: 'email' });

  // No session token yet — the account must verify the emailed code first.
  return { requiresVerification: true as const, email };
};

/** Verify the emailed OTP, mark the account verified, and start a session. */
export const verifyEmail = async (data: z.infer<typeof VerifyEmailSchema>) => {
  const email = data.email.toLowerCase();
  const user = await User.findOne({ email });
  if (!user) throw createError('Account not found', 404);

  // Already-verified accounts must sign in normally — never issue a session
  // here without a valid OTP (would otherwise be a passwordless bypass).
  if (user.emailVerified) {
    throw createError('Email already verified — please sign in', 409);
  }

  await verifyOtp(email, 'email_verify', data.code);
  user.emailVerified = true;
  await user.save();

  const token = signToken(user.id);
  return { user, token };
};

/** Re-send an email verification code (cooldown enforced in otp.service). */
export const resendEmailOtp = async (rawEmail: string) => {
  const email = rawEmail.toLowerCase();
  const user = await User.findOne({ email });
  // Don't reveal whether the account exists / is already verified.
  if (user && !user.emailVerified) {
    await requestOtp({ destination: email, purpose: 'email_verify', channel: 'email' });
  }
  return { ok: true as const };
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

  // Mandatory email verification — issue a fresh code and block the session.
  if (!user.emailVerified) {
    await requestOtp({ destination: user.email, purpose: 'email_verify', channel: 'email' }).catch(() => {});
    return { requiresVerification: true as const, email: user.email };
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
    }
    // Google emails are pre-verified by Google.
    if (!user.emailVerified) user.emailVerified = true;
    await user.save();
  } else {
    user = await User.create({
      name:         name || email.split('@')[0],
      email,
      googleId,
      avatar:       picture,
      authProvider: 'google',
      emailVerified: true,
    });
  }

  const token = signToken(user.id);
  return { user, token };
};

// ── GitHub OAuth ─────────────────────────────────────────────────────────────
// Server-side code exchange (unlike Google's client-side ID token):
//   1. exchange the code for an access token
//   2. fetch the GitHub profile + the primary, verified email

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export const githubAuth = async (code: string) => {
  if (!githubEnabled) {
    throw createError('GitHub Sign-In is not configured on this server', 501);
  }

  // 1. Exchange the temporary code for an access token.
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw createError('Failed to authenticate with GitHub', 401);

  const ghHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'api-insight',
  };

  // 2. Fetch profile + emails.
  const [profileRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers: ghHeaders }),
    fetch('https://api.github.com/user/emails', { headers: ghHeaders }),
  ]);

  const profile = (await profileRes.json()) as {
    id?: number; name?: string; login?: string; avatar_url?: string;
  };
  const emails = (await emailsRes.json()) as GithubEmail[];

  const primary = Array.isArray(emails)
    ? emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified)
    : undefined;

  if (!profile.id || !primary?.email) {
    throw createError('Could not read a verified email from GitHub', 401);
  }

  const githubId = String(profile.id);
  const email = primary.email.toLowerCase();

  let user = await User.findOne({ $or: [{ githubId }, { email }] });

  if (user) {
    if (!user.githubId) {
      user.githubId = githubId;
      user.authProvider = 'github';
      if (profile.avatar_url && !user.avatar) user.avatar = profile.avatar_url;
    }
    if (!user.emailVerified) user.emailVerified = true; // GitHub email is verified
    await user.save();
  } else {
    user = await User.create({
      name: profile.name || profile.login || email.split('@')[0],
      email,
      githubId,
      avatar: profile.avatar_url,
      authProvider: 'github',
      emailVerified: true,
    });
  }

  const token = signToken(user.id);
  return { user, token };
};

// ── Phone (mobile OTP) ───────────────────────────────────────────────────────
// Delivery is gated by the SMS provider (see utils/sms.ts) — these endpoints
// work end-to-end but return 501 until an SMS provider is configured.

export const PhoneSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number in E.164 format'),
});

export const VerifyPhoneSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

/** Start phone verification for a logged-in user. */
export const requestPhoneOtp = async (userId: string, phone: string) => {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);

  const taken = await User.findOne({ phone, phoneVerified: true, _id: { $ne: user.id } });
  if (taken) throw createError('That phone number is already in use', 409);

  user.phone = phone;
  user.phoneVerified = false;
  await user.save();

  await requestOtp({ destination: phone, purpose: 'phone_verify', channel: 'sms' });
  return { ok: true as const };
};

/** Confirm the phone OTP for a logged-in user. */
export const verifyPhoneOtp = async (userId: string, code: string) => {
  const user = await User.findById(userId);
  if (!user || !user.phone) throw createError('No phone number on file', 400);

  await verifyOtp(user.phone, 'phone_verify', code);
  user.phoneVerified = true;
  await user.save();
  return { phone: user.phone, phoneVerified: true };
};
