import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { ApiInsightClient, createMiddleware, createErrorMiddleware } from 'api-insight-sdk';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Initialise the SDK client once, reuse everywhere
// ─────────────────────────────────────────────────────────────────────────────
const insight = new ApiInsightClient({
  apiKey:  process.env.API_INSIGHT_KEY!,
  host:    process.env.API_INSIGHT_HOST || 'http://localhost:5000',
  debug:   true,   // logs "sent / failed" to console during development
});

const app = express();
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// 2. Mount the SDK middleware BEFORE your routes
//    It will automatically capture every 4xx and 5xx response
// ─────────────────────────────────────────────────────────────────────────────
app.use(createMiddleware(insight));

// ─────────────────────────────────────────────────────────────────────────────
// Demo routes — these intentionally produce various error conditions so you
// can see them appear on your API Insight dashboard
// ─────────────────────────────────────────────────────────────────────────────

// ✅  200 OK — no log sent (only errors are tracked)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 — resource not found
app.get('/users/:id', (req: Request, res: Response) => {
  const MOCK_USERS: Record<string, { id: string; name: string }> = {
    '1': { id: '1', name: 'Alice' },
    '2': { id: '2', name: 'Bob' },
  };
  const user = MOCK_USERS[req.params.id];
  if (!user) {
    return res.status(404).json({ message: `User ${req.params.id} not found` });
  }
  res.json(user);
});

// 400 — validation error
app.post('/orders', (req: Request, res: Response) => {
  const { productId, quantity } = req.body;
  if (!productId) {
    return res.status(400).json({ message: 'productId is required' });
  }
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'quantity must be a positive number' });
  }
  res.status(201).json({ orderId: 'ord_demo_123', productId, quantity });
});

// 401 — missing auth token
app.get('/profile', (req: Request, res: Response) => {
  const token = req.headers.authorization;
  if (!token?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Bearer token' });
  }
  res.json({ id: 'usr_1', email: 'demo@example.com' });
});

// 500 — simulate a runtime crash (null pointer, DB error, etc.)
app.get('/crash', (_req: Request, _res: Response, next: NextFunction) => {
  // Simulating an unhandled error (e.g. DB driver throws)
  const err = new Error('Cannot read properties of null (reading "email")');
  (err as Error & { statusCode: number }).statusCode = 500;
  next(err);
});

// 503 — downstream service unavailable
app.post('/payments', (_req: Request, res: Response) => {
  res.status(503).json({
    message: 'ECONNREFUSED — payment service is unreachable',
  });
});

// 429 — rate limit exceeded
app.get('/search', (_req: Request, res: Response) => {
  res.status(429).json({ message: 'Too many requests — please slow down' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Mount the SDK error middleware AFTER all routes
//    It captures thrown errors and forwards the stack trace to API Insight
// ─────────────────────────────────────────────────────────────────────────────
app.use(createErrorMiddleware(insight));

// Your own final error handler (after SDK middleware)
app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode || 500;
  console.error(`[Error] ${status} — ${err.message}`);
  res.status(status).json({ message: err.message });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Start
// ─────────────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`\n🚀  Example app running on http://localhost:${PORT}`);
  console.log(`📡  Sending errors to API Insight at ${process.env.API_INSIGHT_HOST}`);
  console.log('\nTry these endpoints to generate errors:');
  console.log(`  GET  http://localhost:${PORT}/users/999       → 404`);
  console.log(`  POST http://localhost:${PORT}/orders          → 400 (empty body)`);
  console.log(`  GET  http://localhost:${PORT}/profile         → 401`);
  console.log(`  GET  http://localhost:${PORT}/crash           → 500`);
  console.log(`  POST http://localhost:${PORT}/payments        → 503`);
  console.log(`  GET  http://localhost:${PORT}/search          → 429`);
});
