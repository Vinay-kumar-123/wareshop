# WARESHOP — Production Deployment Guide

This guide covers deploying the WARESHOP MVP across **MongoDB Atlas** (Database), **Cloudinary** (Durable Image Storage), **2Factor.in** (SMS OTP Gateway), **Render** (Node.js/Express Backend), and **Vercel** (React/Vite Frontend).

---

## 1. Prerequisites & External Services Setup

### A. MongoDB Atlas
1. Create a dedicated production cluster in MongoDB Atlas.
2. Create a database user with `readWrite` privileges scoped strictly to the `wareshop_prod` database (do not use `atlasAdmin` for the application runtime).
3. Set `MONGODB_DB_NAME=wareshop_prod` and include `/wareshop_prod?retryWrites=true&w=majority` in `MONGODB_URI`.
4. Configure Network Access IP Allow-List for Render's outbound static IPs (or restrict appropriately).
5. Enable Automated Cloud Backups / Point-in-Time Restore (PITR).

### B. Cloudinary
1. Create a Cloudinary environment and note your `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
2. Set `STORAGE_DRIVER=cloudinary` and `CLOUDINARY_FOLDER=wareshop/providers` on Render.
3. Why this is mandatory: Render's local disk is ephemeral and wiped on every deploy/restart. WARESHOP validates image magic bytes, strips EXIF/GPS metadata in memory, and uploads directly to Cloudinary via signed server-side REST calls.

### C. 2Factor.in SMS OTP Gateway
1. Log in to your [2Factor.in](https://2factor.in) dashboard.
2. Ensure your DLT Principal Entity and OTP SMS template (e.g., `WARESHOP_OTP`) are approved and active.
3. Copy your API key into `TWOFACTOR_API_KEY` and template name into `TWOFACTOR_OTP_TEMPLATE` on Render.

---

## 2. Backend Deployment on Render

1. Create a new **Web Service** on Render connected to the repository.
2. Configure Service Settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Node` (Node 18+ or 20 LTS)
   - **Build Command**: `npm ci`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health/ready`
3. Configure Environment Variables in the Render Dashboard:
   - `NODE_ENV=production`
   - `TRUST_PROXY=1`
   - `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/wareshop_prod?retryWrites=true&w=majority`
   - `MONGODB_DB_NAME=wareshop_prod`
   - `CORS_ORIGIN=https://wareshop.in,https://www.wareshop.in`
   - `PUBLIC_SITE_URL=https://wareshop.in`
   - `PUBLIC_API_URL=https://api.wareshop.in` (or your `.onrender.com` URL)
   - `ADMIN_EMAIL=owner@wareshop.in`
   - `ADMIN_PASSWORD=<strong-12+-char-password>`
   - `OTP_HMAC_SECRET=<64-char-hex-secret>`
   - `TWOFACTOR_API_KEY=<live-2factor-api-key>`
   - `TWOFACTOR_OTP_TEMPLATE=<approved-dlt-template>`
   - `STORAGE_DRIVER=cloudinary`
   - `CLOUDINARY_CLOUD_NAME=<cloud-name>`
   - `CLOUDINARY_API_KEY=<api-key>`
   - `CLOUDINARY_API_SECRET=<api-secret>`
   - `CLOUDINARY_FOLDER=wareshop/providers`
4. Provision Initial Owner Account:
   - Automatic admin creation on startup is disabled in production (`NODE_ENV=production`).
   - Run the one-time CLI bootstrap command from the Render Shell:
     ```bash
     npm run bootstrap:admin
     ```
5. Seed Initial Categories (if not auto-initialized on first request):
   - Default categories (`Shop`, `Office`, `Warehouse`, `Godown`) are automatically ensured via `ensureDefaultCategories()` on first read.

---

## 3. Frontend Deployment on Vercel

1. Import the repository into **Vercel**.
2. Configure Project Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Configure Environment Variables in Vercel:
   - `VITE_API_BASE_URL=https://<your-render-backend-domain>/api/v1`
4. Security Headers & SPA Routing:
   - `frontend/vercel.json` is pre-configured with `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, immutable asset caching, and SPA fallback routing (`/(.*) -> /index.html`).

---

## 4. Post-Deployment Verification Checklist

1. **Liveness Probe**: `GET https://<backend>/health/live` returns `200 OK` (`{"status":"alive"}`).
2. **Readiness Probe**: `GET https://<backend>/health/ready` returns `200 OK` (`{"ready":true,"database":{"connected":true}}`).
3. **CORS Verification**: Verify requests from your Vercel origin succeed while unauthorized origins receive `403 ERR_CORS_BLOCKED`.
4. **Public Marketplace**: Verify `/`, `/categories`, `/providers` load live categories and published listings without errors.
5. **Provider OTP Flow**: On `/become-a-partner`, request an OTP to a real Indian mobile number, verify delivery via 2Factor, sign in, and submit a test listing with a photo.
6. **Admin Approval & Publish Flow**: Log in at `/admin/login`, approve the test application (`SUBMITTED -> APPROVED`), publish the listing (`APPROVED -> PUBLISHED`), and confirm it appears on `/providers` with working direct owner phone reveal (`tel:+91...`).
