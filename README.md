<p align="center">
  <h1 align="center">API Insight</h1>
  <p align="center">
    Open-source API failure monitoring, automatic root cause analysis, and error grouping for Node.js applications.
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &nbsp;&bull;&nbsp;
  <a href="#features">Features</a> &nbsp;&bull;&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;&bull;&nbsp;
  <a href="#sdk">SDK</a> &nbsp;&bull;&nbsp;
  <a href="#api-reference">API Reference</a> &nbsp;&bull;&nbsp;
  <a href="#deployment">Deployment</a> &nbsp;&bull;&nbsp;
  <a href="#contributing">Contributing</a>
</p>

---

## What is API Insight?

API Insight is an **API monitoring platform** that automatically captures **all
API traffic** (success + failure) from your Node.js APIs — total calls, success
rate, failure count, and unique client IPs — then analyses the root cause of
failures using a rule-based engine, groups similar errors, and alerts you when
thresholds are breached — all through a modern real-time dashboard. It ships as
a monorepo with an npm SDK, an Express/MongoDB backend (deployable to Vercel),
a Next.js dashboard, and Stripe-powered subscription billing.

**Key value proposition:** Drop in 2 lines of middleware, get instant visibility
into every API call — success and failure — with actionable root cause
suggestions on errors, and monetise it with built-in Stripe plans.

---

## Features

- **Automatic Traffic Capture** — Express middleware records every request (success + failure) with zero code changes to your routes; success logs stay lightweight, failures carry full detail. Opt into errors-only with `{ errorsOnly: true }`
- **Root Cause Analysis** — Rule-based engine analyses error patterns (null access, connection refused, JWT issues, DB errors, etc.) and provides actionable fix suggestions
- **Error Grouping** — Similar errors are grouped by endpoint + normalised error message for deduplication
- **Real-time Dashboard** — Next.js 16 dashboard with filterable log table, error groups with frequency bars, and stats overview
- **Alert System** — Configurable per-project thresholds with email notifications (Nodemailer) when error groups spike
- **Multi-project Support** — Create multiple projects, each with its own API key and alert settings
- **Security Hardened** — Helmet CSP headers, rate limiting, injection pattern blocking, JWT with HS256 pinning, account lockout
- **Google OAuth** — Sign in with Google alongside traditional email/password auth
- **Fire-and-Forget SDK** — SDK never throws, never blocks your response path — zero overhead on happy paths
- **Framework Agnostic** — Works with Express, Fastify, NestJS, Next.js, or any Node.js framework via manual logging

---

## Architecture

```
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
│   Your API       │       │   API Insight         │       │   Dashboard      │
│   (Express/      │──────▶│   Backend             │◀──────│   (Next.js 16)   │
│    Fastify/etc)  │ SDK   │   (Express + MongoDB) │ JWT   │   Port 3000      │
│                  │ POST  │   Port 5000           │       │                  │
└──────────────────┘       └──────────────────────┘       └──────────────────┘
        │                          │
        │ api-insight-sdk          │
        │ (npm package)            ├── Root Cause Engine
        │                          ├── Error Grouping
        └── Fire & Forget          ├── Alert System
            (non-blocking)         └── MongoDB Storage
```

### Monorepo Structure

```
api-insight/
├── backend/          Express API server (TypeScript)
│   └── src/
│       ├── config/       Environment validation, database connection
│       ├── engines/      Rule-based root cause analysis engine
│       ├── models/       Mongoose models (User, Project, Log)
│       ├── services/     Business logic (auth, projects, logs)
│       ├── controllers/  Thin HTTP request handlers
│       ├── routes/       Express route definitions
│       ├── middleware/   JWT auth, API key auth, error handler
│       └── utils/        JWT helpers, alert utilities
├── frontend/         Next.js 16 dashboard (Tailwind + Radix UI)
│   └── src/
│       ├── app/          Pages (login, register, dashboard)
│       ├── components/   UI components (sidebar, badges, cards)
│       ├── store/        Redux Toolkit state management
│       ├── hooks/        Custom hooks (GSAP animations)
│       └── lib/          API client, auth helpers
├── sdk/              npm package — api-insight-sdk
│   └── src/
│       ├── client.ts     ApiInsightClient (fire-and-forget + async)
│       ├── middleware.ts  Express middleware (createMiddleware + createErrorMiddleware)
│       └── index.ts      Public exports
├── example-app/      Working Express demo app with 6 error endpoints
│   └── src/index.ts
├── INTEGRATION.md    Step-by-step integration guide
└── package.json      Monorepo scripts (concurrently)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Express 4, TypeScript, Mongoose 8, Zod validation |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Radix UI, Redux Toolkit, GSAP |
| **Database** | MongoDB |
| **Auth** | JWT (HS256), Google OAuth 2.0, bcrypt |
| **SDK** | TypeScript, Axios |
| **Security** | Helmet, express-rate-limit, injection pattern blocking |
| **Alerts** | Nodemailer (SMTP) |
| **Dev Tools** | ts-node-dev, concurrently, ESLint |

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **npm** >= 9

### 1. Clone and Install

```bash
git clone https://github.com/your-username/api-insight.git
cd api-insight

# Install monorepo root dependencies
npm install

# Install all package dependencies
npm --prefix backend install
npm --prefix frontend install
npm --prefix sdk install
npm --prefix example-app install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
PORT=5001
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/api-insight

# JWT (use a strong secret, minimum 12 characters)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Optional: Email alerts
ALERT_EMAIL_FROM=alerts@api-insight.com
ALERT_EMAIL_TO=admin@yourcompany.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ALERT_ERROR_THRESHOLD=10
```

### 3. Start Development

```bash
# From the monorepo root — starts backend + frontend concurrently
npm run dev
```

This starts:
- **Backend** at `http://localhost:5001`
- **Frontend** at `http://localhost:3000`

### 4. Try the Example App (Optional)

```bash
# In a separate terminal
npm run dev:example
```

The example app runs at `http://localhost:4000` with 6 demo endpoints that trigger different error types. See errors appear instantly in your dashboard.

### 5. Open the Dashboard

Visit **http://localhost:3000** → Register → Create a project → Copy the API key → Integrate with your app.

---

## SDK

### Install

```bash
npm install api-insight-sdk
```

### Express Integration (2 lines)

```ts
import { ApiInsightClient, createMiddleware, createErrorMiddleware } from 'api-insight-sdk';

const insight = new ApiInsightClient({
  apiKey: process.env.API_INSIGHT_KEY!,
  host:   'http://localhost:5001',
});

// BEFORE routes — captures 4xx/5xx responses automatically
app.use(createMiddleware(insight));

// ... your routes ...

// AFTER routes — captures unhandled thrown errors
app.use(createErrorMiddleware(insight));
```

### Manual Logging

```ts
// Fire-and-forget (never throws)
insight.sendLog({
  endpoint:     '/payments/charge',
  method:       'POST',
  statusCode:   500,
  errorMessage: 'Stripe charge failed',
  stackTrace:   error.stack,
  requestBody:  { amount: 9900 },
  duration:     342,
});

// Async version (awaitable)
await insight.sendLogAsync({ ... });
```

### Configuration Options

```ts
const insight = new ApiInsightClient({
  apiKey:  'aik_your_key_here',   // required
  host:    'http://localhost:5001', // optional (default: http://localhost:5000)
  timeout: 5000,                   // optional, ms (default: 3000)
  debug:   true,                   // optional (default: false)
});
```

For full SDK documentation including Fastify, NestJS, and Next.js recipes, see [`sdk/README.md`](./sdk/README.md).

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account |
| `POST` | `/api/auth/login` | — | Get JWT token |
| `POST` | `/api/auth/google` | — | Google OAuth sign-in |

### Projects

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/projects` | Bearer JWT | Create project (returns API key) |
| `GET` | `/api/projects` | Bearer JWT | List your projects |
| `GET` | `/api/projects/:id` | Bearer JWT | Get single project |

### Logs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/logs` | X-API-Key | SDK log ingest endpoint |
| `GET` | `/api/logs?projectId=` | Bearer JWT | List logs (paginated, filterable) |
| `GET` | `/api/logs/groups?projectId=` | Bearer JWT | Error groups (aggregated) |
| `GET` | `/api/logs/stats?projectId=` | Bearer JWT | Stats (total, 24h errors, by status) |
| `GET` | `/api/logs/:id?projectId=` | Bearer JWT | Single log detail |

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Server health check |

### Query Parameters (GET /api/logs)

| Param | Type | Description |
|---|---|---|
| `projectId` | `string` | **Required.** Project ID to filter logs |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 20, max: 100) |
| `statusCode` | `number` | Filter by HTTP status code |
| `endpoint` | `string` | Filter by endpoint (case-insensitive regex) |
| `method` | `string` | Filter by HTTP method |
| `from` | `string` | Filter from date (ISO 8601) |
| `to` | `string` | Filter to date (ISO 8601) |

---

## Root Cause Analysis Engine

The backend includes a **rule-based RCA engine** that automatically analyses every incoming error log and attaches a human-readable suggestion. Rules are prioritised and match against status codes, error messages, and stack traces.

### Example Suggestions

| Error Pattern | Suggestion |
|---|---|
| Status 401 | _"JWT token missing or expired. Check Authorization header."_ |
| `ECONNREFUSED` | _"Target service is not running. Verify host/port in env vars."_ |
| `Cannot read properties of null` | _"Null access. Add optional chaining or null guards."_ |
| Status 429 | _"Rate limit exceeded. Implement exponential backoff."_ |
| `MongoServerError` | _"MongoDB error. Check for duplicate keys or schema mismatch."_ |
| `TokenExpiredError` | _"JWT expired. Implement refresh-token flow."_ |
| `ETIMEDOUT` | _"Connection timeout. Investigate network latency or add circuit breaker."_ |
| `heap out of memory` | _"OOM. Profile memory usage, fix leaks, or increase --max-old-space-size."_ |

---

## Alert System

When an error group exceeds your configured threshold within a **1-hour window**, API Insight triggers an alert:

- **Email alert** — sent via Nodemailer if `alertEmail` is configured on the project
- **Console warning** — logged to server console as a fallback

Configure thresholds per-project in the dashboard (default: 10 errors/hour).

---

## Security

API Insight is security-hardened by default:

- **Helmet** — Strict CSP, HSTS, X-Frame-Options, referrer policy
- **Rate limiting** — Global (300/15min), auth routes (20/15min), log ingest (500/min)
- **Injection blocking** — Rejects XSS, SQL injection, MongoDB operator injection, path traversal patterns
- **JWT** — HS256 algorithm pinning (prevents alg:none attacks), 7-day expiry
- **Account lockout** — 5 failed login attempts → 15-minute lock
- **Password hashing** — bcrypt with 12 salt rounds
- **CORS** — Configurable origin allowlist
- **Input validation** — Zod schemas on all endpoints

---

## Scripts

### Monorepo Root

| Script | Description |
|---|---|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:example` | Start example app |
| `npm run build:sdk` | Build SDK (TypeScript → dist/) |

### Backend (`backend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npm run lint` | ESLint |

### Frontend (`frontend/`)

| Script | Description |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |

### SDK (`sdk/`)

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript → dist/ |
| `npm run dev` | Watch mode |

---

## Deployment

**Full production runbook:** see **[`DEPLOYMENT.md`](./DEPLOYMENT.md)** — deploys
the backend and frontend as **two Vercel projects** on a custom domain
(`api.yourdomain.com` + `app.yourdomain.com`), with **MongoDB Atlas** and
**Stripe** billing. Billing setup is in **[`BILLING.md`](./BILLING.md)**.

The backend is serverless-ready: [`backend/api/index.ts`](backend/api/index.ts)
exports the Express app as a Vercel function, MongoDB uses a cached connection
([`backend/src/config/database.ts`](backend/src/config/database.ts)), and
[`backend/vercel.json`](backend/vercel.json) routes all paths to it.

### Self-hosting (any long-lived Node host)

- **Backend:** set `NODE_ENV=production`, `MONGO_URI`, a strong `JWT_SECRET`
  (≥ 12 chars), and `ALLOWED_ORIGINS`; then `cd backend && npm run build && npm start`.
- **Frontend:** set `NEXT_PUBLIC_API_URL`; then `cd frontend && npm run build && npm start`.
- **MongoDB:** local `mongod` or Atlas connection string in `MONGO_URI`; indexes
  are created automatically by Mongoose on first run.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Backend server port |
| `NODE_ENV` | No | `development` | `development` / `staging` / `production` |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 12 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiry |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS origins |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth2 client ID |
| `ALERT_EMAIL_FROM` | No | — | Alert sender email |
| `ALERT_EMAIL_TO` | No | — | Default alert recipient |
| `SMTP_HOST` | No | — | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `ALERT_ERROR_THRESHOLD` | No | `10` | Default error count threshold for alerts |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/your-username/api-insight.git
cd api-insight
npm install
npm --prefix backend install
npm --prefix frontend install
npm --prefix sdk install
npm run dev
```

---

## License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with TypeScript, Express, Next.js, and MongoDB
</p>
