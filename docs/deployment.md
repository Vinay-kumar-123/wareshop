# KONNEVIA Deployment Guide

This guide details how to deploy the frontend and backend applications to independent hosting providers.

---

## 1. Frontend Deployment (Vercel / Netlify)

The frontend is a static Single Page Application (SPA) built with Vite and React.

### Recommended Providers:
- **Vercel**
- **Netlify**
- **Cloudflare Pages**

### Vercel Deployment Instructions:
1. Link your Git repository in Vercel.
2. Configure **Root Directory**: `frontend`.
3. Set **Framework Preset**: `Vite`.
4. Build Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Configure Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-backend-domain.onrender.com/api/v1`
6. Deploy!
   *Note: `frontend/vercel.json` is provided in the repository to automatically proxy `/sitemap.xml` and route crawler requests to the backend SEO prerender engine (`/render/blog/:slug`).*

### Netlify Deployment Instructions:
1. Connect your repository to Netlify.
2. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. Verify `frontend/public/_redirects`:
   ```text
   /sitemap.xml    https://your-backend-domain.onrender.com/sitemap.xml 200!
   /render/blog/*  https://your-backend-domain.onrender.com/render/blog/:splat 200!
   /*              /index.html   200
   ```
4. Configure Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-backend-domain.onrender.com/api/v1`

---

## 2. Backend Deployment (Render)

The backend is a Node.js Express service with MongoDB database connectivity and Google Sheets sync capabilities.

### Recommended Provider:
- **Render** (Web Service)

### Render Deployment Instructions:
1. Create a **New Web Service** from your repository.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/health`
3. Configure Environment Variables in the Render Dashboard:
   - `PORT`: `10000` (Render default or omit to let Render assign)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://<user>:<password>@cluster.mongodb.net/konnevia?retryWrites=true&w=majority`
   - `CORS_ORIGIN`: `https://konnevia.vercel.app` (your live frontend domain)
   - `GOOGLE_SHEETS_ENABLED`: `true` (or `false` if not yet configured)
   - `GOOGLE_SHEETS_SPREADSHEET_ID`: `<your_sheet_id>`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `<service-account>@<project>.iam.gserviceaccount.com`
   - `GOOGLE_PRIVATE_KEY`: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
4. Deploy the service.

---

## 3. Post-Deployment Verification

1. **Verify Backend Health**:
   ```bash
   curl -I https://your-backend-domain.onrender.com/health
   # Expected response: 200 OK
   ```

2. **Verify Frontend Access & API Integration**:
   - Open your deployed frontend domain in your browser.
   - Navigate to `/get-quote` or `/become-a-partner`.
   - Submit a test lead to ensure CORS headers permit requests and records are captured.
