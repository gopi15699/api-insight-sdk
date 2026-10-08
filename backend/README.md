# API Insight — Backend

> Express + TypeScript REST API server with MongoDB, JWT auth, root cause analysis engine, and alert system.

---

## Overview

The backend is the core of API Insight. It provides:

- **REST API** for the dashboard (JWT-authenticated)
- **Log ingest endpoint** for the SDK (API key-authenticated)
- **Root cause analysis engine** — rule-based pattern matching on incoming errors
- **Error grouping** — deduplicates similar errors by endpoint + normalised message
- **Alert system** — email notifications when error thresholds are breached
- **User management** — local auth + Google OAuth 2.0

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Express 4 | HTTP framework |
| TypeScript | Type safety |
| Mongoose 8 | MongoDB ODM |
| Zod | Request validation |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| google-auth-library | Google OAuth |
| Helmet | Security headers |
| express-rate-limit | Rate limiting |
| Nodemailer | Email alerts |
| Morgan | HTTP request logging |
| envaegis | Environment variable validation |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              Environment validation (strict mode)
│   │   └── database.ts         MongoDB connection
│   ├── engines/
│   │   └── rootCause.ts        Rule-based RCA engine (20+ rules)
│   ├── models/
│   │   ├── User.ts             User model (local + Google auth)
│   │   ├── Project.ts          Project model (API key, thresholds)
│   │   └── Log.ts              Error log model (indexed for grouping)
│   ├── services/
│   │   ├── auth.service.ts     Register, login, Google OAuth, account lockout
│   │   ├── project.service.ts  CRUD + API key generation
│   │   └── log.service.ts      Ingest, query, group, stats, alerting
│   ├── controllers/
│   │   ├── auth.controller.ts  Thin HTTP handlers for auth
│   │   ├── project.controller.ts
│   │   └── log.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts      POST /register, /login, /google
│   │   ├── project.routes.ts   CRUD routes (JWT protected)
│   │   └── log.routes.ts       Ingest (API key) + query (JWT)
│   ├── middleware/
│   │   ├── auth.ts             JWT bearer token verification
│   │   ├── apiKeyAuth.ts       X-API-Key header validation
│   │   └── errorHandler.ts     Global error handler + Zod error formatter
│   ├── utils/
│   │   ├── jwt.ts              Token signing helper
│   │   └── alerts.ts           Email alert dispatcher
│   └── index.ts                App bootstrap, middleware chain, server start
├── .env.example                Environment variable template
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)

### Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
```

### Development

```bash
npm run dev    # ts-node-dev with hot reload
```

### Production

```bash
npm run build  # Compile TypeScript → dist/
npm start      # Run compiled output
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 12 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry duration |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS origins |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth2 client ID |
| `ALERT_EMAIL_FROM` | No | — | Sender email for alerts |
| `ALERT_EMAIL_TO` | No | — | Default recipient for alerts |
| `SMTP_HOST` | No | — | SMTP server |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `ALERT_ERROR_THRESHOLD` | No | `10` | Errors per hour before alerting |

---

## API Endpoints

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ name, email, password }` | Create account, returns JWT |
| `POST` | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| `POST` | `/api/auth/google` | `{ credential }` | Google OAuth, returns JWT |

### Projects (JWT required)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/projects` | `{ name, description?, alertThreshold?, alertEmail? }` | Create project, returns API key |
| `GET` | `/api/projects` | — | List user's projects |
| `GET` | `/api/projects/:id` | — | Get single project |

### Logs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/logs` | `X-API-Key` | SDK ingest endpoint |
| `GET` | `/api/logs?projectId=` | Bearer JWT | List logs (paginated) |
| `GET` | `/api/logs/groups?projectId=` | Bearer JWT | Error groups |
| `GET` | `/api/logs/stats?projectId=` | Bearer JWT | Error statistics |
| `GET` | `/api/logs/:id?projectId=` | Bearer JWT | Single log detail |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status: "ok", timestamp }` |

---

## Security Features

- **Helmet** — Strict CSP, HSTS (1 year, preload), X-Frame-Options
- **Rate limiting** — Global: 300/15min, Auth: 20/15min, Logs: 500/min
- **Injection blocking** — XSS, SQL injection, MongoDB operator injection, path traversal
- **JWT** — HS256 algorithm pinning, prevents alg:none attacks
- **Account lockout** — 5 failed attempts → 15-minute lock
- **Password hashing** — bcrypt with 12 salt rounds
- **CORS** — Origin allowlist with credential support

---

## Root Cause Analysis Engine

Located in `src/engines/rootCause.ts`, the engine contains **20+ prioritised rules** that match against:

- HTTP status codes (401, 403, 404, 400, 422, 429, 500, 503)
- Error message patterns (ECONNREFUSED, null access, MongoDB errors, JWT issues)
- Stack trace patterns (SyntaxError, TypeError, OOM)

Each incoming log is automatically analysed and a suggestion is attached before storage.

---

## Database Models

### User
- `name`, `email`, `password` (bcrypt hashed)
- `googleId`, `avatar`, `authProvider` (local/google)
- `loginAttempts`, `lockUntil` (account lockout)

### Project
- `name`, `description`, `userId`
- `apiKey` (auto-generated: `aik_` prefix + UUID)
- `alertThreshold`, `alertEmail`

### Log
- `projectId`, `endpoint`, `method`, `statusCode`
- `errorMessage`, `stackTrace`
- `requestBody`, `responseBody`, `requestHeaders`
- `duration`, `userAgent`, `ip`
- `suggestion` (from RCA engine)
- `groupKey` (for deduplication)
- `timestamp`

**Indexes:** `projectId`, `groupKey`, `timestamp`, compound indexes for efficient queries.

---

## License

Apache License 2.0
