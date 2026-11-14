import Blog from '../models/Blog.js';
import env from '../config/env.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

// High-quality structured fallback sample articles for development / preview
export const defaultBlogs = [
  {
    title: 'How to Choose the Right Home Interior Designer in India',
    slug: 'how-to-choose-interior-designer',
    excerpt: 'Key scoping questions, budget allocation principles, and portfolio verification guidelines before commissioning home interiors.',
    category: 'Home & Construction',
    tags: ['Interior Design', 'Home Renovation', 'Budgeting'],
    coverImage: '/assets/blog/interior-guide.jpg',
    readingTimeMinutes: 6,
    status: 'published',
    publishedAt: new Date('2026-01-15T10:00:00.000Z'),
    metaTitle: 'How to Choose the Right Home Interior Designer — KONNEVIA Editorial',
    metaDescription: 'Essential steps to evaluate interior design firms, structure turnkey contracts, and verify credentials across India.',
    relatedServiceSlug: 'interior-design',
    isDevSample: true,
    author: { name: 'Priya Sharma', role: 'Architecture & Design Lead' },
    content: `### 1. Define Your Scope Before Reaching Out

The most common point of friction in residential interior design is an ambiguous starting scope. Before meeting architects or design contractors, categorize your requirements into:

- **Civil structural changes:** Wall removal, plumbing shifts, electrical rerouting.
- **Modular woodwork:** Kitchen layouts (L-shaped, island), wardrobes, entertainment units.
- **Finishes & aesthetics:** Paint formulations, false ceiling detail, accent wall panels.

Having a crisp room-by-room wishlist enables prospective designers to produce actionable concept proposals rather than arbitrary estimates.

---

### 2. Turnkey Execution vs. Design-Only Consultancy

In India, interior professionals generally operate under two delivery models:

1. **Design Consultancy Only:** The designer creates 2D layouts, 3D renderings, and bill of quantities (BOQ). You hire separate carpenters and vendors.
2. **Turnkey Execution:** The firm owns the entire project from material procurement to on-site carpentry, civil work, and handover.

For busy working professionals, turnkey contracts provide single-point accountability and guaranteed timelines, while consultancy offers granular cost control for experienced renovators.

---

### 3. Verify Realistic Milestone Schedules

Quality interior fit-outs for a standard 2BHK or 3BHK typically require **45 to 75 working days** post-design sign-off. Be cautious of contractors promising unrealistic 20-day completions for full woodwork, as adhesives, laminates, and civil curing demand rigorous drying times to avoid future warping.`,
  },
  {
    title: 'Wedding & Event Budget Planning: Practical Allocations',
    slug: 'wedding-event-budget-planning-guide',
    excerpt: 'A disciplined line-item framework for destination and local wedding productions across Indian venues.',
    category: 'Events & Lifestyle',
    tags: ['Wedding Planning', 'Event Management', 'Budgeting'],
    coverImage: '/assets/blog/event-guide.jpg',
    readingTimeMinutes: 7,
    status: 'published',
    publishedAt: new Date('2026-02-01T11:00:00.000Z'),
    metaTitle: 'Wedding & Event Budget Planning Guide — KONNEVIA Insights',
    metaDescription: 'Practical line-item budgeting for Indian weddings, covering venue negotiations, catering splits, and vendor contracts.',
    relatedServiceSlug: 'wedding-planning',
    isDevSample: true,
    author: { name: 'Rajesh Nair', role: 'Event Operations Consultant' },
    content: `### 1. The Core 50-20-15-15 Budget Formula

Modern celebrations require balanced cash flow management. A reliable starting allocation for medium-to-large events:

- **50% — Venue & Hospitality:** Room bookings, per-plate food and beverage, banquet rentals.
- **20% — Decor & Production:** Floral styling, stage lighting, sound engineering, theme fabrication.
- **15% — Media & Memories:** Candid photography, cinematic wedding films, pre-wedding documentation.
- **15% — Contingency & Logistics:** Local transfers, hospitality desks, shadow planners, licensing.

---

### 2. Securing Written Vendor SLAs

Never settle milestone payments without an executed Scope of Work (SOW) detailing:
- Number of active camera operators and backup cameras on-site.
- Fresh floral delivery schedules (minimum 6 hours before guest arrival).
- Explicit sound decibel permits and local municipality compliance.`,
  },
  {
    title: 'Corporate Website Redesign Checklist for High Performance',
    slug: 'corporate-website-redesign-performance-checklist',
    excerpt: 'How growing enterprises can re-engineer their web presence for Google Core Web Vitals, conversion architecture, and code ownership.',
    category: 'Digital & Professional Services',
    tags: ['Website Development', 'SEO', 'Software'],
    coverImage: '/assets/blog/tech-guide.jpg',
    readingTimeMinutes: 5,
    status: 'published',
    publishedAt: new Date('2026-02-20T09:30:00.000Z'),
    metaTitle: 'Corporate Website Redesign Checklist — KONNEVIA Insights',
    metaDescription: 'Technical guide to planning an enterprise website redesign with focus on performance, IP ownership, and technical SEO.',
    relatedServiceSlug: 'website-development',
    isDevSample: true,
    author: { name: 'Kunal Sen', role: 'Digital Engineering Lead' },
    content: `### 1. Own Your Source Code and Infrastructure

Many agencies lock clients into proprietary site-builders or inaccessible hosting accounts. When commissioning a new web application or marketing portal, mandate:
- Repository ownership on GitHub/GitLab from day one.
- Domain DNS access retained within your organization.
- Standalone headless or componentized architecture (React, Node, standard CSS).

---

### 2. Benchmark Google Core Web Vitals Early

Design mockups look beautiful in static Figma canvases, but real conversion depends on:
- **LCP (Largest Contentful Paint):** Sub-2.5 seconds on mobile 4G networks.
- **CLS (Cumulative Layout Shift):** Near zero layout movement during asset rendering.
- **INP (Interaction to Next Paint):** Smooth responsiveness upon clicking forms and navigation menus.`,
  },
];

export const blogController = {
  /**
   * GET /api/v1/blogs
   * Public list of published articles with pagination, category filter, and search
   */
  async getBlogs(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));
      const category = (req.query.category || '').trim();
      // B1 Fix: Cap search input to 200 characters before any regex construction
      const search = (req.query.search || '').trim().slice(0, 200);

      const isDbConnected = mongoose.connection.readyState === 1;

      // Base query: ONLY published articles are returned via public API
      const query = { status: 'published' };

      if (category) {
        query.category = new RegExp(`^${category}$`, 'i');
      }

      if (search) {
        const cleanSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { title: { $regex: cleanSearch, $options: 'i' } },
          { excerpt: { $regex: cleanSearch, $options: 'i' } },
          { tags: { $regex: cleanSearch, $options: 'i' } },
        ];
      }

      let articles = [];
      let total = 0;

      if (isDbConnected) {
        try {
          articles = await Blog.find(query)
            .select('-content') // exclude heavy content body from list endpoint
            .sort({ publishedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
          total = await Blog.countDocuments(query);
        } catch (dbErr) {
          logger.warn('Failed querying articles from MongoDB, falling back to seed data', { error: dbErr.message });
        }
      }

      // B2 Fix: Only fall back to defaultBlogs when DB is genuinely disconnected.
      // A connected DB returning 0 results for a valid query returns empty — no seeded content injected.
      if (!isDbConnected && articles.length === 0) {
        let filtered = defaultBlogs.filter((b) => b.status === 'published');
        if (category) {
          filtered = filtered.filter((b) => b.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
          const sLower = search.toLowerCase();
          filtered = filtered.filter(
            (b) =>
              b.title.toLowerCase().includes(sLower) ||
              b.excerpt.toLowerCase().includes(sLower) ||
              b.tags.some((t) => t.toLowerCase().includes(sLower))
          );
        }

        total = filtered.length;
        // B3 Fix: Strip `content` field from fallback list responses to match DB query path behaviour
        articles = filtered.slice((page - 1) * limit, page * limit).map(({ content: _, ...rest }) => rest);
      }

      return successResponse(res, {
        blogs: articles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (err) {
      logger.error('Error fetching blog list', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /api/v1/blogs/categories
   * Returns distinct categories of published articles
   */
  async getCategories(req, res, next) {
    try {
      const isDbConnected = mongoose.connection.readyState === 1;
      let categories = [];

      if (isDbConnected) {
        try {
          categories = await Blog.distinct('category', { status: 'published' });
        } catch (dbErr) {
          logger.warn('Failed distinct category query, using fallback', { error: dbErr.message });
        }
      }

      if (!categories || categories.length === 0) {
        categories = [...new Set(defaultBlogs.map((b) => b.category))];
      }

      return successResponse(res, categories.filter(Boolean));
    } catch (err) {
      logger.error('Error fetching blog categories', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /api/v1/blogs/:slug
   * Retrieves single published article by slug
   */
  async getBlogBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const cleanSlug = (slug || '').toLowerCase().trim();

      const isDbConnected = mongoose.connection.readyState === 1;
      let blog = null;

      if (isDbConnected) {
        try {
          // Strictly published articles only
          blog = await Blog.findOne({ slug: cleanSlug, status: 'published' }).lean();
        } catch (dbErr) {
          logger.warn('Failed querying article by slug in MongoDB', { slug: cleanSlug, error: dbErr.message });
        }
      }

      if (!blog) {
        blog = defaultBlogs.find((b) => b.slug === cleanSlug && b.status === 'published');
      }

      if (!blog) {
        return errorResponse(res, `Editorial article with slug "${cleanSlug}" was not found or is unpublished.`, 404);
      }

      // Fetch related articles (same category, different slug)
      let related = [];
      if (isDbConnected) {
        try {
          related = await Blog.find({
            category: blog.category,
            slug: { $ne: blog.slug },
            status: 'published',
          })
            .select('title slug excerpt coverImage readingTimeMinutes publishedAt category')
            .limit(3)
            .lean();
        } catch (relErr) {
          // silent fallback
        }
      }

      if (related.length === 0) {
        related = defaultBlogs
          .filter((b) => b.category === blog.category && b.slug !== blog.slug && b.status === 'published')
          .slice(0, 3);
      }

      return successResponse(res, {
        ...blog,
        relatedArticles: related,
      });
    } catch (err) {
      logger.error('Error fetching blog detail', { error: err.message });
      next(err);
    }
  },
};

export default blogController;
