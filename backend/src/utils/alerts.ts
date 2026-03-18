import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter =
  env.SMTP_HOST && env.SMTP_USER
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

export interface AlertPayload {
  projectName: string;
  endpoint: string;
  errorMessage?: string;
  errorCount: number;
  threshold: number;
  alertEmail?: string;
}

export const sendAlert = async (payload: AlertPayload): Promise<void> => {
  const subject = `[API Insight] Alert: ${payload.errorCount} errors on ${payload.endpoint}`;
  const body = `
Project: ${payload.projectName}
Endpoint: ${payload.endpoint}
Error: ${payload.errorMessage || 'N/A'}
Occurrences: ${payload.errorCount} (threshold: ${payload.threshold})

Please investigate your API immediately.

— API Insight
  `.trim();

  const to = payload.alertEmail || env.ALERT_EMAIL_TO;

  // Email
  if (transporter && to) {
    try {
      await transporter.sendMail({ from: env.ALERT_EMAIL_FROM, to, subject, text: body });
      console.log(`📧 Alert email sent to ${to}`);
    } catch (err) {
      console.error('Failed to send alert email:', err);
    }
  }

  // Always log to console
  console.warn(`🚨 ALERT | ${subject}`);
};
