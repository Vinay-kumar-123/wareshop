# KONNEVIA Architecture & Separation Specification

## Overview

KONNEVIA is architected with strict, decoupled separation between the client presentation layer (**Frontend**) and the server business/persistence layer (**Backend**).

```text
konnevia/
│
├── frontend/                     # Standalone React 19 + Vite client application
│   ├── public/                   # Static browser assets (favicons, manifest, logos)
│   ├── src/
│   │   ├── assets/               # Local bundled illustrations, icons, stylesheets
│   │   ├── components/           # Reusable presentational components (Buttons, Cards, Inputs)
│   │   ├── layouts/              # Shell layouts (Navbar, Footer, MainLayout)
│   │   ├── pages/                # Route-level views & pages (Home, Categories, Services, etc.)
│   │   ├── routes/               # Declarative client-side routing (AppRoutes.jsx)
│   │   ├── hooks/                # Custom React hooks (SEO metadata, screen listeners)
│   │   ├── services/             # HTTP API abstraction layer (api.js, leadService, blogService)
│   │   ├── utils/                # Pure helper functions (validation, formatting, SEO)
│   │   ├── data/                 # Seed data catalogues (categories, providers, services)
│   │   └── styles/               # Global Tailwind CSS definitions
│   ├── package.json              # Frontend-only dependencies (React, Vite, Tailwind)
│   ├── vite.config.js            # Build bundler configuration
│   ├── tailwind.config.js        # Design tokens and styling configuration
│   ├── postcss.config.js         # PostCSS pipeline plugins
│   └── .env.example              # Public frontend environment template
│
├── backend/                      # Standalone Node.js + Express REST API
│   ├── src/
│   │   ├── config/               # Environment & Database (MongoDB) configuration
│   │   ├── controllers/          # Endpoint controllers (Leads, Blogs, Health)
│   │   ├── routes/               # Express router declarations (/leads, /blogs)
│   │   ├── models/               # Mongoose schemas (Lead, Blog)
│   │   ├── middleware/           # CORS, validation, error handling middleware
│   │   ├── services/             # Business logic & Google Sheets integration
│   │   ├── utils/                # Structured logger & standard API response builders
│   │   └── app.js                # Express app setup & middleware chain
│   ├── server.js                 # HTTP listener & process lifecycle manager
│   ├── package.json              # Backend-only dependencies (Express, Mongoose, GoogleAPIs)
│   └── .env.example              # Private backend environment template
│
├── docs/                         # Project architecture & deployment documentation
├── .gitignore                    # Root repository ignore rules
└── README.md                     # Root onboarding, development & deployment guide
```

---

## Separation Principles

1. **Zero Code Co-mingling**:
   - The `frontend/` directory contains zero Node.js server files, Express middleware, MongoDB credentials, or database connectors.
   - The `backend/` directory contains zero React components, JSX templates, HTML files, or client-side build tools.

2. **Independent Dependency Graphs**:
   - Each application maintains its own `package.json` and isolated `node_modules`.
   - Running `npm install` inside one application does not affect the other.

3. **Secure Boundary Enforcement**:
   - All external private secrets (MongoDB connection string, Google Service Account private keys) reside exclusively within the backend runtime environment.
   - Frontend communicates with the backend exclusively via standard HTTP REST API endpoints using `VITE_API_BASE_URL`.
