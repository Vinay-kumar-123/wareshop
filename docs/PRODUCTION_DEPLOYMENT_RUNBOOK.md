# KONNEVIA — Production Deployment Runbook & Operational Guide
**Document Status:** Production Ready  
**Date:** November 13, 2026  
**Target Environment:** Frontend on Vercel | Backend on Render | Database on MongoDB Atlas  
**Architecture Policy:** Zero TypeScript | Strict Scope-Lock | Separation of Privileges  

---

## 1. Architecture & Infrastructure Topology

```
+-----------------------------------------------------------------------------------+
|                                  KONNEVIA SYSTEM                                  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Customer / Provider ]       [ Search Engines / Crawlers ]        [ Owner ]     |
|             |                                |                         |          |
|             v                                v                         v          |
|    +-------------------+           +-------------------+      +----------------+  |
|    | Vercel SPA Deploy |           |  Render Crawler   |      | Vercel Admin   |  |
|    | (React 19 + Vite) |           |  SEO Prerender    |      | Portal (/admin)|  |
|    +-------------------+           +-------------------+      +----------------+  |
|             |                                |                         |          |
|             | (REST HTTPS API /api/v1)       | (Render API Engine)     | (Secure) |
|             +--------------------------------+-------------------------+          |
|                                              |                                    |
|                                              v                                    |
|                       +---------------------------------------------+             |
|                       |            Render Web Service               |             |
|                       |    (Express Backend - Node.js v22)          |             |
|                       |    - Helmet & CSP Headers                   |             |
|                       |    - Dual Cookie + Bearer Auth Engine       |             |
|                       |    - NoSQL Injection Sanitizer              |             |
|                       |    - Storage Abstraction (Local/Cloudinary) |             |
|                       |    - Dynamic XML Sitemap Generator          |             |
|                       +---------------------------------------------+             |
|                                              |                                    |
|                        +---------------------+---------------------+              |
|                        |                                           |              |
|                        v                                           v              |
|             +---------------------+                     +---------------------+   |
|             |  MongoDB Atlas      |                     |  Media Storage Sink |   |
|             |  Primary Source of  |                     |  - Cloudinary CDN   |   |
|             |  Truth (Replica Set)|                     |  - Local Disk Sink  |   |
|             +---------------------+                     +---------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Owner Pre-Deployment Setup & Required Secrets

The platform owner must complete these steps in their respective cloud consoles before initiating deployment:

### 2.1 Rotate MongoDB Atlas Database Credentials
1. Log into [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to **Database Access** under Security.
3. Select the production user (or create `konnevia_prod_user`).
4. Generate a strong password (minimum 24 characters).
5. Navigate to **Network Access** -> Ensure Render's outbound access is permitted (or `0.0.0.0/0` with strong password authentication).
6. Assemble the production connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/konnevia?retryWrites=true&w=majority
   ```

### 2.2 Configure Owner Admin Credentials in Backend
1. Define the initial `SUPER_ADMIN` email (e.g. `admin@konnevia.in`).
2. Generate a dedicated password (minimum 16 characters).
3. Set in backend environment variables:
   ```env
   ADMIN_EMAIL=admin@konnevia.in
   ADMIN_PASSWORD=YourStrongGeneratedPassword2026!
   JWT_SECRET=your_random_64_byte_hex_secret_here
   ```

### 2.3 Cloud Media Storage (Cloudinary - Optional but Recommended)
1. Register or log into [Cloudinary](https://cloudinary.com/).
2. Copy **Cloud Name**, **API Key**, and **API Secret** from Dashboard.
3. Add to backend environment variables:
   ```env
   STORAGE_PROVIDER=cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_FOLDER=konnevia/providers
   ```
   *(If not configured, the platform automatically defaults to local secure disk storage in `./uploads`)*.

### 2.4 Configure Domain DNS Records
* Target Domain: `konnevia.in` & `www.konnevia.in`
* In your domain DNS manager (GoDaddy, Namecheap, Cloudflare), set:

| Type | Host | Value / Target | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | 300s | Points apex domain to Vercel Anycast IP |
| **CNAME** | `www` | `cname.vercel-dns.com` | 300s | Points www subdomain to Vercel |

---

## 3. Render Backend Deployment Step-by-Step

### Step 3.1: Create Render Web Service
1. Log into [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your Git repository (`LeadManagment`).
4. Configure service parameters:
   - **Name:** `konnevia-backend`
   - **Region:** Singapore (closest to Indian users) or Frankfurt
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Starter ($7/mo recommended for continuous uptime without cold starts)
   - **Health Check Path:** `/health`

### Step 3.2: Configure Environment Variables in Render
In Render Dashboard -> **Environment**, configure:

```env
PORT=8000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/konnevia?retryWrites=true&w=majority
CORS_ORIGIN=https://konnevia.in,https://www.konnevia.in,https://konnevia.vercel.app
ADMIN_EMAIL=admin@konnevia.in
ADMIN_PASSWORD=YourStrongSecretAdminPassword2026!
JWT_SECRET=your_generated_random_64_byte_jwt_secret
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=konnevia/providers
```

---

## 4. Vercel Frontend Deployment Step-by-Step

### Step 4.1: Create Vercel Project
1. Log into [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your Git repository.
4. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Step 4.2: Configure Vercel Environment Variables
In Vercel Project Settings -> **Environment Variables**, add:
```env
VITE_API_BASE_URL=https://konnevia-backend.onrender.com/api/v1
```

---

## 5. Safe Admin Provisioning & Credential Rotation Runbook

### 5.1 Initial Bootstrap Verification
On server boot, `authService.bootstrapAdmin()` checks MongoDB Atlas:
- If no administrator exists, it provisions the initial `SUPER_ADMIN` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- If an admin exists, it verifies the account and **refuses to overwrite** existing hashes.

### 5.2 Safe Password Rotation Procedure
To rotate administrator credentials without deleting user data or causing downtime:
1. Update `ADMIN_PASSWORD` in the Render environment variables dashboard.
2. In the Render Shell or local console connected to Atlas:
   ```bash
   node backend/src/scripts/bootstrapAdmin.js admin@konnevia.in "NewStrongPassword2026!"
   ```
3. The script:
   - Re-hashes the password using `crypto.scryptSync` with a fresh 16-byte random salt.
   - Updates `passwordRotatedAt`.
   - **Invalidates all active session tokens**, immediately terminating all active sessions.
   - Records an immutable `CREDENTIALS_ROTATED` event in `ActivityLog`.
4. Log into `/admin/login` using the new password.

---

## 6. Post-Deployment Smoke Test & Verification Checklist

Execute these verifications immediately following deployment:

- [ ] **Health Endpoint**: `curl https://konnevia-backend.onrender.com/health` returns HTTP 200 with `status: "ok"` and `database: { connected: true }`.
- [ ] **Request ID Tracing**: Response includes `x-request-id` header.
- [ ] **Security Headers**: `curl -I https://konnevia-backend.onrender.com/health` shows `x-content-type-options: nosniff`.
- [ ] **Public Categories**: `GET /api/v1/blogs/categories` returns HTTP 200 with canonical verticals.
- [ ] **XML Sitemap**: `curl https://konnevia-backend.onrender.com/sitemap.xml` returns well-formed XML with static pages and published blog articles.
- [ ] **Admin Login**: Log into `https://konnevia.in/admin/login` with owner credentials.
- [ ] **Admin Session**: Verify `/api/v1/admin/auth/me` returns HTTP 200 with `SUPER_ADMIN` role.
- [ ] **Admin Dashboard**: Overview metrics show real numbers (not zero or mock data).
- [ ] **Provider Onboarding with Shop Photo**: Submit application on `/become-a-partner` with a shop image. Confirm receipt with reference ID.
- [ ] **Application Review**: Inspect application in `/admin/applications`, review shop photo in lightbox, click **Approve & Verify**.
- [ ] **Provider Gating**: Confirm provider appears in `/admin/providers` as `VERIFIED` and `DRAFT`, but returns HTTP 404 on public `/providers/:slug` until published.
- [ ] **Admin Logout**: Click **Logout**. Confirm redirection to `/admin/login` and verify session token is invalidated.

---

## 7. Rollback Procedures

### Frontend Rollback (Vercel)
1. Go to Vercel Dashboard -> **Deployments**.
2. Locate the previous successful deployment.
3. Click **...** -> **Promote to Production**. Instant rollback takes under 10 seconds.

### Backend Rollback (Render)
1. Go to Render Dashboard -> **Deploys**.
2. Click **Rollback** to revert to the previous Git commit.
3. If an environment variable change caused the incident, revert the variable in the Environment tab and trigger manual redeploy.

### Database Recovery (MongoDB Atlas)
1. Navigate to MongoDB Atlas -> **Backup**.
2. Select point-in-time snapshot.
3. Click **Restore** to an alternate temporary cluster or in-place restore.
