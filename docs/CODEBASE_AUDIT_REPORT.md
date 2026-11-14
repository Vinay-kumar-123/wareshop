# KONNEVIA Codebase Forensic Audit Report
**Date**: November 13, 2026  
**Auditor**: Principal Software Architect & Security Engineering Team  
**Platform**: KONNEVIA Multi-Category Verified Services Marketplace  
**Scope**: Full Stack Forensic Audit (Frontend, Backend, Database, Security, SEO, Workflows)

---

## 1. Executive Summary

A comprehensive forensic audit of the KONNEVIA codebase was conducted across both `/backend` and `/frontend` directories. The platform's core premise—a high-integrity, multi-category marketplace connecting customers with verified Indian service providers—was analyzed against production standards for security, data integrity, operational UX, and architectural scalability.

The audit uncovered several critical operational and security blockers—most notably the root cause of the reported authentication breakdown (`POST /login 200`, `GET /me 401`, `POST /logout 401`), an admin UI nesting flaw where public layouts engulfed the admin panel, missing HTTP client methods (`api.put`), missing multipart file upload capability for provider shop photos, and lack of an activity log audit trail.

All findings have been categorized by severity, analyzed for root causes, and mapped to remediation actions in subsequent phases.

---

## 2. Inventory & File Health

### 2.1 File System Analysis
- **Total Frontend Source Files**: 43 components, pages, context, and utility modules.
- **Total Backend Source Files**: 21 controllers, models, routes, services, middleware, and utility modules.
- **Shared / Redundant Files Review**:
  - `leadService.js` exists in both `backend/src/services/` and `frontend/src/services/`.
    - *Audit Finding*: This is **not a duplicate**. The backend service encapsulates business rules, MongoDB persistence, and secondary Google Sheets synchronization. The frontend service is a client-side API abstraction. Both are canonical for their respective environments and have been retained.
  - `screenshots/` directory contains legacy Playwright artifacts and node_modules.
    - *Audit Finding*: Confirmed isolated from runtime production builds. Kept as non-production verification artifacts.
  - No orphaned duplicate models (`Blog`, `Lead`, `Provider`, `Admin`) exist in the backend. All data interactions correctly use canonical Mongoose models in `backend/src/models/`.

### 2.2 Unused & Dead Code Review
- `frontend/src/assets/typescript.svg`: Unused boilerplate asset from initial Vite template. Flagged for cleanup.
- Legacy test files in `backend/` (`test-collision.cjs`, `test-collision8.cjs`) are ad-hoc collision test scripts superseded by `run-phase41-tests.js`. Retained for regression records, not executed in standard deployment.

---

## 3. Forensic Findings & Root Cause Analysis

### 3.1 [CRITICAL] Authentication Lifecycle Failure Root Cause
**Reported Symptom**:
```text
POST /api/v1/admin/auth/login 200
GET /api/v1/admin/auth/me 401
POST /api/v1/admin/auth/logout 401
```
**Forensic Root Cause**:
1. **Frontend Request Parameter Dropping**:
   In `frontend/src/services/api.js`, the export was declared as:
   ```javascript
   export const api = {
     get: (endpoint) => request(endpoint, { method: 'GET' }),
     post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
   };
   ```
   When `AuthContext.jsx` invoked:
   ```javascript
   api.get('/admin/auth/me', { headers: { Authorization: `Bearer ${token}` } })
   ```
   The second parameter (`{ headers: ... }`) was completely dropped by `api.get`! The outgoing fetch request contained **no Authorization header**.
2. **Missing Cookie Credential Transmission**:
   `request()` in `frontend/src/services/api.js` did not specify `credentials: 'include'`. As a result, the browser never sent the `konnevia_admin_session` cookie on cross-origin or proxy requests.
3. **Missing HTTP Verbs**:
   `api.put`, `api.patch`, and `api.delete` were completely omitted from `api.js`. Calls such as `api.put('/admin/blogs/:id')` in `AdminBlogEditorPage.jsx` threw runtime errors.
4. **CORS Header Restrictions**:
   `backend/src/app.js` allowed only `['Content-Type', 'Authorization']`, preventing custom headers such as `x-admin-token` or `x-request-id` from passing browser preflight checks.

### 3.2 [HIGH] Admin Panel UX Architecture Defect
**Forensic Root Cause**:
In `frontend/src/routes/AppRoutes.jsx`, all routes—including `/admin/*`—were wrapped within `<MainLayout>`.
`<MainLayout>` forcefully renders the public consumer `<Navbar />` and `<Footer />`.
Consequently, the admin portal was rendered inside the customer header and footer, creating an awkward, unprofessional double-navbar layout rather than a standalone SaaS administration workspace.

### 3.3 [HIGH] Provider Onboarding: Missing Shop Image Upload Pipeline
**Forensic Root Cause**:
1. Neither `multer` nor any multipart middleware was installed in `backend/package.json`.
2. The partner application page (`BecomePartnerPage.jsx`) only captured text inputs without shop image selection, preview, or upload capabilities.
3. Neither `Lead` nor `Provider` models had structured metadata schemas for shop images (`url`, `publicId`, `mimeType`, `size`, `originalName`, `uploadedAt`).
4. Admin application review and provider edit screens had no preview or review interface for uploaded shop photos.

### 3.4 [HIGH] Environment Loading & Port Discrepancies
**Forensic Root Cause**:
1. `backend/src/config/env.js` invoked `dotenv.config()` without a specific path, resolving only against `process.cwd()`. When tests or tools ran from the repository root (`D:\projects\LeadManagment`), `backend/.env` was ignored, causing connection timeouts to `localhost:27017`.
2. `backend/.env` configured `PORT=8000`, while automated test suites (`test-admin-mvp.cjs`, `test-phase52.cjs`, `test-seo-infrastructure.cjs`) defaulted to `http://localhost:5000`.

### 3.5 [MEDIUM] Missing Activity Log / Audit Trail
**Forensic Root Cause**:
No database schema or controller existed to record administrative mutations (approvals, rejections, publications, logins, credential updates). Administrative changes were only logged to stdout without queryable persistence.

---

## 4. Architectural Cleanup & Consolidation Plan

| Area | Current State | Remediation Action | Status |
| :--- | :--- | :--- | :--- |
| **API Client** | `api.js` drops options; missing PUT/PATCH/DELETE | Rewrite `api.js` with full verb support, credentials, auto-auth injection | Planned Phase 2 |
| **Auth Middleware** | Session lookup only; no RBAC roles | Implement `requireAdmin` + `requireRole` RBAC helper | Planned Phase 2 |
| **Admin Credentials** | Manual bootstrap CLI script only | Environment-based bootstrap + safe rotation with session invalidation | Planned Phase 2 |
| **Security Headers** | Basic Helmet + unaligned CORS | Harden Helmet CSP, configure strict CORS with credentials and request IDs | Planned Phase 2 |
| **Admin Layout** | Nested inside public `MainLayout` | Split `AppRoutes` to render clean `AdminLayout` without public header/footer | Planned Phase 3 |
| **Admin Modules** | 4 tabs (Overview, Apps, Providers, Blogs) | Expand to 8 tabs (+ Enquiries, Categories, Settings, Activity Logs) | Planned Phase 3 |
| **Shop Image Upload** | Absent in backend and frontend | Install `multer`, create `storageService.js`, add UI image picker + preview | Planned Phase 4 |
| **Database Models** | Missing `ActivityLog` & `shopImage` schemas | Extend `Lead`, `Provider`, `Admin` schemas; create `ActivityLog` model | Planned Phase 5 |
| **Backend Domains** | Mixed controller/service boundaries | Modularize route-controller-service layers by business domain | Planned Phase 6 |
| **Testing Suite** | Port mismatch & incomplete coverage | Align test ports, add comprehensive end-to-end regression tests | Planned Phase 7 |

---

## 5. Preservation Guarantees
- **No breaking schema changes**: All existing `Lead`, `Provider`, and `Blog` fields are preserved.
- **Public marketplace integrity**: All public search, category browsing, quote enquiries, and partner registrations remain 100% operational.
- **SEO & Dynamic Sitemap**: Prerendering on `/render/blog/:slug` and `/sitemap.xml` will be preserved and verified.
- **Tech Stack Compliance**: 100% vanilla JavaScript (ES modules for Node, JSX for Vite/React). Zero TypeScript introduced.
