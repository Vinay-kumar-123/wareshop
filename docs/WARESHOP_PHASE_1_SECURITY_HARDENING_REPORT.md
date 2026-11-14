# WARESHOP — Phase 1: Critical Security & Backend Hardening Report

**Date:** 2026-11-14
**Source of Truth:** [WARESHOP_PHASE_0_FORENSIC_ARCHITECTURE_AUDIT.md](file:///d:/projects/wareshop/docs/WARESHOP_PHASE_0_FORENSIC_ARCHITECTURE_AUDIT.md)
**Automated Verification Harness:** [test-phase1-security.js](file:///d:/projects/wareshop/backend/test-phase1-security.js) (`npm run test:phase1`)
**Status:** Complete — All 23 Phase 1 Automated Security & Reliability Acceptance Tests Passing

---

## 1. Executive Summary

Phase 1 remediates the critical and high-severity credential, authentication, rate-limiting, mass-assignment, database-availability, and public data-integrity vulnerabilities identified in the Phase 0 forensic audit:

1. **Zero Hardcoded Credentials & Explicit Bootstrap (SEC-01, SEC-12, SEC-20):** All fallback administrator emails, passwords, and unused JWT secrets have been removed from runtime code and scripts. Production startup now enforces strict environment validation (`validateEnv`) and disables automatic Super Admin provisioning (`bootstrapAdmin` requires explicit CLI execution via `npm run bootstrap:admin`).
2. **Proxy-Aware Independent Rate Limiting & CORS Enforcement (SEC-02, SEC-16, SEC-18):** Configured Express `trust proxy` to `1` (Render's single load-balancer hop), isolated rate limiters per route, keyed OTP rate limiting by both client IP (`ipKeyGenerator(req.ip)`) and normalized 10-digit mobile number, recorded `req.ip` in audit logs, and rejected wildcard (`*`) CORS origins in production.
3. **Mass-Assignment Prevention via Allow-Listed DTOs (SEC-04, SEC-13, SEC-08):** Replaced `...req.body` spreading with strict allow-listed DTO construction and forbidden-field rejection on both partner application submission (`POST /api/v1/leads/partner`) and administrator listing updates (`PUT /api/v1/admin/providers/:id`), plus regex escaping and query parameter type validation on public search endpoints.
4. **Bearer-Only Admin Authentication & Hashed Session Storage (SEC-05, SEC-07):** Removed cookie-based admin session transport and `x-admin-token` fallbacks (`res.cookie`, `res.clearCookie`, `cookie-parser`, and `express.urlencoded` removed). Admin tokens are kept strictly in frontend memory (`AuthContext.jsx` + `api.js`), transmitted exclusively via `Authorization: Bearer <token>`, and stored in MongoDB only as a SHA-256 digest (`sessionTokenHash`).
5. **Database Reliability & Fail-Fast Readiness Probes (REL-01 through REL-07):** Disabled Mongoose command buffering globally (`mongoose.set('bufferCommands', false)`), enforced explicit database selection via `MONGODB_DB_NAME`, separated liveness (`/health/live`) from database readiness (`/health/ready`, `/health`), added fail-fast HTTP `503` middleware (`requireDatabaseReady`) for all database-dependent API routes, removed the in-memory `dev-inmem-*` lead fallback, and wired `disconnectDB()` into `SIGTERM`/`SIGINT` graceful shutdown.
6. **Elimination of Fake Public Listings (BL-09):** Removed all imports and runtime fallbacks to `frontend/src/data/providers.js` across `providerService.js` and public marketplace views. Public pages now render genuine API records only, with distinct loading, empty, and error states (`role="alert"` + retry action).

---

## 2. Findings Fixed with File References

| Phase 0 ID | Severity | Vulnerability / Finding | Remediation Implemented | File References |
|---|---|---|---|---|
| **SEC-01** | Critical | Hardcoded fallback `SUPER_ADMIN` email, password, and JWT secret auto-provisioned on server startup | Removed all credential defaults; added `buildEnv()`, `validateEnv()`, and `isStrongPassword()`; disabled automatic production bootstrap in `server.js` and `authService.bootstrapAdmin()`; required explicit CLI invocation via `bootstrapAdmin.js`; scrubbed `.env.example` and `.env.test.example` to placeholders only. | [env.js](file:///d:/projects/wareshop/backend/src/config/env.js#L25-L219), [server.js](file:///d:/projects/wareshop/backend/server.js#L13-L35), [authService.js](file:///d:/projects/wareshop/backend/src/services/authService.js#L16-L94), [bootstrapAdmin.js](file:///d:/projects/wareshop/backend/src/scripts/bootstrapAdmin.js#L1-L65), [.env.example](file:///d:/projects/wareshop/backend/.env.example), [.env.test.example](file:///d:/projects/wareshop/backend/.env.test.example), [AdminSettingsPage.jsx](file:///d:/projects/wareshop/frontend/src/pages/admin/AdminSettingsPage.jsx#L120-L140) |
| **SEC-02** | High | Rate limiting ineffective behind Render proxy (`trust proxy` unset) and OTP limiter keyed only by IP | Configured `app.set('trust proxy', env.trustProxy)` (defaults to `1`); isolated limiters for admin login, OTP request (`otpRequestIpLimiter` + `otpRequestPhoneLimiter`), OTP verify, provider registration, lead submission, and contact reveal using `ipKeyGenerator(req.ip)`. | [app.js](file:///d:/projects/wareshop/backend/src/app.js#L14-L16), [providerAuthRoutes.js](file:///d:/projects/wareshop/backend/src/routes/providerAuthRoutes.js#L16-L96), [adminRoutes.js](file:///d:/projects/wareshop/backend/src/routes/adminRoutes.js#L10-L30), [leadRoutes.js](file:///d:/projects/wareshop/backend/src/routes/leadRoutes.js#L10-L28), [providerRoutes.js](file:///d:/projects/wareshop/backend/src/routes/providerRoutes.js#L8-L42) |
| **SEC-04** | High | Mass assignment into `Lead` via `...req.body` and `...data` (including client-injected `shopImage`, `status`, `role`, `metadata`) | Implemented `FORBIDDEN_SERVER_FIELDS`, `PARTNER_ALLOWED_FIELDS`, and `buildPartnerLeadDto()` in `validate.js`; rejected any forbidden or unknown body properties with HTTP `400`; restricted `shopImage`, `status`, and `providerAccountId` to server-owned assignment in `leadController.js` and `leadService.js`. | [validate.js](file:///d:/projects/wareshop/backend/src/middleware/validate.js#L9-L215), [leadController.js](file:///d:/projects/wareshop/backend/src/controllers/leadController.js#L17-L100), [leadService.js](file:///d:/projects/wareshop/backend/src/services/leadService.js#L65-L105) |
| **SEC-05** | High | Cross-Site Request Forgery (CSRF) on cookie-authenticated admin endpoints | Removed cookie-based admin authentication (`res.cookie`, `res.clearCookie`) and `express.urlencoded` / `cookie-parser` middleware; enforced Bearer-only `Authorization: Bearer <64-hex-token>` in `requireAdmin`. | [adminAuthController.js](file:///d:/projects/wareshop/backend/src/controllers/adminAuthController.js#L1-L68), [auth.js](file:///d:/projects/wareshop/backend/src/middleware/auth.js#L25-L68), [app.js](file:///d:/projects/wareshop/backend/src/app.js#L83-L85) |
| **SEC-07** | Medium | Admin session token stored in plaintext in MongoDB and persisted in browser `localStorage` | Added `Admin.hashSessionToken()` (SHA-256) and `sessionTokenHash` index; set `sessionToken = null` in MongoDB; removed all `localStorage` usage from `AuthContext.jsx` and `api.js` (keeping admin Bearer token strictly in memory); enforced session expiry and server-side logout invalidation. | [Admin.js](file:///d:/projects/wareshop/backend/src/models/Admin.js#L27-L88), [authService.js](file:///d:/projects/wareshop/backend/src/services/authService.js#L100-L189), [api.js](file:///d:/projects/wareshop/frontend/src/services/api.js#L6-L23), [AuthContext.jsx](file:///d:/projects/wareshop/frontend/src/context/AuthContext.jsx#L6-L80) |
| **SEC-08** | Medium | Unescaped `$regex` (ReDoS / regex injection), query parameter type confusion, and `search` overwriting `location` `$or` clause | Added `escapeRegex()`, validated query filter types as strings (returning HTTP `400` on array/object injection), combined `location` and `search` filters via `$and`, and excluded demo records (`isDemo: { $ne: true }`). | [providerController.js](file:///d:/projects/wareshop/backend/src/controllers/providerController.js#L58-L155), [security.js](file:///d:/projects/wareshop/backend/src/middleware/security.js#L73-L76) |
| **SEC-12 / SEC-16** | Medium / Low | Unsafe `NODE_ENV` inference, wildcard CORS in production, and CORS error returning HTTP `500` | Inferred `production` when `RENDER=true` or `RENDER_SERVICE_ID` is present; rejected wildcard (`*`) `CORS_ORIGIN` in production; configured CORS middleware with `credentials: false` and mapped untrusted origins to HTTP `403` in `errorHandler.js`. | [env.js](file:///d:/projects/wareshop/backend/src/config/env.js#L51-L58), [app.js](file:///d:/projects/wareshop/backend/src/app.js#L42-L81), [errorHandler.js](file:///d:/projects/wareshop/backend/src/middleware/errorHandler.js#L5-L8) |
| **SEC-13** | Medium | Admin `PUT /api/v1/admin/providers/:id` lacked strict field/type validation | Enforced explicit allow-list and forbidden-field rejection (`shopImage`, `sourceApplicationId`, `providerAccountId`, `isDemo`, `slug`, `role`, etc.) with type, format, and length validation. | [adminProviderController.js](file:///d:/projects/wareshop/backend/src/controllers/adminProviderController.js#L708-L855) |
| **SEC-18** | Low | Audit log recorded spoofable raw `x-forwarded-for` header | Updated `logAdminActivity` to record Express proxy-validated `req.ip` and sanitized `x-request-id` header format. | [activityLogger.js](file:///d:/projects/wareshop/backend/src/services/activityLogger.js#L18-L25), [security.js](file:///d:/projects/wareshop/backend/src/middleware/security.js#L9-L19) |
| **REL-01 – REL-07** | High | Mongoose buffering timeouts, implicit default `test` DB, always-200 `/health` check, fake `dev-inmem-*` lead fallback, and missing DB close on shutdown | Set `mongoose.set('bufferCommands', false)`; passed explicit `dbName: env.mongodbDbName` to `mongoose.connect()`; added connection lifecycle listeners with redacted URI logging (`redactMongoUri`); separated `/health/live` (200) and `/health/ready` + `/health` (200 when connected, 503 when disconnected); mounted `requireDatabaseReady` before API routes; removed `dev-inmem-*` fallback in `leadService.js`; closed MongoDB connection on `SIGTERM`/`SIGINT`. | [db.js](file:///d:/projects/wareshop/backend/src/config/db.js#L1-L115), [healthController.js](file:///d:/projects/wareshop/backend/src/controllers/healthController.js#L1-L63), [index.js](file:///d:/projects/wareshop/backend/src/routes/index.js#L12-L19), [server.js](file:///d:/projects/wareshop/backend/server.js#L36-L65), [leadService.js](file:///d:/projects/wareshop/backend/src/services/leadService.js#L65-L71) |
| **BL-09** | High | Public pages silently fell back to 8 fabricated businesses (`frontend/src/data/providers.js`) when API failed or returned 0 listings | Removed all `data/providers.js` imports and seed fallbacks from `providerService.js` and public pages; implemented separate loading, empty, and error states with retry buttons. | [providerService.js](file:///d:/projects/wareshop/frontend/src/services/providerService.js#L1-L95), [HomePage.jsx](file:///d:/projects/wareshop/frontend/src/pages/home/HomePage.jsx), [ProvidersPage.jsx](file:///d:/projects/wareshop/frontend/src/pages/providers/ProvidersPage.jsx), [ProviderProfilePage.jsx](file:///d:/projects/wareshop/frontend/src/pages/providers/ProviderProfilePage.jsx), [CategoryDetailPage.jsx](file:///d:/projects/wareshop/frontend/src/pages/categories/CategoryDetailPage.jsx), [ProviderCard.jsx](file:///d:/projects/wareshop/frontend/src/components/marketplace/ProviderCard.jsx) |

---

## 3. Security Controls Implemented

### 3.1 Environment Validation & Explicit Admin Bootstrap
- **Startup Validation (`validateEnv`):** Validates `NODE_ENV`, `MONGODB_URI` scheme, explicit `MONGODB_DB_NAME`, and in production rejects `localhost` MongoDB URIs, `MONGODB_DB_NAME="test"`, missing or wildcard (`*`) `CORS_ORIGIN`, missing/placeholder `ADMIN_EMAIL`, and missing or weak `ADMIN_PASSWORD` (requires $\ge 12$ characters with uppercase, lowercase, digit, and symbol, and blocks known defaults).
- **Explicit CLI Provisioning:** `server.js` never auto-provisions a Super Admin in production. Provisioning or credential rotation in production must be executed explicitly via `npm run bootstrap:admin` ([bootstrapAdmin.js](file:///d:/projects/wareshop/backend/src/scripts/bootstrapAdmin.js)), which passes `{ allowInProduction: true, forceRotate: true }` and disconnects cleanly.

### 3.2 Proxy-Aware Rate Limiting & Audit Attribution
- **Trusted Proxy Hop (`app.set('trust proxy', 1)`):** Configured for Render's single reverse-proxy hop so `req.ip` resolves the rightmost trusted hop rather than spoofed client `X-Forwarded-For` prefixes.
- **Dual-Keyed OTP Protection:** `POST /api/v1/provider-auth/otp/request` enforces both `otpRequestIpLimiter` (10 requests / 15 min per client IP) and `otpRequestPhoneLimiter` (5 requests / 15 min per normalized 10-digit mobile number).
- **Independent Route Buckets:** Separate `express-rate-limit` instances protect `/api/v1/admin/auth/login`, `/api/v1/provider-auth/*`, `/api/v1/leads/partner`, and `/api/v1/providers/:slug/contact` so exhausting OTP requests never blocks admin login or public contact reveal.

### 3.3 Allow-Listed DTOs & Mass-Assignment Rejection
- **Partner Application DTO (`validatePartner` & `buildPartnerLeadDto`):** Inspects all incoming top-level and bracket-notated keys in `req.body`, immediately returning HTTP `400` if any server-owned field (`status`, `shopImage`, `verificationStatus`, `publicationStatus`, `assignedProviderId`, `isDemo`, `role`, `metadata`, etc.) or unknown property is present. Replaces `req.body` with a sanitized, allow-listed DTO.
- **Admin Listing Update DTO (`updateProvider`):** Rejects non-allow-listed and server-owned fields (`shopImage`, `sourceApplicationId`, `providerAccountId`, `isDemo`, `slug`, `role`) with HTTP `400` and validates field types and lengths.

### 3.4 Bearer-Only Admin Authentication & Hashed Session Tokens
- **In-Memory Client Token:** `frontend/src/services/api.js` and `frontend/src/context/AuthContext.jsx` store the admin session token exclusively in JavaScript memory (`inMemoryAuthToken` and React state) and attach `Authorization: Bearer <token>` to admin API requests.
- **Hashed Server Token (`sessionTokenHash`):** `authService.login()` generates a 32-byte CSPRNG hex token, stores only `SHA-256(token)` in `Admin.sessionTokenHash` (with `sessionToken: null` and a 12-hour `sessionExpiresAt`), and `requireAdmin` queries by `sessionTokenHash` and `sessionExpiresAt: { $gt: new Date() }`.
- **Strict Transport Enforcement:** `requireAdmin` extracts credentials solely from `Authorization: Bearer <64-hex-token>`. Cookie-only requests and `x-admin-token` headers are rejected with HTTP `401`.

### 3.5 Database Reliability & Health Accuracy
- **Fail-Fast Queries:** `mongoose.set('bufferCommands', false)` and `bufferCommands: false` on connection options prevent 10-second hangs when MongoDB is unreachable.
- **Liveness vs Readiness Separation:**
  - `GET /health/live` and `GET /api/v1/health/live` return HTTP `200` (`{ status: 'alive' }`) for process liveness.
  - `GET /health/ready`, `GET /api/v1/health/ready`, `GET /health`, and `GET /api/v1/health` check `isDatabaseReady()` (`mongoose.connection.readyState === 1`), returning HTTP `200` when connected and HTTP `503` (`{ status: 'unavailable', ready: false }`) when disconnected.
- **API Gate (`requireDatabaseReady`):** Mounted in `backend/src/routes/index.js` ahead of all database-dependent routes so any request during a database outage receives an immediate HTTP `503`.

---

## 4. Tests Executed and Actual Results

The isolated, non-destructive security test suite (`backend/test-phase1-security.js`) was executed via `npm run test:phase1` in `backend/`. It runs against an ephemeral HTTP server and in-memory model stubs without touching any development or production database.

### Command Executed
```bash
cd backend && npm run test:phase1
```

### Actual Output (23 / 23 Passed)
```text
================================================================
 WARESHOP — PHASE 1 SECURITY & RELIABILITY TEST SUITE
================================================================

--- 1. Environment Validation & Credential Hardening ---
  PASS  1.1 buildEnv({}) contains no hardcoded default admin email or password
  PASS  1.2 Source files contain no hardcoded default credentials
  PASS  1.3 validateEnv rejects missing or localhost MONGODB_URI in production
  PASS  1.4 validateEnv rejects missing MONGODB_DB_NAME or "test" DB name in production
  PASS  1.5 validateEnv rejects missing or wildcard (*) CORS_ORIGIN in production
  PASS  1.6 validateEnv rejects missing or weak ADMIN_PASSWORD in production
  PASS  1.7 Automatic production Super Admin creation is disabled

--- 2. Database Reliability & Health/Readiness Status ---
  PASS  2.1 Mongoose bufferCommands is disabled globally
  PASS  2.2 When DB is disconnected, /health/live is 200 but /health and /health/ready return 503
  PASS  2.3 When DB is disconnected, database-dependent APIs return HTTP 503 immediately
  PASS  2.4 When DB is connected, /health and /health/ready return HTTP 200

--- 3. Proxy-Aware Independent Rate Limiters ---
  PASS  3.1 Express trust proxy is configured to 1 (Render hop count)
  PASS  3.2 OTP limiter keys by both IP and phone and is independent from admin login & contact limiters

--- 4. Mass-Assignment Prevention ---
  PASS  4.1 POST /api/v1/leads/partner rejects client-supplied status, approval, ownership, or shopImage metadata
  PASS  4.2 Valid partner submission succeeds and persists only allow-listed DTO fields with backend-controlled status

--- 5. Bearer-Only Admin Authentication ---
  PASS  5.1 Admin login returns Bearer token without setting any cookies and stores only SHA-256 hash in DB
  PASS  5.2 Cookie-only and x-admin-token requests are rejected with HTTP 401
  PASS  5.3 Missing or invalid Bearer tokens are rejected with HTTP 401
  PASS  5.4 Valid Bearer session is accepted for admin reads and mutations, and enforces DTO validation on mutations
  PASS  5.5 Expired admin session is rejected with HTTP 401
  PASS  5.6 Server-side logout invalidates the Bearer token immediately
  PASS  5.7 Frontend AuthContext and api client store admin token in memory only (no localStorage)

--- 6. Public Listings Integrity (No Demo Fallback) ---
  PASS  6.1 Frontend providerService and public pages never import or fall back to fake demo listings

================================================================
 SUMMARY: 23 passed, 0 failed (Total: 23)
================================================================
```

---

## 5. Remaining Vulnerabilities & Deferred Items (Phase 2+)

In accordance with the Phase 1 scope boundaries (*"Implement only the following critical fixes... Do not modify 2Factor business logic in this phase"*), the following items from the Phase 0 audit remain for subsequent phases:

1. **Live 2Factor SMS Delivery Verification:** Live end-to-end SMS delivery via 2Factor requires valid production `TWOFACTOR_API_KEY` and `TWOFACTOR_OTP_TEMPLATE` credentials in the runtime environment and verification against a live Indian mobile number.
2. **Distributed Rate-Limit Store (Multi-Instance Scaling):** `express-rate-limit` uses its default in-memory store, which is accurate for a single Render instance (`trust proxy = 1`) but requires a shared store (MongoDB or Redis) if horizontally scaled across multiple backend instances.
3. **Persistent Media Storage Configuration:** Local disk uploads (`STORAGE_PROVIDER=local`) are ephemeral on Render restarts; production deployments should configure Cloudinary (`STORAGE_PROVIDER=cloudinary`) and verify upload credentials.
4. **Admin Multi-Factor Authentication (MFA):** Admin authentication currently relies on strong password policy, rate limiting, and hashed Bearer sessions; TOTP MFA is recommended as a future defense-in-depth enhancement.

---

## 6. Manual Environment Configuration Required

Before starting or deploying the backend in production (Render) and frontend (Vercel), configure the following environment variables:

### Backend (`backend/.env` / Render Environment Variables)
| Variable | Required in Prod | Description / Requirement |
|---|---|---|
| `NODE_ENV` | Yes | Must be set to `production` in production deployments. |
| `PORT` | Optional | Defaults to `5000` (or Render-assigned port). |
| `TRUST_PROXY` | Optional | Defaults to `1` (Render single load-balancer hop). |
| `MONGODB_URI` | Yes | MongoDB Atlas `mongodb+srv://...` connection string (must not be `localhost` in production; ensure Render outbound egress or `0.0.0.0/0` is whitelisted in Atlas Network Access). |
| `MONGODB_DB_NAME` | Yes | Explicit database name (e.g., `wareshop_prod`). Must **not** be `test` in production. |
| `CORS_ORIGIN` | Yes | Comma-separated allow-list of exact frontend origins (e.g., `https://wareshop.in,https://www.wareshop.in`). Wildcard `*` is rejected in production. |
| `ADMIN_EMAIL` | Yes | Valid administrator email address used by `npm run bootstrap:admin`. |
| `ADMIN_PASSWORD` | Yes | Strong password ($\ge 12$ chars with uppercase, lowercase, number, and symbol) used by `npm run bootstrap:admin`. |
| `TWOFACTOR_API_KEY` | Yes (for OTP) | Live 2Factor API key for SMS OTP dispatch. |
| `TWOFACTOR_OTP_TEMPLATE` | Yes (for OTP) | Approved 2Factor DLT SMS template name. |
| `STORAGE_PROVIDER` | Recommended | Set to `cloudinary` in production alongside `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. |

### Initial Production Admin Provisioning (One-Time CLI Step)
Because automatic production Super Admin creation is disabled on server boot, run the following command once after configuring production environment variables:
```bash
cd backend
npm run bootstrap:admin
```

### Frontend (`frontend/.env` / Vercel Environment Variables)
| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Full URL to the backend API v1 root (e.g., `https://api.wareshop.in/api/v1`). |
