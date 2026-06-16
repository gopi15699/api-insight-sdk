import { createEnv } from '@gopinath_natarajan/env-validator';

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
