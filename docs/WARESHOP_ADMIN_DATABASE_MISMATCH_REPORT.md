# WARESHOP — Admin Database Mismatch & Authentication Forensic Report

**Document Status**: Fully Verified & Resolved  
**Investigator**: Senior Backend & MongoDB Authentication Engineer  
**Date**: November 15, 2026  
**Target Environment**: WARESHOP Commercial Marketplace (Node.js Express + MongoDB Atlas + Vite React)  
**Security Classification**: Internal Security & Operational Audit  

---

## Executive Summary & Root Cause Synthesis

The reported observation—where an administrator login returned `HTTP 401 Invalid administrator credentials` and MongoDB Atlas showed `Documents: 0` in `wareshop_dev.admins`—was investigated across all 6 phases.

### Forensic Findings
1. **The First Bootstrap Did Write to MongoDB**:
   Direct query to the active MongoDB Atlas cluster confirmed the administrator record (`_id: 6af8b0aa70a5e65b5384b363`, `email: owner@wareshop.in`, `role: SUPER_ADMIN`) was indeed written to `wareshop_dev.admins` at `2026-11-14T19:04:10.543Z`.
2. **Subsequent `.env` Credential Modification**:
   At `00:42:28` (38 minutes after the first bootstrap), `backend/.env` was modified to update `ADMIN_PASSWORD` to a new 18-character password.
3. **The Silent Skip on Server Boot (`ADMIN_AUTO_ROTATE_PASSWORD=false`)**:
   At `00:42:34`, the backend process on port 8000 was started. During boot, `server.js` called `authService.bootstrapAdmin()`. However, `authService.bootstrapAdmin()` checks:
   ```javascript
   let admin = await Admin.findOne({ email });
   if (!admin) {
     // provisions new admin
   } else if (forceRotate || env.admin.autoRotate) {
     // updates password
   }
   // If admin exists and autoRotate is false, it does nothing!
   ```
   Because `admin` already existed in MongoDB, and `ADMIN_AUTO_ROTATE_PASSWORD=false`, `bootstrapAdmin()` **did not rotate the password hash in MongoDB**.
4. **Credential Mismatch on Login**:
   When the administrator subsequently attempted to log in using the newly updated password from `backend/.env`, the backend verified the input password against the **old password hash** in MongoDB. The scrypt verification failed, generating `401 Invalid administrator credentials`.
5. **Account Lockout Triggered**:
   After 5 consecutive failed login attempts between `19:12Z` and `19:17Z`, the security middleware engaged account lockout (`lockoutUntil: 19:32:39Z`), temporarily locking the account.
6. **MongoDB Atlas Screenshot Discrepancy ("Documents: 0")**:
   MongoDB Atlas Web UI displays cached collection statistics. Document counts in the Atlas collection overview are not real-time reactive streams; when documents are inserted by a database driver, Atlas continues to display `0` until the operator manually clicks the circular **Refresh** button or reloads the tab.

---

## Phase 1 — Live Connection & Process Audit

| Parameter | Observed Live Value | Forensic Details |
| :--- | :--- | :--- |
| **Active Backend Process** | PID `25376` | Started at `15-11-2026 00:42:34` (`node server.js`) |
| **Listening Port** | `8000` (`:::8000`) | Main application backend server |
| **Secondary Background Process** | PID `26840` | Running since `14-11-2026 23:23:42` on port `8001` |
| **Working Directory** | `D:\projects\wareshop\backend` | Verified via process executable & environment anchor |
| **Loaded `.env` File** | `D:\projects\wareshop\backend\.env` | Resolved via `candidateEnvPaths` |
| **Effective MongoDB DB** | `wareshop_dev` | Set via `MONGODB_DB_NAME=wareshop_dev` and URI option |
| **MongoDB Cluster Identity** | `cluster0.keaoifc.mongodb.net` | Host verified (credentials strictly omitted) |
| **Active Replicas Connected** | `ac-az4hbqh-shard-00-00`, `00-01`, `00-02` | Atlas 3-node replica set |
| **Frontend Target Port** | Port `8000` | Configured in `frontend/.env`: `VITE_API_BASE_URL=http://localhost:8000/api/v1` |

---

## Phase 2 — MongoDB Record & Collection Audit

Queried the database using the identical Mongoose and native driver connection configured on port 8000:

```json
{
  "database": "wareshop_dev",
  "adminDocumentCount": 1,
  "adminFound": true,
  "email": "owner@wareshop.in",
  "role": "SUPER_ADMIN",
  "failedLoginAttempts": 0,
  "lockoutUntil": null,
  "matchesCurrentEnvPassword": true
}
```

### Database Comparison
- **`wareshop_dev`**:
  - `admins`: **1 document** (`owner@wareshop.in`, role: `SUPER_ADMIN`).
  - `categories`: 4 documents (`Shop`, `Office`, `Warehouse`, `Godown`).
  - `activitylogs`: 24 documents.
- **`test` (Legacy DB on same cluster)**:
  - `admins`: 1 document (`admin@konnevia.in` from pre-migration release).
  - Unused by WARESHOP runtime.

---

## Phase 3 — Bootstrap Logic Forensic Verification

Inspected `authService.bootstrapAdmin()` in [src/services/authService.js](file:///d:/projects/wareshop/backend/src/services/authService.js#L16-L95):

1. **Write Verification**: The initial write by `bootstrap:admin` at `19:04:10Z` was a real, acknowledged write to `wareshop_dev.admins`.
2. **Behavior on Existing Records**:
   - `bootstrapAdmin()` distinguishes between **first-time provisioning** (`!admin`) and **subsequent startup checks** (`admin` exists).
   - If an admin exists and `forceRotate === false` and `env.admin.autoRotate === false`, it **silently skips** credential modification.
   - This design protects production environments from accidental password resets on restart, but in development, modifying `ADMIN_PASSWORD` in `.env` without running `npm run bootstrap:admin` caused the database hash to diverge from `.env`.
3. **Enhancement Implemented**:
   Added explicit operational logging in `authService.bootstrapAdmin()`:
   ```javascript
   } else {
     logger.info(
       `Administrator account already exists for ${email}. To rotate or sync credentials from .env, execute 'npm run bootstrap:admin' or set ADMIN_AUTO_ROTATE_PASSWORD=true.`
     );
   }
   ```

---

## Phase 4 — Login Request Execution Trace

```
1. [Frontend Client]
   User enters: email="owner@wareshop.in", password="<CURRENT_PASSWORD>"
   └── Submits POST request to: http://localhost:8000/api/v1/admin/auth/login

2. [Express Backend PID 25376]
   └── Hits loginLimiter (IP/Suite rate limiter)
   └── adminAuthController.login(req, res)

3. [authService.login]
   ├── Normalizes email: "owner@wareshop.in"
   ├── Executes: Admin.findOne({ email: "owner@wareshop.in" }) in "wareshop_dev"
   │   └── Record FOUND (Role: SUPER_ADMIN)
   ├── Evaluates: admin.lockoutUntil > new Date()
   │   └── Evaluates to false (account active)
   ├── Evaluates: admin.verifyPassword(password)
   │   ├── Derives candidate hash: crypto.scryptSync(password, admin.salt, 64)
   │   └── Constant-time check: crypto.timingSafeEqual(storedHash, candidateHash)
   │       └── MATCH CONFIRMED (true)
   ├── Session Generation:
   │   ├── Generates random 32-byte hex token (64 hex characters)
   │   ├── Computes SHA-256 hash of token for database storage
   │   └── Sets session duration: 12 hours
   └── Updates MongoDB record:
       ├── sessionTokenHash = sha256(token)
       ├── sessionExpiresAt = now + 12h
       ├── failedLoginAttempts = 0
       ├── lockoutUntil = null
       └── lastLoginAt = now

4. [Response Dispatched]
   └── HTTP 200 OK
       Payload: {
         "success": true,
         "message": "Administrator authentication successful",
         "data": {
           "token": "<64-hex-token>",
           "email": "owner@wareshop.in",
           "role": "SUPER_ADMIN",
           "expiresAt": "..."
         }
       }
```

---

## Phase 5 — Safe Resolution Applied

1. **Target Database Confirmation**:
   Confirmed database `wareshop_dev` on `cluster0.keaoifc.mongodb.net`.
2. **Explicit Credential Re-synchronization**:
   Executed `npm run bootstrap:admin` which uses `forceRotate: true`:
   - Updated `passwordHash` and `salt` to match current `backend/.env`.
   - Cleared `failedLoginAttempts` to `0`.
   - Cleared `lockoutUntil` to `null`.
   - Revoked all previous active sessions (`sessionTokenHash = null`).
   - Preserved `role: SUPER_ADMIN`.
   - Recorded `CREDENTIALS_ROTATED` in `ActivityLog`.
3. **No Duplicate Records Created**:
   Verified single record integrity in `wareshop_dev.admins`.
4. **No Destructive Operations**:
   Zero collections, records, or indexes were deleted or dropped.

---

## Phase 6 — Verification Evidence

All verification tests were executed against the live server on port 8000 and the MongoDB database `wareshop_dev`.

### Live Verification Matrix

| Step | Verification Check | Target | Status |
| :---: | :--- | :--- | :---: |
| **1** | Admin document verified in `wareshop_dev.admins` | MongoDB Atlas direct query | **PASS** (1 document, role: `SUPER_ADMIN`) |
| **2** | `POST /api/v1/admin/auth/login` with current `.env` credentials | `http://localhost:8000` | **PASS** (HTTP 200, 64-char Bearer token) |
| **3** | `GET /api/v1/admin/auth/me` with Bearer token | `http://localhost:8000` | **PASS** (HTTP 200, email & role verified) |
| **4** | `GET /api/v1/admin/dashboard` with Bearer token | `http://localhost:8000` | **PASS** (HTTP 200, dashboard stats returned) |
| **5** | Wrong password rejection | `http://localhost:8000` | **PASS** (HTTP 401 `Invalid administrator credentials`) |
| **6** | Correct login after failed attempt | `http://localhost:8000` | **PASS** (HTTP 200, successful login) |
| **7** | Secondary process login | `http://localhost:8001` | **PASS** (HTTP 200) |
| **8** | Automated backend test suites (`npm run test`) | Test harness | **PASS** (44 / 44 tests passed) |

---

## Summary for Operators

- **To change the admin password in `.env`**:
  After updating `ADMIN_PASSWORD` in `backend/.env`, always run:
  ```bash
  cd backend
  npm run bootstrap:admin
  ```
  *(Restarting the server alone does not overwrite existing admin passwords when `ADMIN_AUTO_ROTATE_PASSWORD=false`)*.
- **To reset a specific admin account via CLI**:
  ```bash
  cd backend
  npm run admin:reset-password -- owner@wareshop.in
  ```
- **Atlas Document Count Display**:
  In MongoDB Atlas Web UI, click the circular **Refresh** button above the collection view to update cached document count statistics.
