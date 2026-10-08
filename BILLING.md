# Billing & Subscriptions (Stripe)

API Insight uses **Stripe Checkout + Subscriptions** for recurring monthly/yearly
billing. Paying upgrades an account's **plan**, which raises its limits
(projects, monitored endpoints, log retention). Limits are enforced server-side.

| Plan  | Price (USD/mo) | Yearly    | Projects  | Endpoints | Retention |
|-------|----------------|-----------|-----------|-----------|-----------|
| Free  | $0             | $0        | 1         | 5         | 7 days    |
| Pro   | $19            | $190      | 5         | 50        | 30 days   |
| Ultra | $49            | $490      | Unlimited | Unlimited | 90 days   |

> Yearly = 10× monthly (2 months free). The catalogue lives in
> [`backend/src/config/plans.ts`](backend/src/config/plans.ts) — the single
> source of truth for limits and Stripe price IDs.

---

## 1. Create a Stripe account

1. Sign up at <https://dashboard.stripe.com> and stay in **Test Mode** for
   development (toggle top-right).
2. **Developers → API keys**. Copy the **Secret key** (`sk_test_…`).

## 2. Create the products & prices

Run the seed script — it creates the Pro/Ultra products and their monthly +
yearly prices in your Stripe account and prints the price IDs:

```bash
cd backend
STRIPE_SECRET_KEY=sk_test_xxx npm run seed:stripe
```

It prints, e.g.:

```
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ULTRA_MONTHLY=price_...
STRIPE_PRICE_ULTRA_YEARLY=price_...
```

The script is idempotent — re-running it reuses existing products/prices rather
than creating duplicates.

## 3. Configure the backend env

In `backend/.env` (or Vercel → Settings → Environment Variables):

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx          # from step 4
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_ULTRA_MONTHLY=price_xxx
STRIPE_PRICE_ULTRA_YEARLY=price_xxx
FRONTEND_URL=https://app.yourdomain.com       # Checkout returns here
```

Billing auto-disables if `STRIPE_SECRET_KEY` is blank — the dashboard shows a
"Payments not configured" banner and the app still runs.

## 4. Configure the webhook

The webhook is the **source of truth** for activation/renewal/cancellation.

1. **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://api.yourdomain.com/api/billing/webhook`
3. Subscribe to these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the endpoint's **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.

**Local development:** Stripe can't reach `localhost`. Use the Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:5001/api/billing/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET, then in another shell:
stripe trigger checkout.session.completed
```

---

## How it fits together

```
User clicks Upgrade (dashboard /billing)
        │
        ▼
POST /api/billing/subscribe ──► stripe.checkout.sessions.create()
        │                              │
        │        { url }               │
        ▼                              │
Browser redirects to Stripe Checkout ◄─┘
        │  user authorises payment
        ▼
Stripe ──► POST /api/billing/webhook  (signature-verified)
        │
        ▼
User.plan = 'pro' | 'ultra', subscriptionStatus = 'active'
currentPeriodEnd set ──► limits raised everywhere
        │
        ▼
Stripe redirects back to <FRONTEND_URL>/billing?status=success
```

### Enforcement points
- **Projects** — [`createProject`](backend/src/services/project.service.ts) rejects with `403` past `maxProjects`.
- **Endpoints** — [`ingestLog`](backend/src/services/log.service.ts) rejects new endpoints past `maxEndpoints`.
- **Retention** — [`getLogs`](backend/src/services/log.service.ts) clamps the visible window to the plan's `retentionDays`.

### API surface (`/api/billing`)
| Method | Path            | Auth   | Purpose                            |
|--------|-----------------|--------|------------------------------------|
| GET    | `/plans`        | public | Plan catalogue                     |
| GET    | `/subscription` | JWT    | Current plan, status, usage        |
| POST   | `/subscribe`    | JWT    | Create Checkout Session → `{ url }` |
| POST   | `/cancel`       | JWT    | Cancel at end of billing period    |
| POST   | `/webhook`      | sig    | Stripe event handler               |

## Test cards

In Test Mode use card `4242 4242 4242 4242`, any future expiry, any CVC, any
postal code. Payment that requires authentication: `4000 0025 0000 3155`.
Declined: `4000 0000 0000 9995`. See
<https://stripe.com/docs/testing>.
