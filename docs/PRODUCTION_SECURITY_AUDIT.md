# KONNEVIA Production Security Audit & Hardening Specification
**Document Version**: 2.0 (Production Release)
**Classification**: Engineering & Operations
**Platform**: KONNEVIA Multi-Category Marketplace
**Auditor**: Application Security Engineering Team

---

## 1. Authentication Lifecycle & Architecture

### 1.1 Root Cause Diagnosis: Authentication Breakdown
Previous operational testing observed:
```text
POST /api/v1/admin/auth/login 200
GET /api/v1/admin/auth/me 401
POST /api/v1/admin/auth/logout 401
```
**Forensic Root Cause Analysis**:
1. **Frontend API Client Bug**: In `frontend/src/services/api.js`, `api.get(endpoint)` was defined with an arity of 1: `(endpoint) => request(endpoint, { method: 'GET' })`. Passing `{ headers: { Authorization: ... } }` as the second argument was completely dropped by JavaScript. Consequently, all requests from `AuthContext.jsx` to `/api/v1/admin/auth/me` reached the Express backend with **no Authorization header**.
2. **Missing Cookie Credential Transmission**: `fetch()` in `api.js` lacked `credentials: 'include'`. As a result, the browser never sent the `konnevia_admin_session` cookie across origins.
3. **Premature Network Logout Call on Initialization**: In `AuthContext.jsx`, a 401 response during the initial session validation triggered `logout()`, which fired `POST /admin/auth/logout` with the already-expired token, generating an unhandled 401 rejection cascade.

### 1.2 Remediated Authentication Architecture
The authentication lifecycle has been redesigned to support dual-mode authentication:
1. **HttpOnly, Secure Cookies** (`konnevia_admin_session`):
   - `httpOnly: true`: Prevents client-side script access, defending against XSS token harvesting.
   - `secure: true` in production (enforcing HTTPS transmission).
   - `sameSite: 'none'` (cross-site HTTPS production with CORS credentials) / `sameSite: 'lax'` (local development).
   - `maxAge`: 12 hours.
2. **Bearer Token Authorization Header** (`Authorization: Bearer <sessionToken>`):
   - Automatically injected by `frontend/src/services/api.js` from secure storage for cross-origin SPA and API clients.
3. **Crypto-Strong Session Token Generation**:
   - Uses Node.js native `crypto.randomBytes(32).toString('hex')` (256 bits of cryptographic entropy).
   - Session tokens are stored in the `Admin` model with `sessionExpiresAt` TTL validation and database index.
4. **Session Revocation on Logout**:
   - `POST /api/v1/admin/auth/logout` sets `admin.sessionToken = null` and `admin.sessionExpiresAt = null` in MongoDB Atlas, and clears the cookie on the response.
   - Any subsequent request using the revoked token is immediately rejected with HTTP 401.

---

## 2. Environment-Based Credentials & Rotation Policy

### 2.1 Zero-Hardcoded Secrets Standard
- Neither default usernames, emails, passwords, nor JWT secrets are baked into source files.
- All credentials are read from backend environment variables:
  ```env
  ADMIN_EMAIL=admin@konnevia.in
  ADMIN_PASSWORD=Konnevia@Admin2026!
  JWT_SECRET=production_strong_secret_key
  MONGODB_URI=mongodb+srv://...
  ```

### 2.2 Password Storage & Verification
- **Algorithm**: Native Node.js `crypto.scryptSync` (memory-hard, resistant to GPU/ASIC brute forcing).
- **Salt**: 16-byte cryptographically random salt per user.
- **Key Length**: 64 bytes (512 bits).
- **Verification**: Constant-time byte comparison using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
- Passwords, hashes, and salts are never returned in API responses.

### 2.3 Safe Startup Provisioning vs Overwrite Prevention
- On server boot (`server.js`), `authService.bootstrapAdmin()` executes:
  - If no admin account exists in MongoDB Atlas, it provisions the initial `SUPER_ADMIN` using environment credentials.
  - If an admin already exists with that email, it **refuses to overwrite** the existing password hash unless `ADMIN_AUTO_ROTATE_PASSWORD=true` or the explicit CLI script is invoked.
  - This guarantees that server restarts or auto-scaling cycles on Render never reset production admin passwords.

### 2.4 Controlled Production Password Rotation Procedure
When rotating administrator credentials in production:
1. Update `ADMIN_PASSWORD` in the production environment dashboard (Render / AWS).
2. Execute the administrative rotation script:
   ```bash
   node src/scripts/bootstrapAdmin.js admin@konnevia.in "NewStrongPassword2026!"
   ```
3. The script:
   - Re-hashes the password with a fresh 16-byte random salt.
   - Updates `passwordRotatedAt` timestamp.
   - **Invalidates all active session tokens**, forcing immediate re-authentication across all active admin browser tabs.
   - Records an immutable `CREDENTIALS_ROTATED` event in `ActivityLog`.

---

## 3. Role-Based Access Control (RBAC) Foundation

### 3.1 Role Hierarchy
- **SUPER_ADMIN** (active in phase): Full platform authority (approvals, delisting, publication, editorial, audit logs, credential rotation).
- **ADMIN** (future-ready): Operational management excluding security settings and credential rotation.
- **OPERATIONS_MANAGER** (future-ready): Provider application review and enquiry dispatch.
- **CONTENT_MANAGER** (future-ready): Blog CMS editorial management.
- **SUPPORT_AGENT** (future-ready): Enquiry read and customer follow-up.

### 3.2 Authorization Middleware
`backend/src/middleware/auth.js` exports:
- `requireAdmin`: Enforces valid session token and non-expired session.
- `requireRole(...allowedRoles)`: Enforces role checks. `SUPER_ADMIN` automatically inherits all role permissions.

---

## 4. Platform Security Controls

### 4.1 Content Security Policy & Security Headers (Helmet)
Configured in `backend/src/app.js`:
- `Content-Security-Policy`:
  - `defaultSrc: ["'self'"]`
  - `scriptSrc: ["'self'", "'unsafe-inline'"]`
  - `styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]`
  - `imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com"]`
  - `connectSrc: ["'self'", "*"]`
- `crossOriginResourcePolicy: { policy: 'cross-origin' }`
- `x-content-type-options: nosniff`
- `x-frame-options: SAMEORIGIN`

### 4.2 Cross-Origin Resource Sharing (CORS) Hardening
- Allows designated production domains (e.g. `https://konnevia.vercel.app`, `https://konnevia.in`, `http://localhost:5173`).
- Rejects wildcards (`*`) when credentials are true, eliminating browser fetch credential rejection.
- Whitelisted headers: `Content-Type`, `Authorization`, `x-admin-token`, `x-request-id`.
- Exposed headers: `x-request-id`.

### 4.3 Input Sanitization & NoSQL Injection Defense
- **Middleware**: `backend/src/middleware/security.js` (`noSqlSanitizerMiddleware`).
- Recursively inspects `req.body`, `req.query`, and `req.params`.
- Strips any keys containing MongoDB operators (`$`) or prototype pollution delimiters (`.`), defeating malicious payloads such as `{"$gt": ""}`.

### 4.4 Rate Limiting & Denial-of-Service Defense
- **Login Limiter**: Max 10 attempts per 15 minutes per IP on `/api/v1/admin/auth/login`.
- **Public Leads Limiter**: Max 10 submissions per 15 minutes per IP on quote, partner, and contact endpoints.

### 4.5 Distributed Request Tracing
- `requestIdMiddleware` generates `x-request-id` (UUID v4) for every incoming HTTP transaction.
- Echoed in response headers and propagated to structured application logs for forensic debugging.

### 4.6 PII Protection & Information Disclosure Prevention
- Production error responses never return stack traces (`err.stack` is suppressed).
- Phone masking: When `consentToDisplayPhone === false`, `contactNumber` is stripped to `null` before public API serialization.
- Draft providers and draft blog articles are strictly filtered out of public queries and dynamic sitemaps.
