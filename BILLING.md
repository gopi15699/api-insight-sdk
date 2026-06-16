# Billing & Subscriptions (Razorpay)

API Insight uses **Razorpay Subscriptions** for recurring monthly/yearly billing.
Paying upgrades an account's **plan**, which raises its limits (projects,
monitored endpoints, log retention). Limits are enforced server-side.

| Plan  | Price (₹/mo) | Projects  | Endpoints | Retention |
|-------|--------------|-----------|-----------|-----------|
| Free  | 0            | 1         | 5         | 7 days    |
| Pro   | 500          | 5         | 50        | 30 days   |
| Ultra | 1000         | Unlimited | Unlimited | 90 days   |

> The catalogue lives in [`backend/src/config/plans.ts`](backend/src/config/plans.ts) — the single source of truth for limits and Razorpay plan IDs.

---

## 1. Create a Razorpay account

1. Sign up at <https://dashboard.razorpay.com> and stay in **Test Mode** for development.
2. **Settings → API Keys → Generate Test Key**. Copy the `key_id`
   (`rzp_test_…`) and `key_secret`.

## 2. Create subscription Plans

Razorpay subscriptions bill against pre-created **Plans**. Create one per
tier + cycle under **Subscriptions → Plans → Create Plan**:

| Plan to create   | Billing cycle | Amount   |
|------------------|---------------|----------|
| Pro Monthly      | Monthly       | ₹500     |
| Pro Yearly       | Yearly        | ₹4,800   |
| Ultra Monthly    | Monthly       | ₹1,000   |
| Ultra Yearly     | Yearly        | ₹9,600   |

Copy each resulting `plan_xxxxxxxx` id.

## 3. Configure the backend env

In `backend/.env`:

```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=choose_a_strong_secret   # set the same value in step 4
RAZORPAY_PLAN_PRO_MONTHLY=plan_xxx
RAZORPAY_PLAN_PRO_YEARLY=plan_xxx
RAZORPAY_PLAN_ULTRA_MONTHLY=plan_xxx
RAZORPAY_PLAN_ULTRA_YEARLY=plan_xxx
```

Billing auto-disables if `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are blank —
the dashboard shows a "Payments not configured" banner and the app still runs.

## 4. Configure the webhook

The webhook is the **source of truth** for activation/renewal/cancellation.

1. **Settings → Webhooks → Add New Webhook**.
2. URL: `https://<your-backend>/api/billing/webhook`
3. Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`.
4. Subscribe to these events:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.pending`
   - `subscription.halted`
   - `subscription.cancelled`
   - `subscription.completed`

**Local development:** Razorpay can't reach `localhost`. Use a tunnel:

```bash
# example with ngrok
ngrok http 5001
# then set the webhook URL to https://<id>.ngrok.io/api/billing/webhook
```

Without a tunnel, checkout still completes but the plan won't activate
(no webhook delivered). For local testing you can manually flip a user's
`plan`/`subscriptionStatus` to `active` in MongoDB.

---

## How it fits together

```
User clicks Upgrade (dashboard /billing)
        │
        ▼
POST /api/billing/subscribe ──► Razorpay subscriptions.create()
        │                              │
        │  { subscriptionId, keyId }   │
        ▼                              │
Razorpay Checkout opens ◄──────────────┘
        │  user authorises payment
        ▼
Razorpay ──► POST /api/billing/webhook  (signature-verified)
        │
        ▼
User.plan = 'pro' | 'ultra', subscriptionStatus = 'active'
currentPeriodEnd set ──► limits raised everywhere
```

### Enforcement points
- **Projects** — [`createProject`](backend/src/services/project.service.ts) rejects with `403` past `maxProjects`.
- **Endpoints** — [`ingestLog`](backend/src/services/log.service.ts) rejects new endpoints past `maxEndpoints`.
- **Retention** — [`getLogs`](backend/src/services/log.service.ts) clamps the visible window to the plan's `retentionDays`.

### API surface (`/api/billing`)
| Method | Path            | Auth   | Purpose                          |
|--------|-----------------|--------|----------------------------------|
| GET    | `/plans`        | public | Plan catalogue                   |
| GET    | `/subscription` | JWT    | Current plan, status, usage      |
| POST   | `/subscribe`    | JWT    | Create subscription for Checkout |
| POST   | `/cancel`       | JWT    | Cancel at end of billing period  |
| POST   | `/webhook`      | sig    | Razorpay event handler           |

## Test cards

In Test Mode use card `4111 1111 1111 1111`, any future expiry, any CVV, any
name. UPI: `success@razorpay`. See
<https://razorpay.com/docs/payments/payments/test-card-details/>.
