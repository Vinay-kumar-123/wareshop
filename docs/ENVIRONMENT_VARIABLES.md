# KONNEVIA Environment Variables Specification
**Document Version**: 2.0 (Production Release)
**Security Level**: Confidential Configuration Template

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default / Example | Purpose & Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | Port on which Express HTTP server listens. |
| `NODE_ENV` | Yes | `development` / `production` | Runtime mode. Controls stack traces, cookie security, logging level. |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | MongoDB connection string (Atlas replica set). |
| `CORS_ORIGIN` | Yes | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed frontend origins. Never use `*` with credentials in production. |
| `ADMIN_EMAIL` | Yes | `admin@konnevia.in` | Canonical email address of initial `SUPER_ADMIN`. |
| `ADMIN_PASSWORD` | Yes | *Strong secret* | Initial bootstrap password. Never commit plain passwords to Git. |
| `JWT_SECRET` | Yes | *Random 64-byte hex* | Cryptographic secret for signing tokens. |
| `ADMIN_AUTO_ROTATE_PASSWORD` | No | `false` | If `true`, resets admin password from `ADMIN_PASSWORD` on restart. Keep `false` in production. |
| `STORAGE_PROVIDER` | No | `local` | Media storage provider: `local` (filesystem) or `cloudinary` (cloud storage). |
| `UPLOAD_DIR` | No | `./uploads` | Filesystem destination directory when `STORAGE_PROVIDER=local`. |
| `MAX_FILE_SIZE_MB` | No | `5` | Maximum permissible file upload size in megabytes. |
| `CLOUDINARY_CLOUD_NAME` | Conditional | *Cloudinary name* | Cloudinary cloud identifier (required if `STORAGE_PROVIDER=cloudinary`). |
| `CLOUDINARY_API_KEY` | Conditional | *API Key* | Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | Conditional | *API Secret* | Cloudinary API Secret. |
| `CLOUDINARY_FOLDER` | No | `konnevia/providers` | Cloudinary asset folder for provider shop images. |

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable Name | Required | Default / Example | Purpose & Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `http://localhost:5000/api/v1` | Base REST API URL of the Express backend. In production, set this to the deployed Render API URL ending in `/api/v1`. |

> [!CAUTION]
> **Vite Environment Variable Security**:
> Only variables prefixed with `VITE_` are bundled into browser assets. Never prefix database URIs, passwords, or cloud storage secrets with `VITE_`.
