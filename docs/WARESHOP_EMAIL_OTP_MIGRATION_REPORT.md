# WARESHOP — Production-Grade Email OTP Migration Report

**Date:** November 18, 2026  
**Scope:** Controlled verification-channel migration from Fast2SMS WhatsApp OTP (and retired 2Factor SMS compatibility shim) to Email OTP using the official **Resend** Node.js SDK (`resend`).  
**Architecture Policy:** Minimal-change migration preserving all existing application behavior, provider session/cookie architecture, admin authentication, listing lifecycle, customer search, and protected contact reveal rules.

---

## 1. Original Architecture and Migration Approach

### Original Architecture
- **OTP Channel:** Provider authentication (`/api/v1/provider-auth/*`) previously verified 10-digit Indian mobile numbers via Fast2SMS WhatsApp OTP (`backend/src/services/fast2smsService.js`, with a legacy compatibility shim `backend/src/services/twoFactorService.js`).
- **Challenge Persistence:** `OtpChallenge` stored an HMAC-SHA256 OTP hash bound to `phone`, enforced a 60-second cooldown, 5-minute TTL, 5 max verification attempts, and issued a single-use 64-character hex `verificationToken` consumed atomically during `/register` or `/login`.
- **Provider Identity:** `ProviderAccount` keyed accounts strictly on `phone` (`required: true, unique: true`) with `verifiedAt`, and used `wareshop_provider_session` HttpOnly cookies / Bearer tokens with SHA-256 `sessionTokenHash` in MongoDB.
- **Listing & Contact Flow:** Listing submission (`Lead`), publication (`Provider`), admin review, and `/api/v1/providers/:slug/contact` depended on `phone` / `contactNumber` being a 10-digit Indian mobile number with `consentToDisplayPhone`.

### Migration Approach
- Replaced only the verification channel and identity binding from WhatsApp/SMS mobile OTP to **Email OTP via Resend**, while keeping all API routes, session/cookie mechanics, admin auth, listing approval/publish workflow, and customer contact-reveal rules intact.
- Separated **email verification** (`emailVerified`, `emailVerifiedAt`) from **mobile verification** (`phoneVerified`, `phoneVerifiedAt`) so Email OTP never falsely marks a mobile number as verified and never stores email addresses in `phone` fields.
- Preserved the business mobile number input in the provider portal so commercial listings still collect and display valid 10-digit Indian mobile numbers according to `consentToDisplayPhone` rules.

---

## 2. Files Modified and Reasons

| File | Reason |
| :--- | :--- |
| `backend/package.json` & `backend/package-lock.json` | Installed official `resend` (`^6.38.1`) Node.js SDK dependency. |
| `backend/src/config/env.js` | Replaced obsolete `fast2sms` and `twoFactor` configuration blocks with `resend` (`apiKey`, `fromEmail`, `replyTo`) and updated OTP rate-control settings (`maxPerEmailPerDay`, `maxPerIpPerHour`, `maxGlobalPerHour`, `cooldownMs`, `expiryMs`, `maxAttempts`). |
| `backend/.env.example` | Documented `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, and `OTP_MAX_PER_EMAIL_DAY` / `OTP_MAX_PER_IP_HOUR`; removed obsolete Fast2SMS/2Factor variables (including removing the sample Fast2SMS key). |
| `backend/src/models/OtpChallenge.js` | Added `channel` (`EMAIL` default) and `email` fields with `{ email: 1, createdAt: -1 }` and `{ requestIp: 1, sentAt: -1 }` indexes; kept `phone` optional and semantically unchanged for historical records. |
| `backend/src/models/ProviderAccount.js` | Added `emailVerified`, `emailVerifiedAt`, `phoneVerified`, and `phoneVerifiedAt`; made `phone` optional (`default: undefined`) with a partial unique index for non-empty phones; added partial unique index on `{ email: 1 }` scoped to `emailVerified: true`. |
| `backend/src/controllers/providerAuthController.js` | Migrated `requestOtp`, `verifyOtp`, `registerProvider`, `updateProviderProfile`, and `formatProviderAccountDto` to Email OTP using `resendEmailService`, domain-separated HMAC (`email:<email>:<otp>`), atomic single-use challenge/token consumption, IP/email/global limits, and strict separation of `emailVerified` vs `phoneVerified`. |
| `backend/src/routes/providerAuthRoutes.js` | Updated Express rate-limiter keys from phone to normalized email (`otpRequestEmailLimiter`, `otpVerifyLimiter`, `providerSessionLimiter`) while retaining `otpRequestIpLimiter` and test-suite isolation headers. |
| `backend/src/middleware/auth.js` | Updated unauthenticated provider error copy from mobile OTP to email OTP. |
| `backend/src/middleware/validate.js` | Enforced strict phone lock only when `req.providerAccount.phoneVerified` is true; otherwise validated `phone` as a 10-digit Indian mobile number and defaulted listing `email` to `req.providerAccount.email`. |
| `backend/src/controllers/leadController.js` | Enforced `account.phoneVerified` lock check, stored `resolvedPhone` on listing applications, and populated `account.phone` only if empty (without setting `phoneVerified`). |
| `backend/src/controllers/providerPortalController.js` | Included `emailVerified`, `emailVerifiedAt`, `phoneVerified`, and null-safe `phoneMasked` in `/provider-portal/dashboard`; preserved `resolvedPhone` on `updateOwnListing`. |
| `backend/src/controllers/adminProviderController.js` | Included `emailVerified`, `emailVerifiedAt`, and `phoneVerified` in `ProviderAccount` projections; enforced `contactNumber` lock only when `ownerAccount.phoneVerified` is true. |
| `backend/test-phase1-security.js` | Updated OTP rate-limiter test (`3.2`) to validate IP + email limiter isolation and added `OtpChallenge.updateMany` stub. |
| `backend/test-mvp-complete.js` | Replaced Fast2SMS/2Factor fetch stubs with Resend API (`api.resend.com/emails`) interception, asserted zero Fast2SMS/2Factor calls, updated provider auth/IDOR/brute-force tests for Email OTP, and added tests for concurrent verification races, expired OTP rejection, delivery failures, missing `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, unauthorized registration, and `phoneVerified === false` enforcement. |
| `frontend/src/services/leadService.js` | Updated `sendOtp(email)`, `verifyOtp(email, otp)`, and `registerOrLogin({ email, verificationToken, phone, name })`. |
| `frontend/src/pages/partners/BecomePartnerPage.jsx` | Replaced WhatsApp OTP card with Email OTP verification UI supporting all 9 required states (email entry, OTP sending, OTP sent, verification in progress, incorrect OTP, expired OTP countdown, 60s resend cooldown, `"Email Verified"` success state, and delivery/API failure), while preserving the business mobile number input and accurate non-fabricated badges. |
| `frontend/src/components/marketplace/HowItWorks.jsx` | Updated trust copy from WhatsApp OTP / mobile OTP to Email OTP-verified accounts. |
| `frontend/src/layouts/Navbar.jsx` | Updated top-bar trust badge from `"WhatsApp OTP Verified Owners"` to `"Email OTP Verified Owners"`. |
| `frontend/src/pages/home/HomePage.jsx` | Updated hero trust pill, feature card, and owner CTA copy to reflect Email OTP. |
| `frontend/src/pages/about/AboutPage.jsx` | Updated login feature copy to `"Fast Email OTP Login"`. |
| `frontend/src/pages/legal/PrivacyPolicyPage.jsx` | Updated Section 2 and Section 5 processor disclosure from Fast2SMS WhatsApp API to Resend Email API. |
| `frontend/src/pages/legal/TermsPage.jsx` | Updated provider registration terms to Email OTP + accurate business mobile number. |
| `frontend/src/pages/providers/ProviderProfilePage.jsx` | Updated owner contact labels and trust checklist so mobile numbers are never falsely labeled OTP-verified after email verification. |
| `frontend/src/pages/admin/AdminApplicationDetailPage.jsx` | Displayed `"Business Mobile Number"` (or `"OTP-Verified Phone"` only when `phoneVerified` is true) and `"Email Verified"` indicator when `emailVerified` is true. |
| `frontend/src/pages/admin/AdminProviderEditPage.jsx` | Displayed `"Business Mobile Number"` and enforced `readOnly` lock only when `providerAccount.phoneVerified` is true. |

---

## 3. Files Added and Reasons

| File | Reason |
| :--- | :--- |
| `backend/src/services/resendEmailService.js` | Dedicated Resend email delivery adapter using the official `Resend` SDK (`resend.emails.send`), 8-second `AbortController` timeout, strict fail-closed config checks (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), clean HTML/text OTP email template, and safe error normalization without logging OTPs or credentials. |
| `backend/src/utils/validation.js` | Shared email normalization/validation/masking (`normalizeEmail`, `isValidEmail`, `maskEmail`) and Indian mobile normalization/validation (`normalizeIndianPhone`, `isValidIndianMobile`) used across controllers, routes, and services. |
| `docs/WARESHOP_EMAIL_OTP_MIGRATION_REPORT.md` | This migration audit and engineering report. |

---

## 4. Files Removed and Dependency Evidence

| Removed File | Dependency Verification Evidence |
| :--- | :--- |
| `backend/src/services/fast2smsService.js` | Previously untracked adapter for Fast2SMS WhatsApp OTP. Repo-wide `git grep --untracked` across runtime, tests, scripts, and frontend confirmed zero remaining imports after migrating `providerAuthController.js`, `providerAuthRoutes.js`, and `validation.js`. |
| `backend/src/services/twoFactorService.js` | Legacy 2Factor SMS compatibility shim that only re-exported `fast2smsService.js`. Repo-wide `git grep` across runtime, tests, scripts, and configuration confirmed zero remaining consumers (`sendOtpSms` / `twoFactorService` had 0 imports anywhere in the repository). |

---

## 5. Database / Schema Changes and Migration Implications

### Changes Made (Smallest Backward-Compatible Additions)
1. **`OtpChallenge` (`backend/src/models/OtpChallenge.js`)**
   - Added `channel` (`'EMAIL' | 'WHATSAPP' | 'SMS'`, default `'EMAIL'`) and `email` (trimmed, lowercase, max 254).
   - Removed `required: true` from `phone` (`default: undefined`) so email challenges never write to `phone`, while preserving historical phone challenge documents.
   - Added indexes: `{ email: 1, createdAt: -1 }` and `{ requestIp: 1, sentAt: -1 }`.
2. **`ProviderAccount` (`backend/src/models/ProviderAccount.js`)**
   - Added `emailVerified` (`Boolean`, default `false`), `emailVerifiedAt` (`Date`, default `null`), `phoneVerified` (`Boolean`, default `false`), and `phoneVerifiedAt` (`Date`, default `null`).
   - Changed `phone` to optional (`default: undefined`) with partial unique index `{ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string', $gt: '' } } }`.
   - Added partial unique index `{ email: 1 }, { unique: true, partialFilterExpression: { emailVerified: true } }` so existing legacy documents with `email: ''` or unverified emails never collide.
   - Changed `verifiedAt` from `required: true` to `default: null`.

### Migration Implications for Existing Production MongoDB Collections
- **No destructive migrations required.** All existing `ProviderAccount`, `Lead`, `Provider`, and `OtpChallenge` records remain valid and readable.
- **Important Index Note for Existing Databases:** If the production `provideraccounts` collection already has a legacy non-sparse unique index named `phone_1` (`{ phone: 1 }, { unique: true }`), MongoDB will reject creating a second account where `phone` is omitted (`null`/missing) unless `phone_1` is replaced with the partial unique index `{ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string', $gt: '' } } }`. Before deploying to an existing database that previously created `phone_1`, run a non-destructive index replacement (`db.provideraccounts.dropIndex("phone_1")` followed by `ProviderAccount.syncIndexes()`).

---

## 6. Resend API Integration Details

- **SDK:** Official `resend` (`^6.38.1`) package (`import { Resend } from 'resend'`).
- **Method:** `resend.emails.send(payload, { signal: controller.signal })` targeting `https://api.resend.com/emails`.
- **Payload:**
  - `from`: `RESEND_FROM_EMAIL` (verified sender address/domain in Resend).
  - `to`: `[normalizedEmail]`.
  - `subject`: `'Your WARESHOP Verification Code'`.
  - `text` & `html`: Transactional 6-digit OTP email stating 5-minute expiration and single-use notice.
  - `replyTo`: Optional `RESEND_REPLY_TO` when configured.
- **Timeout & Fail-Closed Handling:**
  - 8-second `AbortController` timeout (`504 Email OTP provider timed out`).
  - Missing `RESEND_API_KEY` or `RESEND_FROM_EMAIL` (or placeholder `<...>`) immediately fails closed with `503 Email OTP delivery is not configured` and marks the `OtpChallenge` as `FAILED`.
  - Non-2xx / Resend `error` response fails closed with `502 Unable to send OTP via email service at this time` and marks `OtpChallenge` as `FAILED`.

---

## 7. Security Controls Preserved

- **Cryptographic OTP Generation:** `crypto.randomInt(100000, 1000000)` on the backend.
- **No Plaintext OTP Persistence:** Only `HMAC-SHA256(OTP_HMAC_SECRET, "email:" + email + ":" + otp)` is persisted in `OtpChallenge.otpHash`.
- **Constant-Time Comparison:** `crypto.timingSafeEqual` on equal-length hex buffers.
- **Challenge Lifecycle & Limits:**
  - 5-minute OTP expiry (`OTP_EXPIRY_MS` / `OTP_TTL_MINUTES`).
  - Maximum 5 verification attempts (`OTP_MAX_ATTEMPTS`) via atomic `findOneAndUpdate` increment.
  - 60-second resend cooldown (`OTP_COOLDOWN_MS` / `OTP_COOLDOWN_SECONDS`) + in-flight mutex per email + `Retry-After` response header.
  - Daily per-email cap (`OTP_MAX_PER_EMAIL_DAY = 5`), per-IP hourly cap (`OTP_MAX_PER_IP_HOUR = 20`), global hourly cap (`OTP_MAX_GLOBAL_HOUR = 200`), plus Express route rate limiters (`10/15m` IP, `5/15m` email, `25/15m` verify, `20/15m` register/login).
- **Replay & Concurrency Protection:**
  - Issuing a new OTP supersedes prior unverified `SENT` challenges for that email.
  - Atomic `findOneAndUpdate` on `verifiedAt: null` guarantees at most one concurrent verification succeeds.
  - Single-use 64-char hex `verificationToken` stored as SHA-256 `authorizationHash`, bound to `email`, and consumed atomically (`consumedAt: null` -> `Date`) during `/register` or `/login`.
- **Zero Account Enumeration:** `/otp/request` and `/otp/send` behave identically for new and returning emails and return masked email only.
- **Identity Separation:** Email OTP sets `emailVerified: true` and keeps `phoneVerified: false`.
- **Existing Sessions & Auth Untouched:** `wareshop_provider_session` HttpOnly cookie, Bearer token fallback, CSRF `X-Requested-With`/JSON checks, and Bearer-only admin authentication are preserved unchanged.

---

## 8. Test Results and Build Results

### Baseline (Pre-Migration)
- `backend/test-phase1-security.js`: **23 passed, 0 failed**
- `backend/test-mvp-complete.js`: **22 passed, 0 failed**

### Final Verification (Post-Migration)
- **Backend Syntax Check (`node --check` on all `backend/src/**/*.js`):** Passed (`exit 0`).
- **Backend Test Suite (`npm test --prefix backend`):**
  - `test-phase1-security.js`: **23 passed, 0 failed** (including IP + email OTP rate-limiter isolation, env validation, DB fail-fast 503, mass-assignment prevention, Bearer-only admin auth, and public listing integrity).
  - `test-mvp-complete.js`: **22 passed, 0 failed** (including Resend Email OTP delivery with mocked `api.resend.com/emails`, zero Fast2SMS/2Factor calls, 60s cooldown + `Retry-After`, incorrect/expired OTP rejection, concurrent verification race protection, replay prevention, unauthorized registration rejection, brute-force lockout after 5 attempts, missing `RESEND_API_KEY`/`RESEND_FROM_EMAIL` fail-closed 503, Resend 502 failure without verification bypass, `emailVerified: true` / `phoneVerified: false` enforcement, listing lifecycle, IDOR, admin approval/publish/suspend, customer search, and protected contact reveal).
- **Frontend Production Build (`npm run build --prefix frontend`):** Passed (`✓ 2154 modules transformed`, built in `3.49s` with 0 errors).
- **Environment Validation Check (`buildEnv` + `validateEnv`):** Passed (`validateEnv: true`).
- **Dead-Code Audit:** Confirmed 0 remaining runtime/frontend references to `fast2sms`, `twoFactorService`, or WhatsApp OTP.

*Note: All automated tests used isolated in-memory Mongoose stubs and mocked Resend HTTP responses (`globalThis.fetch` interception); live production email delivery was not executed during automated tests.*

---

## 9. Environment Variables Required

### Required New Variables (Backend Only)
| Variable | Required in Production | Example | Purpose |
| :--- | :--- | :--- | :--- |
| `RESEND_API_KEY` | **Yes** | `re_xxxxxxxxx` | Resend API key from the Resend Dashboard. Backend-only. |
| `RESEND_FROM_EMAIL` | **Yes** | `WARESHOP <no-reply@wareshop.in>` | Verified sender identity/domain in Resend. |
| `RESEND_REPLY_TO` | No | `support@wareshop.in` | Optional reply-to address for OTP emails. |

### Updated / Preserved OTP Variables
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `OTP_HMAC_SECRET` | *(derived/required in prod)* | Secret for HMAC-SHA256 OTP hashing. |
| `OTP_TTL_MINUTES` / `OTP_EXPIRY_MS` | `5` / `300000` | 5-minute OTP validity window. |
| `OTP_COOLDOWN_SECONDS` / `OTP_COOLDOWN_MS` | `60` / `60000` | 60-second resend cooldown per email. |
| `OTP_MAX_ATTEMPTS` | `5` | Max verification attempts per challenge. |
| `OTP_MAX_PER_EMAIL_DAY` | `5` | Daily OTP cap per email address. |
| `OTP_MAX_PER_IP_HOUR` | `20` | Hourly OTP cap per IP address. |
| `OTP_GLOBAL_HOURLY_MAX` / `OTP_MAX_GLOBAL_HOUR` | `200` | Global hourly OTP circuit breaker. |

### Retired Variables (Safe to Remove from Hosting Dashboard After Cutover)
- `FAST2SMS_API_KEY`, `FAST2SMS_PHONE_NUMBER_ID`, `FAST2SMS_MESSAGE_ID`, `FAST2SMS_BASE_URL`
- `TWOFACTOR_API_KEY`, `TWOFACTOR_BASE_URL`, `TWOFACTOR_OTP_TEMPLATE`

---

## 10. Production Onboarding Instructions

1. **Create / Verify Domain in Resend:**
   - Log in to [Resend](https://resend.com) and add your sending domain (e.g., `wareshop.in`).
   - Add the SPF, DKIM, and optional DMARC DNS records provided by Resend and wait for **Verified** status.
2. **Generate Production API Key:**
   - Create a scoped sending API key in Resend with permission to send emails for your verified domain.
3. **Configure Backend Environment Variables (e.g. Render Dashboard):**
   - Set `RESEND_API_KEY=<live-key>`.
   - Set `RESEND_FROM_EMAIL=WARESHOP <no-reply@wareshop.in>` (using your verified domain).
   - Optionally set `RESEND_REPLY_TO=support@wareshop.in`.
   - Ensure `OTP_HMAC_SECRET` is set to a 32+ character random hex secret.
4. **Verify MongoDB Index Compatibility (If Upgrading Existing Production DB):**
   - Check indexes on `provideraccounts`. If a legacy non-sparse `phone_1` unique index exists, drop `phone_1` and run `ProviderAccount.syncIndexes()` so accounts registered via Email OTP without an initial phone number can coexist and the partial unique `email_1` / `phone_1` indexes are active.
5. **Smoke Test After Deploy:**
   - Open `/become-a-partner`, request an OTP to a real test mailbox, verify the 6-digit code, confirm `"Email Verified"` status, submit a listing with a 10-digit business mobile number, and verify admin review & customer contact reveal work end-to-end.

---

## 11. Remaining Limitations and Risks

- **Mocked Delivery in CI/Automated Tests:** Automated tests intercept `https://api.resend.com/emails` rather than hitting live Resend infrastructure; real deliverability (DNS/SPF/DKIM, inbox placement, and Resend account quota/rate limits) must be verified during staging/production smoke testing with a verified domain.
- **Unverified Business Mobile Numbers:** Because provider authentication now verifies email via Resend rather than mobile via WhatsApp/SMS, newly registered providers' `phoneVerified` remains `false`. Business mobile numbers are validated for 10-digit Indian mobile format (`^[6-9]\d{9}$`) and reviewed by WARESHOP administrators prior to listing publication, rather than being carrier-verified.
- **Historical Legacy Accounts:** Existing legacy accounts created solely via phone OTP (with `email: ''` and `emailVerified: false`) cannot log in via Email OTP until/unless an administrator or migration associates a verified email, because unverified legacy `email` strings are intentionally not trusted for Email OTP account matching to prevent account takeover.
