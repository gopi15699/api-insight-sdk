# Deploying API Insight to Production (Vercel + MongoDB Atlas + Stripe)

This guide takes the monorepo from source to a live, custom-domain B2B product:

- **Frontend (dashboard)** → Vercel project at `https://app.yourdomain.com`
- **Backend (API)** → Vercel serverless project at `https://api.yourdomain.com`
- **Database** → MongoDB Atlas
- **Billing** → Stripe Checkout + Subscriptions

Both apps are deployed as **two separate Vercel projects from the same GitHub
repo**, distinguished by their **Root Directory** setting.

> Replace `yourdomain.com` everywhere with the domain you purchased.

---

## Architecture

```
                    ┌──────────────────────────────┐
  Customer's API ──▶│  api-insight-sdk (npm)        │
  (Express app)     │  createMiddleware(client)     │
                    └──────────────┬────────────────┘
                                   │ POST /api/logs  (X-API-Key)
                                   ▼
   app.yourdomain.com        api.yourdomain.com          MongoDB Atlas
   ┌───────────────┐  JWT   ┌───────────────────┐  driver ┌───────────┐
   │  Next.js       │◀──────▶│  Express (Vercel   │────────▶│  cluster  │
   │  dashboard     │        │  serverless fn)    │         └───────────┘
   └───────────────┘         └─────────┬──────────┘
                                       │ webhook (signed)
                                       ▼
                                    Stripe
```

---

## Prerequisites (things only you can provision)

- [ ] The purchased **domain** and access to its DNS (registrar dashboard).
- [ ] A **GitHub** repo containing this code (already: `gopi15699/api-insight-sdk`).
- [ ] A **Vercel** account (free Hobby works to start; Pro recommended for a
      paid product — higher function timeouts and no sleep).
- [ ] A **MongoDB Atlas** account.
- [ ] A **Stripe** account.

---

## Step 1 — MongoDB Atlas

1. Create a **free M0 cluster** (or M10+ for production durability) at
   <https://cloud.mongodb.com>.
2. **Database Access** → add a database user (username + strong password).
3. **Network Access** → add IP `0.0.0.0/0` (Vercel functions have dynamic IPs).
   For stricter security, use Atlas + a static-egress add-on later.
4. **Connect → Drivers** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/api-insight?retryWrites=true&w=majority
   ```
   Note the `/api-insight` database name before the `?`.

Keep this as your `MONGO_URI`.

---

## Step 2 — Stripe

Follow [`BILLING.md`](./BILLING.md):

1. Grab your **Secret key** (`sk_test_…`, switch to `sk_live_…` when going live).
2. Seed products/prices:
   ```bash
   cd backend
   STRIPE_SECRET_KEY=sk_test_xxx npm run seed:stripe
   ```
   Save the four `price_…` IDs it prints.
3. The webhook endpoint is added **after** the backend is deployed (Step 4),
   because you need the live `api.yourdomain.com` URL.

---

## Step 3 — Deploy the BACKEND (api.yourdomain.com)

1. In Vercel: **Add New → Project → import the GitHub repo**.
2. **Root Directory:** `backend`.
3. Framework preset: **Other** (the included [`backend/vercel.json`](backend/vercel.json)
   builds `api/index.ts` with `@vercel/node` and routes all paths to it).
4. **Environment Variables** (Production + Preview):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | *(from Step 1)* |
   | `JWT_SECRET` | a long random string (≥ 32 chars) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `ALLOWED_ORIGINS` | `https://app.yourdomain.com` |
   | `FRONTEND_URL` | `https://app.yourdomain.com` |
   | `STRIPE_SECRET_KEY` | *(from Step 2)* |
   | `STRIPE_WEBHOOK_SECRET` | *(set in Step 4)* |
   | `STRIPE_PRICE_PRO_MONTHLY` | *(from Step 2)* |
   | `STRIPE_PRICE_PRO_YEARLY` | *(from Step 2)* |
   | `STRIPE_PRICE_ULTRA_MONTHLY` | *(from Step 2)* |
   | `STRIPE_PRICE_ULTRA_YEARLY` | *(from Step 2)* |
   | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | *(optional OAuth)* |
   | `GOOGLE_CLIENT_ID` | *(optional OAuth)* |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | *(optional alerts)* |
   | `ALERT_EMAIL_FROM` / `ALERT_EMAIL_TO` | *(optional alerts)* |

   > `JWT_SECRET` and `MONGO_URI` are **required** — the app refuses to boot
   > without them (envaegis strict mode).

5. **Deploy.** Then **Settings → Domains → add `api.yourdomain.com`**.
6. Add the DNS record Vercel shows at your registrar (typically
   `CNAME  api  →  cname.vercel-dns.com`).
7. Verify: `https://api.yourdomain.com/health` returns `{"status":"ok",...}`.

> **Serverless note:** rate limiting is in-memory, so on serverless it is
> best-effort per warm instance (not a global limit). For hard global limits
> later, back `express-rate-limit` with Upstash Redis. Everything else
> (auth, ingest, billing, webhooks) is fully serverless-safe.

---

## Step 4 — Stripe webhook (now that the API is live)

1. Stripe **Developers → Webhooks → Add endpoint**.
2. URL: `https://api.yourdomain.com/api/billing/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`.
4. Copy the **Signing secret** (`whsec_…`) into the backend project's
   `STRIPE_WEBHOOK_SECRET` env var and **redeploy** the backend.

---

## Step 5 — Deploy the FRONTEND (app.yourdomain.com)

1. Vercel: **Add New → Project → import the SAME repo again**.
2. **Root Directory:** `frontend`. Framework preset: **Next.js** (auto-detected).
3. **Environment Variables:**

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | *(optional, same as backend)* |
   | `NEXT_PUBLIC_GITHUB_CLIENT_ID` | *(optional, same as backend)* |

   > `NEXT_PUBLIC_*` values are baked in at **build time** — after changing
   > them, redeploy.

4. **Deploy.** Then **Settings → Domains → add `app.yourdomain.com`**
   (and optionally the apex `yourdomain.com` → redirect to `app`).
5. Add the DNS records Vercel shows (`CNAME app → cname.vercel-dns.com`; for the
   apex use the `A 76.76.21.21` record Vercel provides).

---

## Step 6 — OAuth callback URLs (if using Google/GitHub sign-in)

- **GitHub** OAuth App → Authorization callback URL:
  `https://app.yourdomain.com/auth/github/callback`
- **Google** OAuth Client → Authorized JavaScript origin:
  `https://app.yourdomain.com`

---

## Step 7 — Smoke test the whole flow

1. Visit `https://app.yourdomain.com` → **Register** → verify email/OTP.
2. **Create a project** → copy the API key (`aik_…`).
3. Integrate the SDK in a test app (see [`INTEGRATION.md`](./INTEGRATION.md)):
   ```ts
   const insight = new ApiInsightClient({
     apiKey: process.env.API_INSIGHT_KEY!,
     host: 'https://api.yourdomain.com',
   });
   app.use(createMiddleware(insight));           // captures success + failure
   app.use(createErrorMiddleware(insight));      // after routes
   ```
4. Hit some endpoints (2xx and 4xx/5xx) → the dashboard shows **Total API Calls,
   Successful, Failed, Unique IPs** and per-log detail.
5. **Upgrade to Pro** on `/billing` → Stripe Checkout (test card
   `4242 4242 4242 4242`) → after redirect the plan flips to **active**
   (driven by the webhook).

---

## Going live (leaving Stripe test mode)

1. Toggle Stripe to **Live mode**, re-run `npm run seed:stripe` with the
   `sk_live_…` key, and update the four `STRIPE_PRICE_*` env vars.
2. Swap `STRIPE_SECRET_KEY` to `sk_live_…` and add a **live-mode webhook**
   (new `whsec_…`).
3. Redeploy the backend.

---

## Publishing the SDK to npm (so customers can `npm install`)

```bash
cd sdk
npm version patch          # or minor — capturing success is a feature bump
npm publish --access public
```

> The package name in [`sdk/package.json`](sdk/package.json) is
> `api-insight-sdk`. If that name is taken on npm, scope it
> (`@yourorg/api-insight-sdk`) and update the README install command.

---

## Cost sketch (early stage)

| Service | Tier | Cost |
|---|---|---|
| Vercel | Hobby → Pro | $0 → $20/mo |
| MongoDB Atlas | M0 → M10 | $0 → ~$57/mo |
| Stripe | pay-as-you-go | 2.9% + 30¢ per charge |
| Domain | — | ~$10–15/yr |

Start on free tiers; move Atlas to M10 and Vercel to Pro before you have real
paying customers (durability + no cold-start sleep).
