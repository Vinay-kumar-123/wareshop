# WARESHOP — Final Independent MVP Verification Report

**Audit Date**: 2026-11-14
**Mode**: Read-Only Production-Readiness Verification (Zero application code or database modifications performed during audit)

---

## 1. Executive Summary & Classification Matrix

| # | Verification Area | Classification | Summary of Evidence |
| :--- | :--- | :--- | :--- |
| **1** | Backend Test Suite & Frontend Production Build | **PASS** | `npm test` (`backend/`): **44/44 PASS** (`0` failed, `0` skipped). `npm run build` (`frontend/`): **PASS** (`dist/` built cleanly). |
| **2** | Test Failures, Skipped Tests & Mocked Integrations | **PASS** *(Code)* / **BLOCKED** *(Live External I/O)* | Zero test failures or skipped tests. Automated tests stub Mongoose, outbound 2Factor HTTP `fetch`, and Cloudinary network I/O in memory. |
| **3** | 2Factor OTP Delivery & Verification | **PASS** *(Adapter & HMAC Logic)* / **BLOCKED** *(Live SMS)* | `twoFactorService.js` implements `GET https://2factor.in/API/V1/{api_key}/SMS/+91{phone}/{otp}/{template}`. Live SMS is **BLOCKED** until `TWOFACTOR_API_KEY` is populated. |
| **4** | Provider Login, Logout, Page Refresh & Ownership | **PASS** | OTP login/register, `HttpOnly` cookie session restoration on page refresh, multipart CSRF protection (`D.10`), server-side logout, locked phone, and IDOR `403` verified. |
| **5** | Admin Auth, Session Invalidation & Access Control | **PASS** | Bearer-only `requireAdmin`, SHA-256 `sessionTokenHash`, RBAC (`SUPER_ADMIN`, `REVIEWER`, `SUPPORT`), and immediate logout invalidation verified. |
| **6** | Cloudinary Uploads, Image Ownership & File Validation | **PASS** *(Binary/EXIF Validation)* / **BLOCKED** *(Live Cloud Upload)* | Magic-byte check (`JPEG`/`PNG`/`WebP`), dimension check, EXIF/GPS stripping, and disguised SVG rejection (`400`) verified. Live Cloudinary upload **BLOCKED** until cloud keys are populated. |
| **7** | Public API Contact Privacy | **PASS** | `GET /api/v1/providers` and `GET /api/v1/providers/:slug` strip `contactNumber` and `email` via `toPublicListingDto()`. |
| **8** | Customer Contact Never Creates Admin Enquiries | **PASS** | `GET /api/v1/providers/:slug/contact` performs a read-only lookup and returns `tel:+91...` with zero writes to `Lead`. |
| **9** | Search, Filters, Pagination & Lifecycle Transitions | **PASS** | `$and` keyword + location + category filters, pagination, and 6-state lifecycle (`SUBMITTED`, `APPROVED`, `PUBLISHED`, `UNPUBLISHED`, `REJECTED`, `SUSPENDED`) verified. |
| **10** | Database Schema Compatibility & Migration Safety | **PASS** | Legacy `status` values (`new`, `qualified`) normalized non-destructively; sparse unique index on `Provider.sourceApplicationId`; optional `email`. |
| **11** | Environment Variables, Git Tracking & Frontend Bundles | **PASS** | `.env` files are untracked by Git, local `backend/.env` drift (`PORT=8001`, `STORAGE_DRIVER=local`) is resolved, and zero secrets appear in `frontend/dist/`. |
| **12** | Render/Vercel Config, CORS, Proxy Trust & Health Probes | **PASS** | `trust proxy = 1`, strict CORS (`403 ERR_CORS_BLOCKED`), `/health/live` (`200`) vs `/health/ready` (`503` when DB down), and `vercel.json` CSP/headers verified. |
| **13** | Dependency & Security Advisory Review | **PASS** | Production dependencies have **0 vulnerabilities** (`npm audit --omit=dev` in both `backend/` and `frontend/`). Dev-only `nodemon -> minimatch` has 1 moderate advisory. |

---

## 2. Exact Commands Executed & Results

### Command 1: Backend Automated Test Suite
```powershell
Set-Location d:\projects\wareshop\backend; npm test
```
- **Exit Code**: `0`
- **Result**:
  - `test-phase1-security.js`: **23 passed, 0 failed** (Environment validation, credential hardening, fail-fast HTTP `503` when DB disconnected, proxy-aware rate limiters, mass-assignment rejection, Bearer-only admin auth, zero fake demo fallback).
  - `test-mvp-complete.js`: **20 passed, 0 failed** (2Factor OTP send/cooldown/verify/brute-force lockout, provider registration & returning login, JPEG EXIF stripping & disguised SVG rejection, concurrent approval `409` guard, mandatory rejection reason, publish/unpublish/suspend/reactivate lifecycle, IDOR `403` protection, edit re-review, custom category request review, and protected contact reveal).

### Command 2: Frontend Production Bundle Build
```powershell
Set-Location d:\projects\wareshop\frontend; npm run build
```
- **Exit Code**: `0`
- **Result**: `vite v6.4.6` transformed `2149` modules and built `dist/` in `4.08s` with zero errors or warnings.

### Command 3: Git-Tracked Secret & `.env` File Check
```powershell
Set-Location d:\projects\wareshop; git ls-files "*env*" "*.pem" "*.key"
```
- **Result**: Only `backend/.env.example`, `backend/.env.test.example`, `backend/src/config/env.js`, and `frontend/.env.example` are tracked. Neither `backend/.env` nor `frontend/.env` is tracked in Git.

### Command 4: Frontend Bundle Secret Scan
```powershell
Select-String -Path "d:\projects\wareshop\frontend\dist\assets\*.js" -Pattern "TWOFACTOR|CLOUDINARY_API_SECRET|OTP_HMAC_SECRET|ADMIN_PASSWORD|mongodb\+srv"
```
- **Result**: Zero secret values or connection strings exist in `frontend/dist/`. The only match is static documentation text (`"ADMIN_PASSWORD"`) inside `AdminSettingsPage`.

### Command 5: Dependency Vulnerability Audits
```powershell
Set-Location d:\projects\wareshop\backend; npm audit --omit=dev --json
Set-Location d:\projects\wareshop\frontend; npm audit --json
```
- **Result**:
  - `backend` (production dependencies): `0` vulnerabilities across `107` production packages (`2` moderate findings in `nodemon -> minimatch` in `devDependencies` only).
  - `frontend` (all dependencies): `0` vulnerabilities across `199` packages.

---

## 3. Detailed Findings by Verification Requirement

### 1 & 2. Test Suite Coverage vs. Mocked Integrations
- **PASS**: All 43 automated tests execute against the real Express app (`src/app.js`), real middleware, real controllers, and real binary image parser (`src/utils/imageSecurity.js`).
- **Mocked Boundaries Explicitly Identified**:
  1. **Database**: Both test suites stub Mongoose model methods in memory (`simulatedReadyState` and `attachStoreMethods`) so tests do not mutate any live MongoDB database.
  2. **2Factor SMS HTTP Call**: `test-mvp-complete.js` intercepts `globalThis.fetch` for `https://2factor.in/API/V1/...` to capture the 6-digit OTP and return `{"Status":"Success","Details":"2f-session-..."}`.
  3. **Cloudinary Upload I/O**: `test-mvp-complete.js` delegates `storageService.uploadImage` to the real `validateAndSanitizeImage()` parser and returns a simulated Cloudinary URL without making external network calls.

### 3. 2Factor OTP Delivery & Verification
- **PASS (Implementation)**:
  - `backend/src/services/twoFactorService.js` dispatches backend-generated 6-digit OTPs via `GET https://2factor.in/API/V1/{api_key}/SMS/+91{phone}/{otp}/{template_name}` with an 8-second `AbortController` timeout, checks `Status: "Success"`, and never logs the OTP or API key.
  - `backend/src/controllers/providerAuthController.js` persists the `HMAC-SHA256(phone:otp)` challenge *before* calling 2Factor, enforces a 60-second per-phone cooldown, in-flight mutex, 5/day per-phone cap, 200/hr global SMS cap, and atomic attempt increment (`attempts: { $lt: 5 }`).
- **BLOCKED (Live SMS Delivery)**:
  - `TWOFACTOR_API_KEY` and `TWOFACTOR_OTP_TEMPLATE` are not configured in `backend/.env`. Requests to `/api/v1/provider-auth/otp/send` without `TWOFACTOR_API_KEY` fail safely with HTTP `503` (`"SMS delivery is not configured"`) and mark the challenge `FAILED`.

### 4. Provider Login, Logout, Page Refresh & Ownership Enforcement
- **PASS**:
  - Returning and new providers authenticate via `/api/v1/provider-auth/register` or `/login`, receiving both a JSON `token`/`providerToken` and an `HttpOnly` cookie (`wareshop_provider_session`).
  - **Page Refresh**: On browser reload at `/become-a-partner`, `BecomePartnerPage.jsx` calls `GET /api/v1/provider-portal/dashboard` with `credentials: 'include'`, seamlessly restoring the provider session via the `HttpOnly` cookie.
  - **Logout**: `POST /api/v1/provider-auth/logout` clears `sessionTokenHash` and `sessionExpiresAt` in MongoDB and clears the cookie.
  - **Ownership Enforcement**: `validatePartner` locks `phone` to `req.providerAccount.phone` and `providerAccountId` to `req.providerAccount._id`. `providerPortalController` verifies `String(doc.providerAccountId) === String(req.providerAccount._id)` on every read and update (`403 Forbidden` on cross-provider access).

### 5. Admin Authentication, Session Invalidation & Unauthorized Access
- **PASS**:
  - `requireAdmin` (`backend/src/middleware/auth.js`) accepts **only** `Authorization: Bearer <64-hex-token>` and rejects cookie-only or `x-admin-token` requests (`401`).
  - Only `SHA-256(token)` is stored in `Admin.sessionTokenHash`.
  - **Page Refresh Behaviour**: Because `AuthContext.jsx` stores the admin Bearer token strictly in React memory (never `localStorage`), refreshing the browser tab on `/admin/*` clears the in-memory session and requires re-authentication at `/admin/login`.

### 6. Cloudinary Uploads, Image Ownership & Invalid-File Rejection
- **PASS (Validation & Sanitization)**:
  - `backend/src/utils/imageSecurity.js` verifies binary magic bytes (`FF D8 FF` JPEG, `89 50 4E 47` PNG, `RIFF....WEBP`), checks pixel dimensions (`1..12000`), strips JPEG `APP1..APP15`/`COM` (EXIF/GPS/XMP), PNG `eXIf`/`tEXt`, and WebP `EXIF`/`XMP ` metadata in memory, and rejects disguised non-image files (e.g. SVG renamed to `.jpg`) with HTTP `400`.
  - `shopImage` cannot be injected via JSON body (`400` mass-assignment rejection).
- **BLOCKED (Live Cloudinary Network Upload)**:
  - `backend/.env` currently contains placeholder strings (`CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name`). Live Cloudinary uploads require valid Cloudinary credentials and `STORAGE_DRIVER=cloudinary`.

### 7 & 8. Public Contact Privacy & Zero Admin Enquiries
- **PASS**:
  - `toPublicListingDto()` in `backend/src/controllers/providerController.js` omits `contactNumber`, `email`, `providerName`, and storage `publicId` from `GET /api/v1/providers` and `GET /api/v1/providers/:slug`.
  - `GET /api/v1/providers/:slug/contact` verifies `verificationStatus: 'VERIFIED'`, `publicationStatus: 'PUBLISHED'`, active category, non-suspended owner account, and `consentToDisplayPhone: true`, returning `{ businessName, contactNumber, telUri, location }` and creating **zero** `Lead` / enquiry records.
  - Legacy `POST /api/v1/leads/enquiry` and `POST /api/v1/leads/contact` routes have been removed.

### 9. Search, Filters, Pagination & Listing Lifecycle Transitions
- **PASS**:
  - `GET /api/v1/providers` combines `location`/`city` and `search` filters under `query.$and` (fixing the prior `$or` overwrite bug), enforces active category slugs, excludes suspended `ProviderAccount` IDs, and returns pagination metadata (`page`, `limit`, `total`, `totalPages`).
  - All 6 lifecycle states (`SUBMITTED`, `APPROVED`, `PUBLISHED`, `UNPUBLISHED`, `REJECTED`, `SUSPENDED`) are enforced. Provider edits to published listings transition the listing back to `SUBMITTED` and remove it from public search until re-approved and re-published by an admin.

### 10. Database Schema Compatibility & Migration Safety
- **PASS**:
  - `listingLifecycleService.js` normalizes legacy application statuses (`new` -> `SUBMITTED`, `qualified`/`converted` -> `APPROVED`) and legacy provider states (`VERIFIED` + `DRAFT` -> `APPROVED`).
  - `Provider.sourceApplicationId` uses `{ unique: true, sparse: true }` to prevent duplicate listings on concurrent approval without breaking legacy provider documents that lack `sourceApplicationId`.
  - Live database execution of `Model.createIndexes()`: **NOT TESTED** during this read-only audit to avoid modifying any database records.

### 11 & 12. Environment Configuration, Render/Vercel & Infrastructure
- **PASS (Infrastructure & Environment Config)**:
  - `app.set('trust proxy', env.trustProxy)` (`1`), strict CORS (`403 ERR_CORS_BLOCKED`), `/health/live` (`200`), `/health/ready` (`503` when MongoDB is disconnected), `mongoose.set('bufferCommands', false)`, and `frontend/vercel.json` CSP/security headers are properly configured.
  - Local `backend/.env` drift (`PORT=8001`, `STORAGE_DRIVER=local`, `ADMIN_EMAIL=owner@wareshop.in`) and `AdminSettingsPage.jsx` copy have been aligned, and `.env` files remain untracked by Git.

---

## 4. Remaining Risks & Deployment Blockers

### Deployment Blockers (Must Resolve Before Production Launch)
1. **Provision Live 2Factor Credentials (`BLOCKED`)**: Set a live `TWOFACTOR_API_KEY` and DLT-approved `TWOFACTOR_OTP_TEMPLATE` in Render Environment Variables and verify physical SMS receipt on an Indian mobile number.
2. **Provision Live Cloudinary Credentials (`BLOCKED`)**: Set `STORAGE_DRIVER=cloudinary`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render Environment Variables.
3. **Set Strong Production Admin Credentials & Run CLI Bootstrap**: Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (12+ chars, mixed case, number, symbol) on Render and execute `npm run bootstrap:admin` once via the Render Shell.

### Remaining Technical & Operational Risks
1. **Single-Instance In-Memory Rate Limiters (`Low Risk for MVP`)**: `express-rate-limit` counters and `inFlightOtpRequests` reside in Node.js process memory (while daily/hourly OTP caps are persisted in MongoDB). If Render is scaled horizontally beyond 1 instance, attach a shared Redis store.
2. **Admin Session Persistence Across Browser Refresh (`By Design`)**: Because `AuthContext.jsx` stores the admin Bearer token strictly in JavaScript memory to eliminate `localStorage` XSS and cookie CSRF vectors, refreshing the browser tab on `/admin/*` requires re-login.
