# KONNEVIA Admin Panel & Operational Architecture
**Document Version**: 2.0 (Production Release)  
**System**: KONNEVIA Multi-Category Marketplace Operations Panel  
**Design System**: Enterprise SaaS Administration  

---

## 1. Visual Design & Theme System

The KONNEVIA Administration Panel is engineered as a standalone, enterprise SaaS interface strictly following the KONNEVIA brand identity:
- **Primary Navy**: `#142D4E` (Sidebar background, primary headings, branding badges)
- **Primary Teal**: `#13A89E` (Active states, brand accents, primary buttons, focal statistics)
- **Background Slate**: `#F7F9FC` (Workspace canvas, low-contrast neutral surface)
- **Pure White**: `#FFFFFF` (Card containers, tables, modals)
- **Primary Text**: `#172B43` (High-contrast typography)
- **Secondary Text**: `#64748B` (Labels, captions, metadata)

### Decoupled Layout Architecture
In the previous implementation, admin pages were nested inside the consumer `<MainLayout>`, causing public marketplace navigation bars and footers to clutter the administration screen.
**Remediation**:
- In `frontend/src/routes/AppRoutes.jsx`, all `/admin/*` routes are completely decoupled from `MainLayout`.
- Admin routes render a dedicated `<AdminLayout>` featuring a responsive sidebar, top bar with system health indicators, operator profile badges, breadcrumbs, and fast action triggers.

---

## 2. Core Operational Modules (8 Canonical Hubs)

### 2.1 Overview Dashboard (`/admin`)
- **Real-Time Database Metrics**:
  - Customer Leads (Total & New)
  - Partner Submissions (Total & Pending Review)
  - Verified Providers (Published & Draft)
  - Editorial Content (Published & Drafts)
  - *No hardcoded or simulated numbers; all KPIs are driven by live MongoDB queries.*
- **Quick Operational Desk**: Immediate triggers for reviewing pending applications, checking new customer enquiries, and drafting articles.
- **Recent Submissions Stream**: Two-column live view of recent partner registrations and customer quote requests.
- **Recent Audit Trail**: Live ticker of latest administrative actions.

### 2.2 Customer Enquiries & Lead Desk (`/admin/enquiries`)
- Full operational listing of customer quote requests and contact messages.
- Filter by status: `new`, `contacted`, `qualified`, `assigned`, `converted`, `closed`, `rejected`.
- Real-time search across customer names, phone numbers, emails, reference IDs, and categories.
- Deep Inspection Modal: View complete project scope, timelines, estimated budgets, and localities.
- Lifecycle State Transition Control: Allows operators to update enquiry status and record assignments with instant persistence and audit logging.

### 2.3 Partner Applications Desk (`/admin/applications`)
- Management of service provider onboarding applications.
- Filter tabs: `Pending Review`, `Approved`, `Rejected`, `All Submissions`.
- Search by enterprise name, applicant name, phone, or reference ID.
- Detailed Application Review Screen (`/admin/applications/:id`):
  - Shop and establishment image verification viewer with lightbox zoom.
  - Complete business profile, category classification, and offered services list.
  - Physical address, state, PIN code, and coverage localities.
  - Verification consent and phone display consent flags.
  - Single-click **Approve & Verify** action: Automatically provisions a linked `Provider` record as `VERIFIED` and `DRAFT`.
  - Structured **Reject Application** modal requiring a mandatory audit reason.

### 2.4 Verified Providers Directory (`/admin/providers`)
- Catalog of all marketplace provider profiles.
- Filter by Verification Status (`VERIFIED`, `UNVERIFIED`, `REVOKED`) and Publication Status (`PUBLISHED`, `DRAFT`, `ARCHIVED`).
- Profile Editor (`/admin/providers/:id`):
  - Core identity fields: business name, contact person, slug, description, category, services.
  - Physical address: street, city, state, PIN code, service localities.
  - Direct coordinates: phone, email, website.
  - Shop image inspection and storage key verification.
  - Independent status management:
    - **Verification**: `UNVERIFIED` → `VERIFIED` → `REVOKED`.
    - **Publication**: `DRAFT` → `PUBLISHED` → `ARCHIVED`.
  - Phone display consent toggle.
  - Quick publication actions ("Publish to Marketplace" or "Unpublish to Draft").

### 2.5 Categories & Service Taxonomy (`/admin/categories`)
- Structured overview of the 5 canonical marketplace verticals:
  1. Home & Construction
  2. Events & Lifestyle
  3. Business & Property
  4. Digital & Professional Services
  5. Education & Career
- Active sub-services breakdown per vertical.

### 2.6 Blog Editorial CMS (`/admin/blogs`)
- Complete content management system for editorial articles and SEO authority guides.
- Filter articles by `draft`, `published`, or `archived`.
- Rich Editor (`/admin/blogs/new` and `/admin/blogs/:id`):
  - Article title, slug validation, excerpt, and full markdown/HTML content.
  - Category assignment and tags.
  - Cover image URL.
  - SEO metadata (meta title, meta description, related service slug).
  - Draft vs Published state management (with automatic timestamping).
- Soft archive deletion capability.

### 2.7 System Activity & Audit Logs (`/admin/activity-logs`)
- Queryable, tamper-evident audit trail of all operational events.
- Tracks:
  - Timestamp
  - Operator email
  - Action performed (`LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `PROVIDER_UPDATED`, `BLOG_CREATED`, `BLOG_UPDATED`, `BLOG_ARCHIVED`, `CREDENTIALS_ROTATED`)
  - Target entity type (`AUTH`, `LEAD`, `PROVIDER`, `BLOG`, `SETTINGS`)
  - Target ID and sanitized operational details
  - Client IP address and User Agent

### 2.8 Platform Settings & Security (`/admin/settings`)
- Active operator session profile and privilege status.
- Step-by-step production credential rotation runbook.
- Security controls verification (Helmet CSP, CORS allowlist, NoSQL sanitizer, brute-force rate limiters).
- Database connection topology status.

---

## 3. UI/UX Interaction Standards
- **Loading States**: Consistent animated spinners and loading skeletons.
- **Empty States**: Clear icons and contextual guidance when tables or queries return zero results.
- **Error Feedback**: Non-disruptive alert banners with actionable error descriptions.
- **Destructive Actions**: Confirmation modals with mandatory reasons (e.g. application rejection).
- **Mobile Responsiveness**: Adaptive layouts supporting mobile drawers, tablet viewports, and high-density desktop monitors.
