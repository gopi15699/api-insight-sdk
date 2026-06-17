import crypto from 'crypto';
import { Otp, OtpPurpose } from '../models/Otp';
import { env } from '../config/env';
import { sendEmail } from '../utils/mailer';
import { sendSms } from '../utils/sms';
import { createError } from '../middleware/errorHandler';

const MAX_ATTEMPTS = 5;

const hashCode = (code: string): string =>
  crypto.createHmac('sha256', env.JWT_SECRET).update(code).digest('hex');

/** Cryptographically-random 6-digit code. */
const generateCode = (): string =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

/** Timing-safe comparison of two hex digests of equal length. */
const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

interface RequestArgs {
  destination: string;
  purpose: OtpPurpose;
  channel: 'email' | 'sms';
}

/**
 * Generate, persist (hashed) and send a one-time code. Enforces a per-destination
 * resend cooldown. Replaces any existing code for the same destination+purpose.
 */
export const requestOtp = async ({ destination, purpose, channel }: RequestArgs): Promise<void> => {
  const dest = destination.toLowerCase().trim();

  // Resend cooldown — block rapid re-requests for the same destination.
  const existing = await Otp.findOne({ destination: dest, purpose });
  if (existing) {
    const ageSec = (Date.now() - existing.createdAt.getTime()) / 1000;
    if (ageSec < env.OTP_RESEND_COOLDOWN_SEC) {
      throw createError(
        `Please wait ${Math.ceil(env.OTP_RESEND_COOLDOWN_SEC - ageSec)}s before requesting another code`,
        429
      );
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await Otp.findOneAndUpdate(
    { destination: dest, purpose },
    { destination: dest, purpose, codeHash: hashCode(code), attempts: 0, expiresAt, createdAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const message = `Your API Insight verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`;

  if (channel === 'sms') {
    await sendSms(dest, message); // throws 501 until an SMS provider is configured
  } else {
    await sendEmail({
      to: dest,
      subject: 'Your API Insight verification code',
      text: message,
      html: `<p>Your API Insight verification code is <strong style="font-size:18px">${code}</strong>.</p><p>It expires in ${env.OTP_TTL_MINUTES} minutes.</p>`,
    });
  }
};

/**
 * Verify a submitted code. Single-use: a correct code is deleted on success.
 * Throws on missing/expired/incorrect codes and after too many attempts.
 */
export const verifyOtp = async (
  destination: string,
  purpose: OtpPurpose,
  code: string
): Promise<void> => {
  const dest = destination.toLowerCase().trim();
  const record = await Otp.findOne({ destination: dest, purpose });

  if (!record || record.expiresAt < new Date()) {
    throw createError('Code expired or not found — request a new one', 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    throw createError('Too many incorrect attempts — request a new code', 429);
  }

  if (!safeEqual(record.codeHash, hashCode(code))) {
    record.attempts += 1;
    await record.save();
    throw createError('Invalid verification code', 400);
  }

  await record.deleteOne(); // single-use
};
