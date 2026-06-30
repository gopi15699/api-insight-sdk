import nodemailer from 'nodemailer';
import { env, emailEnabled } from '../config/env';

/** Shared SMTP transporter (null when SMTP isn't configured). */
const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email via SMTP. Returns true if dispatched. When SMTP is not
 * configured this logs the message (useful in local dev) and returns false.
 */
export const sendEmail = async ({ to, subject, text, html }: MailInput): Promise<boolean> => {
  if (!transporter) {
    console.log(`✉️  [email disabled] to=${to} subject="${subject}"\n${text}`);
    return false;
  }
  await transporter.sendMail({
    from: env.ALERT_EMAIL_FROM || env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return true;
};
