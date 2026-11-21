# WARERENT — Authentication Security Audit & Hardening Report

**Date:** 2026-11-21
**Role:** Principal Application Security Engineer
**Scope:** End-to-end security audit and hardening of WARERENT Provider Authentication (**Google OAuth 2.0 / Google Identity Services** + **Resend Email OTP**), Account Linking, Session Lifecycle, Admin Isolation, and Production Environment Controls.

---

## 1. Architecture Reviewed

| Layer | Component / Module | Responsibilities Audited |
|---|---|---|
| **Frontend (React + Vite)** | `frontend/src/pages/partners/BecomePartnerPage.jsx` | Dual authentication UI (`Continue with Google` + `Continue with Email OTP`), Google Identity Services (`https://accounts.google.com/gsi/client`) loader, server-issued single-use nonce lifecycle, OTP countdown/cooldown state, dashboard redirect. |
| **Frontend API Client** | `frontend/src/services/api.js`, `frontend/src/services/leadService.js` | In-memory Bearer token storage (never `localStorage`), `credentials: 'include'` cookie transport, `X-Requested-With: XMLHttpRequest` CSRF header injection, `getGoogleNonce()` & `googleLogin()`. |
| **Frontend Edge Headers** | Render Static Site Headers & `frontend/vercel.json` | Content-Security-Policy (`script-src`, `style-src`, `frame-src`, `connect-src`, `frame-ancestors`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` (Note: `vercel.json` applies only to Vercel; Render Static Sites require custom headers configured in Render Dashboard → Static Site → Headers). |
| **Backend Auth Routes** | `backend/src/routes/providerAuthRoutes.js` | Per-IP and per-email rate limiters (`otpRequestIpLimiter`, `otpRequestEmailLimiter`, `otpVerifyLimiter`, `providerSessionLimiter`, `googleNonceLimiter`, `googleAuthLimiter`), strict JSON-only + Origin/Referer login-CSRF guard (`enforceJsonAuthCsrf`), `requireProvider` & `requireActiveProvider` guards. |
| **Backend Auth Controller** | `backend/src/controllers/providerAuthController.js` | `requestOtp`, `verifyOtp`, `registerProvider`, `issueGoogleNonce`, `googleAuthProvider`, `getProviderMe`, `updateProviderProfile`, `logoutProvider`. |
| **Google Auth Service** | `backend/src/services/googleAuthService.js` | Official `google-auth-library` (`OAuth2Client.verifyIdToken`) signature verification, issuer/audience/expiry/`sub`/`email_verified` validation, mandatory server-issued nonce verification and atomic single-use consumption. |
| **Email OTP Service** | `backend/src/services/resendEmailService.js` | Official `resend` SDK integration, fail-closed startup/runtime behavior, 8s `AbortController` timeout, email-redacted upstream error logging, `WARERENT` HTML/plain-text templates. |
| **Data Models** | `backend/src/models/ProviderAccount.js`, `OtpChallenge.js`, `GoogleAuthNonce.js`, `Admin.js` | SHA-256 session token hashes, HMAC-SHA256 OTP hashes, SHA-256 nonce + attempt hashes, TTL indexes, partial unique indexes on `{ phone: 1 }`, `{ email: 1 }`, and `{ googleId: 1 }`. |
| **Auth & Security Middleware** | `backend/src/middleware/auth.js`, `security.js`, `validate.js`, `errorHandler.js` | Provider vs. Admin session isolation, cookie-mutation CSRF validation, NoSQL operator sanitization, strict DTO mass-assignment protection. |
| **Environment Validation** | `backend/src/config/env.js` | Fail-closed production startup validation (`validateEnv`), `GOOGLE_CLIENT_ID` format validation, secret redaction. |

---

## 2. Security Vulnerabilities Discovered & Remediated

| ID | Vulnerability Description | Severity | Status |
|---|---|---|---|
| **VULN-01** | **Client-Generated / Optional Nonce Allowed Google ID Token Replay:** The initial Google Sign-In flow generated its nonce in browser JavaScript (`generateOAuthNonce()`) and treated `nonce` as optional on `POST /api/v1/provider-auth/google`. Because a client-supplied nonce was not issued or tracked server-side, a captured Google ID token could be replayed within its ~1-hour JWT lifetime by re-sending the token's own `nonce` claim (or omitting `nonce`). | **High** | **FIXED** |
| **VULN-02** | **Production Content-Security-Policy Must Explicitly Permit Google Identity Services (`accounts.google.com/gsi/`):** `backend/src/app.js` (Helmet CSP) and `frontend/vercel.json` restricted `script-src` to `'self'` and omitted `frame-src`. Additionally, if the frontend is hosted on a **Render Static Site**, `vercel.json` is ignored by Render, so CSP headers must be configured directly in Render Static Site Headers. | **High** | **FIXED (Code) / MANUAL RENDER HEADER CONFIG REQUIRED** |
| **VULN-03** | **Concurrent Account-Linking Race Window on Unlinked Email-OTP Accounts:** Linking `googleId` to an existing `ProviderAccount` used a read-modify-write (`account.save()`) pattern rather than an atomic conditional update verifying that `googleId` had not been linked concurrently by another request. | **Medium** | **FIXED** |
| **VULN-04** | **Suspended Providers Could Still Call `PUT /api/v1/provider-auth/profile`:** While listing creation and edits enforced `requireActiveProvider`, the profile update route (`PUT /api/v1/provider-auth/profile`) only checked `requireProvider`, allowing a `SUSPENDED` account to mutate profile fields. | **Medium** | **FIXED** |
| **VULN-05** | **CSRF Defense-in-Depth (`Origin`/`Referer` Validation & JSON-Only Auth Endpoints):** Rejecting simple form content types alone is insufficient for complete CSRF defense. Cookie-authenticated state-changing requests (`isSafeCookieMutation` in `auth.js`) and unauthenticated auth POST endpoints (`enforceJsonAuthCsrf` in `providerAuthRoutes.js`) needed explicit `Origin`/`Referer` validation against the `CORS_ORIGIN` allowlist plus strict `application/json` enforcement on auth POST endpoints. | **Medium** | **FIXED** |
| **VULN-06** | **Upstream Resend Error Message Could Embed Account Owner Email in Server Logs:** When Resend rejected a sandbox send (`403 validation_error`), Resend's error string included the Resend account owner's email address in parentheses. | **Low** | **FIXED** |
| **VULN-07** | **Permissive `GOOGLE_CLIENT_ID` Format Check & Cached Env Fallback:** `validateEnv` accepted any non-placeholder string without whitespace for `GOOGLE_CLIENT_ID`, and `googleAuthService` fell back to startup-cached `env.google.clientId` even when `process.env.GOOGLE_CLIENT_ID` was explicitly cleared at runtime. | **Low** | **FIXED** |

---

## 3. Exact Files Modified / Created

1. `backend/src/models/GoogleAuthNonce.js` *(new)* — Mongoose model storing SHA-256 `nonceHash`, SHA-256 `attemptHash`, `expiresAt` (10-minute TTL + 1-hour MongoDB TTL purge index), and `consumedAt`.
2. `backend/src/services/googleAuthService.js` — Enforced mandatory server-issued nonce verification, atomic single-use `consumeNonce()`, cached `OAuth2Client` per client ID, strict `GOOGLE_CLIENT_ID_REGEX` (`^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$`), and constant-time nonce comparison (`crypto.timingSafeEqual`).
3. `backend/src/controllers/providerAuthController.js` — Added `issueGoogleNonce` (`POST /api/v1/provider-auth/google/nonce`), enforced mandatory `nonce` + `attemptToken` and atomic `consumeNonce()` in `googleAuthProvider`, and added atomic conditional `googleId` linking (`ProviderAccount.findOneAndUpdate`).
4. `backend/src/routes/providerAuthRoutes.js` — Added `POST /google/nonce` with `googleNonceLimiter`, `POST /google` with `googleAuthLimiter`, `rejectSimpleFormCsrf` middleware on all auth POST routes, and `requireActiveProvider` on `PUT /profile`.
5. `backend/src/models/ProviderAccount.js` — Added `googleId` (with partial unique index `{ googleId: 1 }`) and `authProvider` (`'EMAIL_OTP' | 'GOOGLE' | 'BOTH'`).
6. `backend/src/services/resendEmailService.js` — Updated OTP email subject, HTML, and plain-text templates to `WARERENT` branding and redacted email addresses from upstream Resend error logs.
7. `backend/src/config/env.js` — Added `env.google.clientId` and strict OAuth 2.0 Web Client ID format validation in `validateEnv()`.
8. `backend/.env.example` & `frontend/.env.example` — Documented `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.
9. `frontend/src/services/leadService.js` — Added `getGoogleNonce()` and updated `googleLogin({ idToken, nonce, attemptToken, phone })`.
10. `frontend/src/pages/partners/BecomePartnerPage.jsx` — Integrated server-issued single-use nonce retrieval before GIS initialization and after every sign-in attempt or logout.
11. `frontend/vercel.json` — Updated Content-Security-Policy to allow `https://accounts.google.com/gsi/client` (`script-src`), `https://accounts.google.com/gsi/style` (`style-src`), and `https://accounts.google.com/gsi/` (`frame-src`).
12. `backend/test-mvp-complete.js` — Added comprehensive automated security tests (`F.1` through `F.9`).

---

## 4. Requirement Classification Matrix (`PASS` / `FAIL` / `NOT VERIFIED`)

| Security Requirement | Classification | Evidence / Notes |
|---|---|---|
| **Google ID Token Cryptographic Verification (`OAuth2Client`)** | **PASS** | Verified via `google-auth-library` `OAuth2Client.verifyIdToken` + test `F.3`. |
| **Issuer, Audience, Expiry, `sub`, and `email_verified === true` Checks** | **PASS** | Enforced in `googleAuthService.verifyIdToken` + tests `F.3` & `F.4`. |
| **Mandatory Server-Issued Single-Use Nonce & Replay Protection** | **PASS** | Enforced via `GoogleAuthNonce` (`issueNonce` + `consumeNonce`) + tests `F.3` & `F.8` (sequential & 5-way concurrent replay). |
| **Untrusted Frontend Body Fields Ignored (`email`, `phoneVerified`, `role`, `status`)** | **PASS** | Verified in `googleAuthProvider` + tests `F.5` & `F.7`. |
| **Safe Account Linking & Duplicate Account Prevention** | **PASS** | Atomic conditional link + partial unique indexes on `email` and `googleId` + test `F.6`. |
| **Suspended Provider Restrictions Preserved Across Google Sign-In** | **PASS** | Status remains `SUSPENDED`; listing submission and profile mutation return `403` + test `F.7`. |
| **No False Mobile Verification (`phoneVerified === false`)** | **PASS** | Verified across both Email OTP (`A.2`) and Google Sign-In (`F.5`, `F.6`). |
| **Provider Session Lifecycle (CSPRNG, SHA-256 Hash, HttpOnly Cookie, Rotation, Logout)** | **PASS** | Verified in `providerAuthController.js`, `auth.js`, and test `F.9`. |
| **CSRF Protection on Cookie-Authenticated & Auth Endpoints** | **PASS** | Enforced via `isSafeCookieMutation` (`D.10`) and `rejectSimpleFormCsrf` (`F.9`). |
| **Email OTP Security Controls (6-Digit CSPRNG, HMAC-SHA256, 5-Min TTL, 5-Attempt Lockout, 60s Cooldown)** | **PASS** | Verified in `A.1–A.6`, `D.5`, `D.9`, and Phase-1 `3.2`. |
| **Admin vs. Provider Authentication Isolation** | **PASS** | Separate `Admin` vs. `ProviderAccount` models and token hashes; verified in `F.9` and Phase-1 `5.1–5.7`. |
| **No Backend Secrets Exposed in Frontend Build or Logs** | **PASS** | Verified via production Vite build inspection and `test:phase1` `1.1–1.9`. |
| **Live End-to-End Google OAuth Flow Against Deployed Google Cloud Console Client ID** | **NOT VERIFIED** | Requires live browser sign-in against the deployed Vercel + Render URLs once authorized JavaScript origins are saved in Google Cloud Console. |
| **Live Production Resend Email Delivery to External Domains** | **NOT VERIFIED** | Requires a verified custom sender domain in Resend Dashboard (`https://resend.com/domains`) if `RESEND_FROM_EMAIL` currently uses `onboarding@resend.dev`. |

---

## 5. Automated Security Test & Build Results

- **Phase-1 Security & Reliability Test Suite (`npm run test:phase1`):** **25 passed, 0 failed**
  - Covers environment validation, no hardcoded credentials, DB disconnect fail-closed (`503`), proxy-aware rate limiters, mass-assignment prevention, Bearer-only admin auth, and no demo fallback.
- **Complete MVP & Authentication Security Test Suite (`npm run test:mvp`):** **32 passed, 0 failed**
  - `F.1`: WARERENT branding in OTP email subject, HTML, and plain text.
  - `F.2`: Missing `GOOGLE_CLIENT_ID` fails closed (`503`) on `/google/nonce` and `/google` without affecting Email OTP.
  - `F.3`: Rejects missing nonce (`400`), malformed JWT (`400`), invalid signature (`401`), wrong audience (`401`), wrong issuer (`401`), expired token (`401`), mismatched nonce (`401`), and unissued client-forged nonce (`401`).
  - `F.4`: Rejects `email_verified !== true` (`403`) with zero account creation.
  - `F.5`: Creates new provider account via Google, sets `HttpOnly` cookie, ignores spoofed `email`/`phoneVerified`/`role`, and keeps `phoneVerified: false`.
  - `F.6`: Safely links existing Email-OTP provider account without overwriting `name`/`phone`/`status`, prevents duplicates, and rejects conflicting Google `sub` claims (`409`).
  - `F.7`: Preserves `SUSPENDED` account status on Google sign-in and blocks listing submission (`403`) and profile updates (`403`).
  - `F.8`: Blocks expired server nonces (`401`), concurrent 5-way replay attacks (strictly 1 succeeds `200`, 4 fail `401`), and sequential replay (`401`).
  - `F.9`: Enforces simple-form login-CSRF rejection (`403`), session rotation invalidating prior token (`401`), admin endpoint isolation (`401`), and server-side logout invalidation (`401`).
- **Frontend Production Build (`cd frontend && npm run build`):** **PASS** (`2154 modules transformed`, `0` errors).

---

## 6. Remaining Risks & Architectural Limitations

1. **In-Memory Rate Limiter State on Single-Instance Render:** `express-rate-limit` stores counters in process memory (while OTP challenges and Google nonces are persisted in MongoDB). If the backend scales horizontally to multiple Render instances in the future, rate-limit counters should be backed by Redis or MongoDB.
2. **Pre-Linking Account Creation With Unverified Third-Party Domain:** If an attacker controls a Google account whose email matches a victim's non-Gmail address *before* the victim registers on WARERENT, Google's `email_verified: true` claim reflects Google's verification of that address on the Google account. Once an account is linked to a `googleId`, however, `ProviderAccount` permanently binds that immutable `googleId` and rejects any different `googleId` (`409`).
3. **Single Active Session Per Provider Account:** `ProviderAccount` stores a single `sessionTokenHash`. Signing in on a second device rotates `sessionTokenHash` and invalidates the previous device's session (verified in `F.9`). This is intentional for security simplicity, though multi-device concurrent sessions are not supported.
4. **Resend Sandbox Domain Limitation:** As diagnosed separately, if `RESEND_FROM_EMAIL` uses `onboarding@resend.dev`, Resend blocks (`403` → backend `502`) OTP emails to any recipient other than the Resend account owner until a custom domain is verified in Resend.

---

## 7. Production Deployment Checklist (Render Static Site + Render Backend)

- [ ] **Google Cloud Console:** Verify the OAuth 2.0 Web Client ID has **Authorized JavaScript Origins** configured for the production Render Static Site origin (and any custom domain, e.g., `https://warerent.in` / `https://wareshop.in`) plus `http://localhost:3000` and `http://localhost:5173` for local development.
- [ ] **Render Backend Service Environment Variables:** Confirm `NODE_ENV=production`, `GOOGLE_CLIENT_ID`, `OTP_HMAC_SECRET` (32+ chars), `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (using a Resend-verified sender domain), `MONGODB_URI`, `MONGODB_DB_NAME`, `CORS_ORIGIN` (set to the exact frontend origin, no trailing slash, no `*`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `STORAGE_PROVIDER=cloudinary` (with Cloudinary credentials) are set.
- [ ] **Render Frontend Static Site Environment Variables:** Confirm `VITE_API_BASE_URL` (ending in `/api/v1`) and `VITE_GOOGLE_CLIENT_ID` (exact same Client ID as backend `GOOGLE_CLIENT_ID`) are set, then trigger a **Clear build cache & deploy** on Render Static Site so Vite embeds them at build time.
- [ ] **Render Frontend Static Site Custom HTTP Headers (`vercel.json` does NOT apply to Render):** In **Render Dashboard → Static Site → Headers**, configure for path `/*`:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com https://*.googleusercontent.com https://*.gstatic.com; frame-src 'self' https://accounts.google.com/gsi/ https://accounts.google.com; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  - `Cross-Origin-Opener-Policy`: `same-origin-allow-popups` *(must NEVER be `same-origin`, which severs `window.opener.postMessage` from the Google Sign-In popup)*
  - `X-Frame-Options`: `DENY`
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
- [ ] **MongoDB Indexes:** Verify `provideraccounts` indexes (`phone_1` with `partialFilterExpression`, `email_1`, `googleId_1`) and `googleauthnonces` indexes (`nonceHash_1`, `expiresAt_1`) are built cleanly. If a legacy non-partial `phone_1` index exists in production MongoDB, drop `phone_1` (`db.provideraccounts.dropIndex("phone_1")`) and restart the backend so Mongoose creates the partial unique `phone_1` index.
- [ ] **Live Smoke Test:** Perform one real Google Sign-In and one real Email OTP sign-in on production before final sign-off.
