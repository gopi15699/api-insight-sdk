import { createEnv } from 'envaegis';

export const env = createEnv(
  {
    PORT:                    { type: 'port',    default: 5000,                description: 'HTTP server port' },
    NODE_ENV:                { type: 'string',  default: 'development',       enum: ['development', 'staging', 'production'] as const },
    MONGO_URI:               { type: 'string',                                description: 'MongoDB connection string (mongodb:// or mongodb+srv://)' },
    JWT_SECRET:              { type: 'string',  minLength: 12,                description: 'JWT signing secret' },
    JWT_EXPIRES_IN:          { type: 'string',  default: '7d' },

    ALERT_EMAIL_FROM:        { type: 'email',   required: false },
    ALERT_EMAIL_TO:          { type: 'email',   required: false },
    SMTP_HOST:               { type: 'string',  required: false },
    SMTP_PORT:               { type: 'port',    default: 587 },
    SMTP_USER:               { type: 'string',  required: false },
    SMTP_PASS:               { type: 'string',  required: false },

    ALERT_ERROR_THRESHOLD:   { type: 'number',  default: 10,  min: 1 },
    ALLOWED_ORIGINS:         { type: 'string',  default: 'http://localhost:3000', description: 'Comma-separated allowed CORS origins' },
    GOOGLE_CLIENT_ID:        { type: 'string',  required: false, description: 'Google OAuth2 client ID' },

    // ── GitHub OAuth ───────────────────────────────────────────────────────────
    GITHUB_CLIENT_ID:        { type: 'string',  required: false, description: 'GitHub OAuth App client ID' },
    GITHUB_CLIENT_SECRET:    { type: 'string',  required: false, description: 'GitHub OAuth App client secret' },

    // ── OTP / verification ─────────────────────────────────────────────────────
    OTP_TTL_MINUTES:         { type: 'number',  default: 10, min: 1, description: 'OTP validity window (minutes)' },
    OTP_RESEND_COOLDOWN_SEC: { type: 'number',  default: 60, min: 0, description: 'Min seconds between OTP sends to one destination' },

    // ── SMS provider (optional — mobile OTP is inactive until configured) ───────
    SMS_PROVIDER:            { type: 'string',  required: false, description: 'SMS provider id (e.g. twilio, msg91). Blank = SMS disabled.' },
    SMS_FROM:                { type: 'string',  required: false, description: 'SMS sender id / from number' },
    SMS_API_KEY:             { type: 'string',  required: false, description: 'SMS provider API key / auth token' },
    SMS_API_SECRET:          { type: 'string',  required: false, description: 'SMS provider API secret (if required)' },

    // ── Razorpay billing ─────────────────────────────────────────────────────
    // Optional so the app boots without billing configured; subscribe/webhook
    // routes guard at runtime and return a clear error when keys are missing.
    FRONTEND_URL:            { type: 'string',  default: 'http://localhost:3000', description: 'Public URL of the dashboard (Razorpay callback/return)' },
    RAZORPAY_KEY_ID:         { type: 'string',  required: false, description: 'Razorpay API key id (rzp_test_… / rzp_live_…)' },
    RAZORPAY_KEY_SECRET:     { type: 'string',  required: false, description: 'Razorpay API key secret' },
    RAZORPAY_WEBHOOK_SECRET: { type: 'string',  required: false, description: 'Razorpay webhook signing secret' },
    RAZORPAY_PLAN_PRO_MONTHLY:   { type: 'string', default: '', description: 'Razorpay plan id for Pro monthly' },
    RAZORPAY_PLAN_PRO_YEARLY:    { type: 'string', default: '', description: 'Razorpay plan id for Pro yearly' },
    RAZORPAY_PLAN_ULTRA_MONTHLY: { type: 'string', default: '', description: 'Razorpay plan id for Ultra monthly' },
    RAZORPAY_PLAN_ULTRA_YEARLY:  { type: 'string', default: '', description: 'Razorpay plan id for Ultra yearly' },
  },
  { dotenv: true, mode: 'strict' }
);

// Derived helpers
export const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

/** True when the Razorpay API credentials are configured. */
export const billingEnabled = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/** True when GitHub OAuth is configured. */
export const githubEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

/** True when an SMS provider is configured (mobile OTP delivery). */
export const smsEnabled = Boolean(env.SMS_PROVIDER && env.SMS_API_KEY);

/** True when SMTP is configured (email OTP delivery). */
export const emailEnabled = Boolean(env.SMTP_HOST && env.SMTP_USER);
