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
  },
  { dotenv: true, mode: 'strict' }
);

// Derived helpers
export const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
