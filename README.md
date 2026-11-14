# KONNEVIA — Multi-Service Marketplace Platform

KONNEVIA is a pan-India service marketplace connecting consumers and businesses with verified professionals across Home & Living, Events & Hospitality, Business & Legal, Digital Services, and Education & Coaching.

---

## Production repository guide

**Discover. Connect. Get Things Done.** KONNEVIA helps customers discover service providers, request quotes, and connect with businesses through one marketplace.

### Implemented features

- Public marketplace pages for categories, services, providers, enquiries, partner applications, blogs, contact, and legal information.
- Provider discovery, profiles, quote/enquiry capture, partner onboarding, and provider shop-image upload support.
- Authenticated admin routes for enquiries, applications, providers, categories, blogs, activity logs, and settings.
- Express API, MongoDB/Mongoose models, `/health`, a dynamic sitemap, and crawler-specific blog rendering.

Marketplace categories currently cover Home & Construction, Events & Lifestyle, Business & Property, Digital & Professional Services, and Education & Career. Planned work is deliberately not represented as available functionality.

### Environment and security

Copy each application’s `.env.example` file to `.env` and set environment values locally or in the deployment host. See [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md). Never commit `.env` files, credentials, customer data, or user uploads; `VITE_` variables are public browser-bundle values and must not contain secrets.

For the initial admin bootstrap, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a unique `JWT_SECRET` in the backend environment. Use Cloudinary configuration for persistent provider shop images in production; Render local disk is not durable.

### Testing and production

Run backend regression tests from `backend` with `npm test` or `npm run test:all`; build the frontend with `cd frontend && npm run build`. Render configuration uses root `backend`, `npm install`, `npm start`, and health check `/health`. Vercel configuration uses root `frontend`, `npm run build`, output `dist`, and `VITE_API_BASE_URL` ending in `/api/v1`.

Keep `frontend/vercel.json` intact: it supplies sitemap, crawler-rendering, and SPA fallback rewrites. See the [deployment guide](docs/deployment.md) and [repository preparation report](docs/GITHUB_REPOSITORY_PREPARATION_REPORT.md).

## Architecture & Project Structure

The project enforces a **clean, decoupled separation** between Frontend and Backend. They are completely independent applications with isolated dependency trees, separate `package.json` files, and independent deployment lifecycles.

```text
konnevia/
│
├── frontend/                     # React 19 + Vite frontend application
│   ├── public/                   # Static assets, logos, favicon, robots.txt
│   ├── src/
│   │   ├── assets/               # Local images and graphic assets
│   │   ├── components/           # Reusable UI components (buttons, cards, forms)
│   │   ├── layouts/              # Shell layouts (Navbar, Footer, MainLayout)
│   │   ├── pages/                # Route-level pages and views
│   │   ├── routes/               # Declarative client routes (AppRoutes.jsx)
│   │   ├── hooks/                # Reusable React hooks (usePageMeta)
│   │   ├── services/             # API client & endpoint abstractions
│   │   ├── utils/                # Helper utilities & validation
│   │   ├── data/                 # Seed data catalogues
│   │   └── styles/               # Tailwind CSS & global styles
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.js            # Vite build configuration
│   ├── tailwind.config.js        # Tailwind CSS configuration
│   ├── postcss.config.js         # PostCSS configuration
│   └── .env.example              # Frontend environment variables template
│
├── backend/                      # Node.js + Express backend application
│   ├── src/
│   │   ├── config/               # Environment & database (MongoDB) config
│   │   ├── controllers/          # Request handlers (Leads, Blogs, Health)
│   │   ├── routes/               # API routes (/api/v1/leads, /api/v1/blogs)
│   │   ├── models/               # Mongoose schemas (Lead, Blog)
│   │   ├── middleware/           # CORS, validation, error handling
│   │   ├── services/             # Business logic & Google Sheets integration
│   │   ├── utils/                # Logger & standard API responses
│   │   └── app.js                # Express app initialization & middleware
│   ├── server.js                 # Server entry point & graceful shutdown
│   ├── package.json              # Backend dependencies
│   └── .env.example              # Backend environment variables template
│
├── docs/                         # Technical architecture and deployment guides
├── .gitignore                    # Root repository ignore rules
└── README.md                     # Root onboarding & operations manual
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection string (optional in dev, fallback mode active)

---

## Getting Started

### 1. Frontend Setup & Local Development

The frontend runs independently on Vite dev server (default port `3000`).

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run frontend development server
npm run dev
```

The frontend application will be accessible at: `http://localhost:3000`

#### Frontend Build (Production)
```bash
cd frontend
npm run build
```
Build output is generated into `frontend/dist/`.

---

### 2. Backend Setup & Local Development

The backend runs independently on Express (default port `5000`).

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run backend development server
npm run dev
```

The backend server will be accessible at: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **API v1 Base**: `http://localhost:5000/api/v1`

---

## Environment Variables Configuration

### Frontend (`frontend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL pointing to the Express backend | `http://localhost:5000/api/v1` |

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port number for Express server | `5000` |
| `NODE_ENV` | Application environment | `development` \| `production` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/konnevia` |
| `CORS_ORIGIN` | Allowed client origin(s), comma-separated | `http://localhost:3000` |
| `GOOGLE_SHEETS_ENABLED` | Toggle Google Sheets sync | `false` \| `true` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Spreadsheet ID for lead capture | `your_spreadsheet_id` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account email address | `service-account@project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Service Account private key | `-----BEGIN PRIVATE KEY-----\n...` |

> **Security Rule**: Never commit `.env` files to git. Never expose backend secrets (MongoDB URI, Google private key) to frontend code or bundles.

---

## Deployment Guide

### Frontend Deployment (Vercel / Netlify)

The frontend is an SPA and can be deployed directly to Vercel or Netlify.

- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Environment Variable**: `VITE_API_BASE_URL=https://your-backend-api.onrender.com/api/v1`

See [docs/deployment.md](docs/deployment.md) for full instructions.

### Backend Deployment (Render)

The backend is a Node.js web service and can be deployed to Render.

- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Health Check Path**: `/health`
- **Environment Variables**: Configure `MONGODB_URI`, `CORS_ORIGIN`, `NODE_ENV=production`, etc., in the Render dashboard.

See [docs/deployment.md](docs/deployment.md) for full instructions.

---

## Independent Verification Checklist

- [x] `cd frontend && npm install && npm run dev` runs independently without backend dependencies.
- [x] `cd backend && npm install && npm run dev` runs independently without frontend dependencies.
- [x] `cd frontend && npm run build` completes successfully.
- [x] Backend starts cleanly on configured `PORT` and provides `/health` check.
- [x] Zero backend files inside `frontend/`.
- [x] Zero frontend files inside `backend/`.
- [x] All Phase 1 marketplace components, pages, routing, SEO, and services intact.
