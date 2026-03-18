import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env, allowedOrigins } from './config/env';
import { connectDB } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import logRoutes from './routes/log.routes';

const app = express();

// ── Trust proxy (needed for correct IP behind load balancers / Nginx) ──────────
app.set('trust proxy', 1);

// ── Security headers via Helmet ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'none'"],
        scriptSrc:   ["'none'"],
        styleSrc:    ["'none'"],
        imgSrc:      ["'none'"],
        connectSrc:  ["'self'"],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
        baseUri:     ["'none'"],
        formAction:  ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy:   { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy:            { policy: 'no-referrer' },
    hsts: {
      maxAge:            31536000, // 1 year
      includeSubDomains: true,
      preload:           true,
    },
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server / curl in dev)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// ── Body parsing (tight limits) ────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Suspicious request blocker ─────────────────────────────────────────────────
// Rejects requests containing common injection / attack patterns before they
// reach any route handler or database query.
const INJECTION_PATTERNS = [
  /(<script[\s\S]*?>[\s\S]*?<\/script>)/i, // XSS script tags
  /(javascript\s*:)/i,                       // javascript: URLs
  /(\$where|\$gt|\$lt|\$ne|\$in|\$or|\$and)/i, // MongoDB operator injection
  /(union\s+select|insert\s+into|drop\s+table|exec\s*\(|xp_cmdshell)/i, // SQL injection
  /(\.\.[\/\\]){2,}/,                        // Path traversal
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const check = (value: string) => INJECTION_PATTERNS.some(p => p.test(value));

  // Check URL
  if (check(req.url)) {
    res.status(400).json({ success: false, message: 'Invalid request' });
    return;
  }

  // Check string body values (one level deep — avoids false positives in nested log payloads)
  if (req.body && typeof req.body === 'object') {
    for (const val of Object.values(req.body)) {
      if (typeof val === 'string' && check(val)) {
        res.status(400).json({ success: false, message: 'Invalid request' });
        return;
      }
    }
  }

  next();
});

// ── Global rate limiter (all routes) ──────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 300,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Too many requests, please slow down.' },
  })
);

// ── Route-specific rate limits ─────────────────────────────────────────────────
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Too many auth requests, try again later.' },
  })
);

app.use(
  '/api/logs',
  rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 500,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Log ingest rate limit exceeded.' },
  })
);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/logs', logRoutes);

// ── 404 & Error Handling ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`🚀 API Insight backend running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
};

start();

export default app;
