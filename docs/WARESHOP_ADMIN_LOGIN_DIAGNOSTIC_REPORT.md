# WARESHOP — Admin Login Invalid Credentials: Root Cause Diagnosis & Resolution Report

**Document Status**: Verified Resolution  
**Role**: Senior Backend Authentication Engineer  
**Date**: November 15, 2026  
**Target Environment**: WARESHOP Commercial Marketplace (Node.js Express + MongoDB Atlas + React Vite)  
**Security Classification**: Internal Operations & Security Audit  

---

## Executive Summary

When attempting to authenticate at `/admin/login` using the administrator credentials configured in `backend/.env`, the backend returned:

```json
{
  "success": false,
  "message": "Invalid administrator credentials"
}
```

A comprehensive forensic investigation into the authentication pipeline was conducted across all 10 inspection areas without exposing secrets, hashes, or API keys.

### Primary Root Causes Identified
1. **Unquoted `#` Character in `ADMIN_PASSWORD`**:
   The `ADMIN_PASSWORD` set in `backend/.env` contained a `#` special character without surrounding quotes. Standard `dotenv` (v16.4.7) treats unquoted `#` as an inline comment delimiter and truncated the password at the 8th character.
2. **Bootstrap Password Complexity Gate Failure**:
   During backend startup in `server.js`, `authService.bootstrapAdmin()` evaluated the truncated 8-character string against `isStrongPassword(configuredPassword)`. Because the string failed the complexity policy (minimum 12 characters, uppercase, lowercase, number, symbol), `bootstrapAdmin()` threw an exception:
   `Admin bootstrap notice: A strong administrator password (min 12 chars, upper, lower, digit, symbol) is required to bootstrap an account.`
3. **Absence of Admin Record in Target Database**:
   Because the startup bootstrap failed silently as a logged warning, **zero admin records existed in the active database** (`wareshop_dev`). Every login attempt against `owner@wareshop.in` yielded `Admin.findOne({ email }) === null`, which triggered the standard generic rejection: `401 Invalid administrator credentials`.
4. **Port & Process Dual-Binding Divergence**:
   Two Node.js backend processes were active concurrently: PID 26840 on port 8001 (listening since 23:23) and PID 17592 on port 8000 (listening since 23:33). The Vite frontend was configured with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. Both processes connected to the same MongoDB Atlas cluster, but neither had an initialized administrator account in `wareshop_dev`.

---

## 10-Point Technical Investigation

### 1. Loaded `.env` Configuration File
- **Search Order in `src/config/env.js`**:
  `[process.cwd()/.env.test (test only), process.cwd()/.env, process.cwd()/backend/.env, ../../.env]`
- **Resolved Path**:
  When starting from `d:\projects\wareshop\backend`, the runtime loaded `D:\projects\wareshop\backend\.env`.
- **Environment Summary**:
  `PORT=8000`, `NODE_ENV=development`, `MONGODB_DB_NAME=wareshop_dev`.

### 2. Active Backend Ports & Running Processes
Inspection of active network sockets and Windows process management identified:
- **Port 8000 (PID 17592)**: Active backend instance running `node server.js` from `backend` directory.
- **Port 8001 (PID 26840)**: Pre-existing backend instance running `node server.js`.
- **Port 3000 (PID 9456)**: Active Vite frontend development server.
- **Frontend Target**: `frontend/.env` configured `VITE_API_BASE_URL=http://localhost:8000/api/v1`, correctly routing frontend login requests to PID 17592 on port 8000.

### 3. Admin Bootstrap & Initialization Logic
Inspected `backend/server.js` (lines 18–24):
```javascript
if (conn && env.isDevelopment && env.admin.email && env.admin.password) {
  try {
    await authService.bootstrapAdmin();
  } catch (bootstrapErr) {
    logger.warn(`Admin bootstrap notice: ${bootstrapErr.message}`);
  }
}
```
- In development, the server attempts an automatic bootstrap on boot.
- If `authService.bootstrapAdmin()` throws an error (e.g. password does not satisfy `isStrongPassword`), the error is caught and logged at `WARN` level to prevent the server process from crashing.
- In production, automatic bootstrap is disabled by architectural design (`allowInProduction: false`) and requires explicit execution via CLI.

### 4. MongoDB Admin Model & Database Records
- **Model Definition (`src/models/Admin.js`)**:
  - `email`: String, required, unique, trimmed, lowercase.
  - `passwordHash`: String (hex), required.
  - `salt`: String (hex), required.
  - `role`: Enum `['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'CONTENT_MANAGER', 'SUPPORT_AGENT']`, default `ADMIN`.
  - `sessionTokenHash`: SHA-256 hash of 32-byte random hex token.
  - `failedLoginAttempts`: Number (lockout at 5 attempts).
  - `lockoutUntil`: Date.
- **Cluster State Audit**:
  - Database `wareshop_dev`: Contained **0** admin records.
  - Database `test`: Contained legacy record `admin@konnevia.in` from previous testing/migration.

### 5. Existing Admin Accounts & `.env` Bootstrap Overrides
- In `authService.bootstrapAdmin()`:
  - If no admin exists for `email`: Provisions new `SUPER_ADMIN` with salted scrypt hash.
  - If admin exists and `forceRotate === false && !env.admin.autoRotate`: Existing MongoDB credentials are preserved; `.env` password changes are ignored.
  - If `forceRotate === true` or `env.admin.autoRotate === true`: Updates `passwordHash` and `salt`, invalidates all active sessions, and resets lockout counters.

### 6. Email Normalization & Comparison
- Evaluated in `Admin.js` and `authService.js`:
  - `email`: Normalized with `.trim().toLowerCase()` in both the Mongoose schema definition and controller/service layers.
  - Direct exact matching via `Admin.findOne({ email: cleanEmail })` prevents case-sensitivity bypasses or duplicate normalization anomalies.

### 7. Hashing Algorithm & Comparison Verification
- **Cryptographic Scheme**:
  - The application **does not use bcrypt**; it uses native Node.js **salted scrypt** (`crypto.scryptSync(password, salt, 64)`).
  - Salt generation: `crypto.randomBytes(16).toString('hex')`.
  - Comparison: Constant-time comparison using `crypto.timingSafeEqual(storedBuf, computedBuf)` preventing timing side-channel attacks.
  - Session tokens: 32-byte hex strings whose raw values are never stored; only `crypto.createHash('sha256').update(token).digest('hex')` is stored in MongoDB.

### 8. Admin Account Status & RBAC Controls
- `failedLoginAttempts`: Increments on each invalid credential attempt.
- `lockoutUntil`: After 5 consecutive failures, locked out for 15 minutes (`HTTP 429`).
- Middleware `requireAdmin` (`src/middleware/auth.js`) enforces Bearer-only sessions. Cookie-only or missing headers are rejected with `HTTP 401`.

### 9. Frontend API Base URL & Request Payload
- `frontend/src/services/api.js`:
  - Target URL: `http://localhost:8000/api/v1/admin/auth/login`.
  - Request headers: `Content-Type: application/json`, `X-Requested-With: XMLHttpRequest`.
  - Payload: `{ email: "<admin_email>", password: "<password>" }`.
- In-memory session: `AuthContext` stores Bearer token strictly in React memory (never in `localStorage` or `sessionStorage`).

### 10. Backend Response & Error Handling
- Invalid login: Returns `HTTP 401` with body `{ "success": false, "message": "Invalid administrator credentials" }`.
- Audit Log: Every failed attempt records `LOGIN_FAILED` in `ActivityLog` with sanitized metadata (no passwords logged).

---

## Remediations Implemented

### 1. Robust Dotenv Comment Defense (`backend/src/config/env.js`)
Added a defensive parser `extractUnquotedHashValue` to ensure unquoted `#` symbols embedded in passwords (e.g. `Word#123456`) are safely recovered without being truncated by `dotenv`, while still correctly stripping legitimate whitespace-prefixed comments (` # comment`).

### 2. Quoted Credentials in `.env` and `.env.example`
- Updated `backend/.env` to enclose `ADMIN_PASSWORD` in double quotes.
- Updated `backend/.env.example` documenting that passwords containing special symbols such as `#` must be wrapped in quotes.

### 3. Secure Dedicated CLI Password Reset Tool (`backend/src/scripts/resetAdminPassword.js`)
Implemented a dedicated, production-safe CLI tool with corresponding npm script:
```bash
npm run admin:reset-password -- <email>
```

#### Security Design Principles
- **Explicit Operator Execution**: Requires authorized operator execution with interactive prompt or explicit CLI argument.
- **Account Existence Verification**: Operates strictly on existing admin accounts; fails safely if account does not exist (prevents accidental provisioning).
- **Role Preservation**: Modifies only `passwordHash`, `salt`, and `passwordRotatedAt`. Preserves the assigned role (`SUPER_ADMIN`, `ADMIN`, etc.) and all account attributes.
- **Native Salted Scrypt Hashing**: Hashes using `Admin.hashPassword()` with 16-byte cryptographically secure salt.
- **Automatic Active Session Revocation**: Sets `sessionTokenHash = null` and `sessionExpiresAt = null`, revoking all active sessions immediately.
- **Zero Secret Exposure**: Passwords are never logged to console, files, or `ActivityLog`.
- **Immutable Audit Logging**: Records `PASSWORD_RESET_CLI` in `ActivityLog`.

---

## Verification & Real-Life Testing Evidence

Automated and live integration tests were executed against the live backend (`http://localhost:8000/api/v1`) and MongoDB Atlas database (`wareshop_dev`).

### Test Results

| Test ID | Test Scenario | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TEST-01** | Login with valid `.env` credentials | HTTP 200, 64-char Bearer token, `SUPER_ADMIN` | HTTP 200, Token issued, Role `SUPER_ADMIN` | **PASS** |
| **TEST-02** | Access protected `/admin/auth/me` with Bearer token | HTTP 200, Operator profile returned | HTTP 200, Email and role verified | **PASS** |
| **TEST-03** | Access protected `/admin/dashboard` with Bearer token | HTTP 200, Live database statistics returned | HTTP 200, KPIs loaded | **PASS** |
| **TEST-04** | Login with incorrect password | HTTP 401 `Invalid administrator credentials` | HTTP 401 `Invalid administrator credentials` | **PASS** |
| **TEST-05** | Unauthorized access to `/admin/dashboard` without token | HTTP 401 `Authentication required` | HTTP 401 `Authentication required` | **PASS** |
| **TEST-06** | Unauthorized access with invalid Bearer token | HTTP 401 `Session invalid or expired` | HTTP 401 `Session invalid or expired` | **PASS** |
| **TEST-07** | Secure CLI password reset operation (`NEW_ADMIN_PASSWORD`) | Preserves role, rotates scrypt hash, revokes sessions | Password rotated, role preserved, active session revoked | **PASS** |
| **TEST-08** | Old token rejected after password reset | HTTP 401 | HTTP 401 | **PASS** |
| **TEST-09** | Login with newly reset password | HTTP 200, New Bearer session issued | HTTP 200, Session issued | **PASS** |
| **TEST-10** | Reset back to `.env` password and verify login | HTTP 200 with configured credentials | HTTP 200, Successful authentication | **PASS** |
| **TEST-11** | Full backend automated security suite (`npm run test`) | All Phase 1 + MVP suites pass | 44 / 44 tests passed (0 failures) | **PASS** |

---

## Recommended Operator Runbook

### To Provision or Bootstrap Initial Administrator:
```bash
cd backend
npm run bootstrap:admin
```

### To Reset an Administrator Password via CLI:
```bash
cd backend
npm run admin:reset-password -- <admin-email>
```
The script will securely prompt for the new strong password without displaying it in shell history or process arguments.
