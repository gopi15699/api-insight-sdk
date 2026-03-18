# API Insight — Integration Guide

This guide walks you through wiring your existing Express (or other Node.js) app to API Insight in under 5 minutes.

---

## Step 1 — Create a Project

1. Open the dashboard → **http://localhost:3000**
2. Register / log in
3. Click **"New Project"**
4. Fill in name + optional alert threshold
5. Copy the generated API key: `aik_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2 — Install the SDK

```bash
npm install api-insight-sdk
```

---

## Step 3 — Add to Your Express App

Open your main `app.ts` / `server.ts` / `index.ts`:

```ts
import { ApiInsightClient, createMiddleware, createErrorMiddleware } from 'api-insight-sdk';

// ① Create client once at module level
const insight = new ApiInsightClient({
  apiKey: process.env.API_INSIGHT_KEY!,   // from your project dashboard
  host:   'http://localhost:5000',         // your API Insight backend URL
});

// ② Add BEFORE your routes
app.use(createMiddleware(insight));

// ... all your routes go here ...

// ③ Add AFTER your routes
app.use(createErrorMiddleware(insight));

// ④ Your own error handler last
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ message: err.message });
});
```

> **Order matters.** `createMiddleware` must be before routes, `createErrorMiddleware` must be after routes but before your own error handler.

---

## Step 4 — Set Your Environment Variable

```bash
# .env
API_INSIGHT_KEY=aik_your_key_here
API_INSIGHT_HOST=http://localhost:5000   # or your deployed URL
```

---

## Step 5 — Trigger Some Errors

Hit your API with bad requests, then open the dashboard:

```bash
# 404
curl http://localhost:4000/users/999

# 400
curl -X POST http://localhost:4000/orders -H "Content-Type: application/json" -d '{}'

# 401
curl http://localhost:4000/profile

# 500
curl http://localhost:4000/crash
```

Open **http://localhost:3000/dashboard/logs** — you'll see each error with:
- Status code + method + endpoint
- Error message
- Root cause suggestion (AI-style rule-based analysis)
- Stack trace (for 500s)
- Request body, duration, IP

---

## What Gets Captured

| Error Type | Captured by |
|---|---|
| 4xx / 5xx HTTP responses | `createMiddleware` |
| Uncaught `next(err)` thrown errors | `createErrorMiddleware` |
| Manual events | `insight.sendLog(...)` |

Only errors are sent — successful (2xx/3xx) responses are ignored. This keeps the SDK lightweight with near-zero overhead on happy paths.

---

## Root Cause Suggestions

The backend analyses every incoming log against a rule set and attaches a suggestion automatically. Examples:

| Error | Suggestion shown in dashboard |
|---|---|
| `statusCode: 401` | _"JWT token missing or expired. Check Authorization header."_ |
| `ECONNREFUSED` | _"Target service is not running. Verify host/port in env vars."_ |
| `Cannot read properties of null` | _"Null access. Add optional chaining or null guards."_ |
| `statusCode: 429` | _"Rate limit exceeded. Implement exponential backoff."_ |
| `MongoServerError` | _"MongoDB error. Check for duplicate keys or schema mismatch."_ |

---

## Alert Thresholds

When an error group exceeds your configured threshold within 1 hour, API Insight fires an alert. You can set this per-project in the dashboard (default: 10 errors/hr).

If you configured `alertEmail` on the project, an email is sent via Nodemailer. Otherwise a console warning is logged.

---

## Running the Full Stack Locally

```bash
# 1. Start MongoDB (or use Atlas)
mongod

# 2. Configure backend
cd backend && cp .env.example .env
# Edit .env: set MONGO_URI and JWT_SECRET

# 3. Run everything
cd ..          # back to monorepo root
npm run dev    # starts backend (port 5000) + frontend (port 3000) concurrently

# 4. (Optional) Run the example app
npm run dev:example   # starts on port 4000
```

Visit **http://localhost:3000** to open the dashboard.

---

## Folder Structure Reference

```
api-insight/
├── backend/                  Express API (TypeScript)
│   └── src/
│       ├── config/           env.ts (uses @gopinath_natarajan/env-validator)
│       ├── engines/          rootCause.ts — rule-based RCA engine
│       ├── models/           User, Project, Log (Mongoose)
│       ├── services/         auth, project, log business logic
│       ├── controllers/      thin HTTP handlers
│       ├── routes/           auth, projects, logs
│       └── middleware/       auth (JWT), apiKeyAuth (SDK), errorHandler
├── frontend/                 Next.js 16 dashboard (Tailwind + Radix UI)
│   └── src/app/
│       ├── login/            Sign-in page
│       ├── register/         Sign-up page
│       └── dashboard/
│           ├── page.tsx      Overview — stats + recent errors
│           ├── projects/     Project list + create new
│           ├── logs/         Filterable log table + detail modal
│           └── groups/       Error groups with frequency bars
├── sdk/                      npm package (api-insight-sdk)
│   └── src/
│       ├── client.ts         ApiInsightClient — fire-and-forget + async
│       └── middleware.ts     createMiddleware + createErrorMiddleware
└── example-app/              Full working Express demo app
    └── src/index.ts          6 demo endpoints that trigger different errors
```

---

## API Reference (Backend)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get JWT token |
| POST | `/api/projects` | Bearer JWT | Create project → get API key |
| GET | `/api/projects` | Bearer JWT | List your projects |
| GET | `/api/projects/:id` | Bearer JWT | Get single project |
| **POST** | **`/api/logs`** | **X-API-Key** | **SDK ingest endpoint** |
| GET | `/api/logs` | Bearer JWT | List logs (paginated, filterable) |
| GET | `/api/logs/groups` | Bearer JWT | Error groups (aggregated) |
| GET | `/api/logs/stats` | Bearer JWT | Stats (total, 24h errors, by status) |
| GET | `/api/logs/:id` | Bearer JWT | Single log detail |
