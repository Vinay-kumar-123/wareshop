# WARESHOP — Environment Configuration Guide

This guide documents all environment variables required for the WARESHOP Backend (`backend/`) and Frontend (`frontend/`) across Development, Test, and Production environments.

---

## 1. Backend Environment Variables (`backend/.env`)

Template file: `backend/.env.example`

### Core Server & Database

| Variable | Required in Prod | Default (Dev) | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** (`production`) | `development` | Execution mode (`development`, `test`, `production`). Also inferred as `production` when `RENDER=true`. |
| `PORT` | No | `8001` | HTTP listening port (Render injects `PORT` automatically). |
| `TRUST_PROXY` | No | `1` | Number of trusted reverse-proxy hops (`1` for Render load balancer so `req.ip` is extracted accurately). |
| `MONGODB_URI` | **Yes** | `mongodb://localhost:27017/wareshop_dev` | MongoDB connection string. In production, `localhost`/`127.0.0.1` URIs are rejected at startup. |
| `MONGODB_DB_NAME` | **Yes** | `wareshop_dev` | Explicit MongoDB database name passed to `mongoose.connect()`. In production, `"test"` is rejected to prevent accidental writes to Atlas default `test` DB. |
| `CORS_ORIGIN` | **Yes** | `http://localhost:5173` | Comma-separated allow-list of frontend origins (e.g. `https://wareshop.in,https://www.wareshop.in`). Wildcard `*` is rejected in production. |
| `PUBLIC_SITE_URL` | **Yes** | `http://localhost:5173` | Canonical public frontend URL used for `/sitemap.xml` generation. |
| `PUBLIC_API_URL` | No | `http://localhost:8001` | Public base URL of the backend API. |

### Administrator Authentication

| Variable | Required in Prod | Default (Dev) | Description |
| :--- | :--- | :--- | :--- |
| `ADMIN_EMAIL` | **Yes** | *(none)* | Initial owner (`SUPER_ADMIN`) email used by `npm run bootstrap:admin`. Zero hardcoded defaults exist in source code. |
| `ADMIN_PASSWORD` | **Yes** | *(none)* | Initial owner password (minimum 12 chars with uppercase, lowercase, number, and symbol). |
| `ADMIN_SESSION_DURATION_HOURS` | No | `12` | Server-side Bearer session lifetime in hours (`1`–`72`). |

### Provider 2Factor OTP Authentication

| Variable | Required in Prod | Default (Dev) | Description |
| :--- | :--- | :--- | :--- |
| `OTP_HMAC_SECRET` | **Yes** | *(derived dev secret)* | Secret key (minimum 32 characters) used for `HMAC-SHA256(phone:otp)` hashing. |
| `TWOFACTOR_API_KEY` | **Yes** | *(none)* | Live API key from [2Factor.in](https://2factor.in) for server-side SMS OTP dispatch. Never expose to frontend. |
| `TWOFACTOR_OTP_TEMPLATE` | Recommended | *(none)* | Approved DLT SMS template name registered in 2Factor. |
| `TWOFACTOR_BASE_URL` | No | `https://2factor.in/API/V1` | Base URL for 2Factor Manual OTP endpoint (`GET /{api_key}/SMS/+91{phone}/{otp}/{template}`). |
| `OTP_EXPIRY_MINUTES` | No | `5` | OTP validity window in minutes. |
| `OTP_MAX_ATTEMPTS` | No | `5` | Maximum verification attempts before an OTP challenge is permanently locked. |
| `OTP_RESEND_COOLDOWN_SECONDS` | No | `60` | Minimum cooldown between OTP sends for the same mobile number. |
| `OTP_MAX_PER_PHONE_PER_DAY` | No | `5` | Maximum SMS dispatches per mobile number per 24-hour rolling window. |
| `OTP_MAX_GLOBAL_PER_HOUR` | No | `200` | Global hourly SMS circuit-breaker cap to prevent SMS pumping attacks. |

### Image Storage (Cloudinary)

| Variable | Required in Prod | Default (Dev) | Description |
| :--- | :--- | :--- | :--- |
| `STORAGE_DRIVER` | **Yes** (`cloudinary`) | `local` | Image storage backend (`cloudinary` in production; `local` or `cloudinary` in development). |
| `CLOUDINARY_CLOUD_NAME` | **Yes** (if cloudinary) | *(none)* | Cloudinary Cloud Name. |
| `CLOUDINARY_API_KEY` | **Yes** (if cloudinary) | *(none)* | Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | **Yes** (if cloudinary) | *(none)* | Cloudinary API Secret (server-side only, used for signed uploads & deletions). |
| `CLOUDINARY_FOLDER` | No | `wareshop/providers` | Target folder in Cloudinary media library. |

### Public Contact Reveal Rate Limiting

| Variable | Required in Prod | Default (Dev) | Description |
| :--- | :--- | :--- | :--- |
| `CONTACT_REVEAL_WINDOW_MS` | No | `900000` (15m) | Rate-limit window in milliseconds for `GET /api/v1/providers/:slug/contact`. |
| `CONTACT_REVEAL_MAX_REQUESTS` | No | `30` | Maximum contact reveals per IP within the window. |

---

## 2. Frontend Environment Variables (`frontend/.env`)

Template file: `frontend/.env.example`

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `http://localhost:8001/api/v1` | Full URL to the WARESHOP Backend `/api/v1` router (e.g. `https://wareshop-backend.onrender.com/api/v1`). |

> **Security Note**: Never place `TWOFACTOR_API_KEY`, `CLOUDINARY_API_SECRET`, `OTP_HMAC_SECRET`, or `ADMIN_PASSWORD` in `frontend/.env` or prefix them with `VITE_`.

---

## 3. Generating Cryptographic Secrets

Run the following Node.js one-liner to generate a strong 64-character hex secret for `OTP_HMAC_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
