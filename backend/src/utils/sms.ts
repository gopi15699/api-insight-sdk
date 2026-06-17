import { env, smsEnabled } from '../config/env';
import { createError } from '../middleware/errorHandler';

/**
 * Send an SMS. Mobile OTP is built end-to-end, but delivery is gated behind a
 * configured provider — until `SMS_PROVIDER` + `SMS_API_KEY` are set this throws
 * a clear 501 so callers can surface "SMS not configured".
 *
 * To go live, implement the provider branch below (e.g. Twilio / MSG91) using
 * the SMS_* env vars and global `fetch`.
 */
export const sendSms = async (to: string, message: string): Promise<void> => {
  if (!smsEnabled) {
    console.log(`📱 [sms disabled] to=${to} msg="${message}"`);
    throw createError('SMS delivery is not configured on this server', 501);
  }

  switch (env.SMS_PROVIDER) {
    // case 'twilio': { ...fetch Twilio Messages API with SMS_API_KEY/SMS_API_SECRET... break; }
    // case 'msg91':  { ...fetch MSG91 flow API with SMS_API_KEY... break; }
    default:
      throw createError(`Unsupported SMS provider '${env.SMS_PROVIDER}'`, 501);
  }
};
