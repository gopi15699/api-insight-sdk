# api-insight-sdk

> Node.js SDK for [API Insight](https://github.com/your-repo/api-insight) — automatic API failure monitoring, root cause analysis, and error grouping.

---

## Installation

```bash
npm install api-insight-sdk
```

---

## Quick Setup (Express — 2 lines)

```ts
import { ApiInsightClient, createMiddleware, createErrorMiddleware } from 'api-insight-sdk';

const insight = new ApiInsightClient({ apiKey: 'aik_your_key_here' });

// 1. Add BEFORE your routes — captures EVERY request (success + failure)
app.use(createMiddleware(insight));

// ... your routes ...

// 2. Add AFTER your routes — captures unhandled thrown errors
app.use(createErrorMiddleware(insight));
```

That's it. Every request is sent to API Insight so your dashboard shows **total
calls, success count, failure count, success rate, and unique IPs** — with
endpoint, method, status code, duration, IP, and user agent. Failures (4xx/5xx)
additionally carry the error message, request body, and response body for root
cause analysis. Prefer errors-only? Pass `{ errorsOnly: true }`.

---

## Get Your API Key

1. Register at your API Insight dashboard
2. Create a project → copy the API key (`aik_...`)
3. Pass it to `ApiInsightClient`

---

## Full Configuration

```ts
const insight = new ApiInsightClient({
  apiKey:  'aik_your_key_here',   // required — from your project dashboard
  host:    'http://localhost:5000', // optional — defaults to your deployed backend
  timeout: 5000,                   // optional — HTTP timeout in ms (default: 3000)
  debug:   true,                   // optional — logs sent/failed events to console
});
```

---

## Express Middleware (Recommended)

### Automatic capture — every request (success + failure)

```ts
import express from 'express';
import { ApiInsightClient, createMiddleware, createErrorMiddleware } from 'api-insight-sdk';

const app = express();
const insight = new ApiInsightClient({ apiKey: process.env.API_INSIGHT_KEY! });

// ── STEP 1: Add response monitor (before routes) ─────────────────────────────
// Captures every request. Options:
//   errorsOnly:  true  → only capture 4xx/5xx (default: false)
//   ignorePaths: string[] → skip health checks etc. e.g. ['/health', '/metrics']
app.use(createMiddleware(insight, { ignorePaths: ['/health'] }));

// ── Your routes ──────────────────────────────────────────────────────────────
app.get('/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

app.post('/orders', async (req, res, next) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err); // pass to error middleware below
  }
});

// ── STEP 2: Add error capture (after ALL routes) ──────────────────────────────
app.use(createErrorMiddleware(insight));

// ── Your own error handler goes last ─────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({ message: err.message });
});
```

**What `createMiddleware` captures:**

| Field | Source |
|---|---|
| `endpoint` | `req.path` — captured on every request |
| `method` | `req.method` — every request |
| `statusCode` | `res.statusCode` — every request |
| `duration` | Time from request start to `res.finish` — every request |
| `userAgent` | `req.headers['user-agent']` — every request |
| `ip` | `req.ip` — every request |
| `errorMessage` | `res.json()` body `.message` — **errors only** |
| `requestBody` | `req.body` (if non-empty) — **errors only** |
| `responseBody` | `res.json()` payload — **errors only** |

> On the happy path only lightweight fields are sent (no request/response
> bodies), keeping success logs small and avoiding capture of sensitive
> payloads.

**What `createErrorMiddleware` adds:**

| Field | Source |
|---|---|
| `stackTrace` | `err.stack` |
| `errorMessage` | `err.message` |
| `statusCode` | `err.statusCode` (or 500) |

---

## Manual Logging

For non-Express frameworks, microservices, background jobs, or custom events:

```ts
import { ApiInsightClient } from 'api-insight-sdk';

const insight = new ApiInsightClient({ apiKey: process.env.API_INSIGHT_KEY! });

// Fire-and-forget (never throws, never blocks your code)
insight.sendLog({
  endpoint:     '/payments/charge',
  method:       'POST',
  statusCode:   500,
  errorMessage: 'Stripe charge failed: card_declined',
  stackTrace:   error.stack,
  requestBody:  { amount: 9900, currency: 'usd' },
  duration:     342,
  timestamp:    new Date().toISOString(),
});

// Async version (awaitable, useful in scripts)
await insight.sendLogAsync({
  endpoint:   '/cron/daily-report',
  method:     'POST',
  statusCode: 503,
  errorMessage: 'ECONNREFUSED — database unreachable',
});
```

---

## Framework Recipes

### Fastify

```ts
import Fastify from 'fastify';
import { ApiInsightClient } from 'api-insight-sdk';

const app    = Fastify();
const insight = new ApiInsightClient({ apiKey: process.env.API_INSIGHT_KEY! });

// Hook into every reply
app.addHook('onSend', async (request, reply, payload) => {
  if (reply.statusCode >= 400) {
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(payload as string); } catch { /* ignore */ }

    insight.sendLog({
      endpoint:     request.url,
      method:       request.method,
      statusCode:   reply.statusCode,
      errorMessage: (body as { message?: string }).message,
      requestBody:  request.body as Record<string, unknown>,
      userAgent:    request.headers['user-agent'],
      ip:           request.ip,
      timestamp:    new Date().toISOString(),
    });
  }
  return payload;
});

// Capture unhandled errors
app.setErrorHandler((error, request, reply) => {
  insight.sendLog({
    endpoint:     request.url,
    method:       request.method,
    statusCode:   error.statusCode || 500,
    errorMessage: error.message,
    stackTrace:   error.stack,
    requestBody:  request.body as Record<string, unknown>,
    ip:           request.ip,
    timestamp:    new Date().toISOString(),
  });
  reply.status(error.statusCode || 500).send({ message: error.message });
});
```

### NestJS

```ts
// api-insight.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiInsightClient } from 'api-insight-sdk';

@Injectable()
export class ApiInsightInterceptor implements NestInterceptor {
  private insight = new ApiInsightClient({ apiKey: process.env.API_INSIGHT_KEY! });

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req   = context.switchToHttp().getRequest();
    const res   = context.switchToHttp().getResponse();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        if (res.statusCode >= 400) {
          this.insight.sendLog({
            endpoint:   req.path,
            method:     req.method,
            statusCode: res.statusCode,
            duration:   Date.now() - start,
            ip:         req.ip,
            userAgent:  req.headers['user-agent'],
          });
        }
      }),
      catchError((err) => {
        this.insight.sendLog({
          endpoint:     req.path,
          method:       req.method,
          statusCode:   err.status || 500,
          errorMessage: err.message,
          stackTrace:   err.stack,
          duration:     Date.now() - start,
          ip:           req.ip,
        });
        return throwError(() => err);
      })
    );
  }
}

// main.ts — register globally
app.useGlobalInterceptors(new ApiInsightInterceptor());
```

### Next.js API Routes (pages router)

```ts
// lib/withApiInsight.ts
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { ApiInsightClient } from 'api-insight-sdk';

const insight = new ApiInsightClient({ apiKey: process.env.API_INSIGHT_KEY! });

export function withApiInsight(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = (body: unknown) => {
      responseBody = body;
      return originalJson(body);
    };

    try {
      await handler(req, res);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      insight.sendLog({
        endpoint:     req.url || '/',
        method:       req.method || 'GET',
        statusCode:   e.statusCode || 500,
        errorMessage: e.message,
        stackTrace:   e.stack,
        duration:     Date.now() - start,
      });
      throw err;
    } finally {
      if (res.statusCode >= 400) {
        insight.sendLog({
          endpoint:     req.url || '/',
          method:       req.method || 'GET',
          statusCode:   res.statusCode,
          errorMessage: (responseBody as { message?: string })?.message,
          duration:     Date.now() - start,
        });
      }
    }
  };
}

// pages/api/users/[id].ts — usage
export default withApiInsight(async (req, res) => {
  const user = await getUser(req.query.id as string);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
});
```

---

## TypeScript Types

```ts
interface ApiInsightConfig {
  apiKey:   string;
  host?:    string;    // default: http://localhost:5000
  timeout?: number;    // default: 3000ms
  debug?:   boolean;   // default: false
}

interface LogPayload {
  endpoint:        string;
  method:          string;
  statusCode:      number;
  errorMessage?:   string;
  stackTrace?:     string;
  requestBody?:    Record<string, unknown>;
  responseBody?:   Record<string, unknown>;
  requestHeaders?: Record<string, string>;
  duration?:       number;
  userAgent?:      string;
  ip?:             string;
  timestamp?:      string;   // ISO 8601
}
```

---

## Environment Variable

Store your API key securely:

```bash
# .env
API_INSIGHT_KEY=aik_your_project_key_here
```

```ts
const insight = new ApiInsightClient({ apiKey: process.env.API_INSIGHT_KEY! });
```

---

## How It Works

```
Your API                SDK                    API Insight Backend
  │                      │                            │
  ├─ 500 error ─────────►│                            │
  │                      ├─ analyseRootCause()        │
  │                      ├─ POST /api/logs ──────────►│
  │                      │  (async, non-blocking)     ├─ Save to MongoDB
  │◄─ response ──────────┤                            ├─ Group by pattern
  │                      │                            ├─ Trigger alert if
  │                      │                            │  threshold exceeded
  │                      │                            │
  │                   Dashboard ◄────────────────── GET /api/logs
  │                   shows error + root cause suggestion
```

Key design choices:
- **Fire-and-forget** — `sendLog()` never throws and never blocks your response path
- **Non-invasive** — the middleware only activates on 4xx/5xx responses
- **Zero dependencies** — only `axios` for the HTTP client
- **Works everywhere** — Express, Fastify, NestJS, Next.js, vanilla Node.js

---

## License

MIT
