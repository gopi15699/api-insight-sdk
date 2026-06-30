# Authentication & Verification

API Insight supports four sign-in methods and OTP verification.

| Method            | Flow                                   | Email status   |
|-------------------|----------------------------------------|----------------|
| Email + password  | OTP email verification required        | verified on OTP |
| Google            | Client-side ID token → server verify   | pre-verified   |
| GitHub            | Server-side OAuth code exchange        | pre-verified   |
| Phone (mobile)    | OTP via SMS (optional, post-login)     | n/a            |

All methods issue a JWT (`Authorization: Bearer <token>`) on success.

---

## Email verification (OTP) — mandatory

New email/password accounts **must verify** before a session is issued.

```
register ──► account created (emailVerified=false) ──► 6-digit code emailed
   │                                                         │
   │   { requiresVerification, email }  (no token yet)       │
   ▼                                                         ▼
/verify-email page ──► POST /auth/verify-email ──► emailVerified=true + JWT
```

- Login of an unverified account re-sends a code and routes to `/verify-email`.
- Codes are **6 digits**, **HMAC-SHA256 hashed** at rest, **single-use**, expire
  after `OTP_TTL_MINUTES` (default 10), capped at **5 attempts**, with a
  `OTP_RESEND_COOLDOWN_SEC` resend cooldown (default 60s). Stored in an `Otp`
  collection with a **TTL index** for auto-cleanup.
- Email delivery uses the existing SMTP config. With SMTP unset, the code is
  logged to the server console (dev convenience).

## Mobile verification (OTP) — built, inactive until an SMS provider is added

Phone OTP works end-to-end but delivery is gated. Until configured, the request
endpoint returns **501 "SMS delivery is not configured"**.

To enable: implement the provider branch in
[`backend/src/utils/sms.ts`](backend/src/utils/sms.ts) and set `SMS_PROVIDER`,
`SMS_API_KEY` (+ `SMS_FROM` / `SMS_API_SECRET` as needed).

Endpoints (logged-in user):
- `POST /api/auth/phone/request { phone }` — E.164, e.g. `+919876543210`
- `POST /api/auth/phone/verify  { code }`

### Migrating existing accounts

Accounts created before verification existed are grandfathered in as verified
(so they aren't forced to verify on next login). Run once after deploy:

```bash
cd backend && npm run migrate:verify-existing
```

It only touches documents missing the `emailVerified` field — new unverified
signups are unaffected.

## GitHub OAuth

1. Create an OAuth App at <https://github.com/settings/developers>.
2. **Authorization callback URL**: `<FRONTEND_URL>/auth/github/callback`.
3. Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (backend) and
   `NEXT_PUBLIC_GITHUB_CLIENT_ID` (frontend).

Flow: the button redirects to GitHub (`scope=read:user user:email`) with a CSRF
`state`; the `/auth/github/callback` page posts the returned `code` to
`POST /api/auth/github`, which exchanges it for a token, reads the primary
**verified** email, links/creates the user, and returns a JWT.

---

## API summary (`/api/auth`)

| Method | Path             | Auth | Purpose                              |
|--------|------------------|------|--------------------------------------|
| POST   | `/register`      | —    | Create account, send email OTP       |
| POST   | `/login`         | —    | Password login (gates unverified)    |
| POST   | `/verify-email`  | —    | Verify OTP → issue JWT               |
| POST   | `/resend-otp`    | —    | Re-send email OTP (cooldown)         |
| POST   | `/google`        | —    | Google sign-in                       |
| POST   | `/github`        | —    | GitHub sign-in (code exchange)       |
| POST   | `/phone/request` | JWT  | Start phone verification             |
| POST   | `/phone/verify`  | JWT  | Confirm phone OTP                    |
