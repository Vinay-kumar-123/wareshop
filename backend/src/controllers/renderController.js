import mongoose from 'mongoose';
import Blog from '../models/Blog.js';
import { defaultBlogs } from '../controllers/blogController.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const SITE_URL = 'https://konnevia.in';
const SITE_NAME = 'KONNEVIA';
const DEFAULT_TITLE = 'KONNEVIA — Discover. Connect. Get Things Done.';
const DEFAULT_DESC = 'Pan-India service marketplace connecting customers with verified professionals across Home, Events, Business, Digital, and Education categories.';
const DEFAULT_IMAGE = `${SITE_URL}/assets/og-image.jpg`;

// Common search crawler / social bot User-Agent substrings
const BOT_UA_REGEX = /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/0\.|pinterestbot|slackbot|vkshare|w3c_validator|whatsapp|flipboard|tumblr|bitlybot|skypeuripreview|nuzzel|discordbot|google-structured-data-testing-tool|petalbot/i;

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const renderController = {
  /**
   * GET /render/blog/:slug
   * Delivers SEO-complete HTML specifically enriched for search engine crawlers and social share scrapers.
   * Also invoked when any request directly asks for server-rendered HTML.
   */
  async renderBlogPage(req, res, next) {
    try {
      const { slug } = req.params;
      const cleanSlug = (slug || '').toLowerCase().trim();

      const isDbConnected = mongoose.connection.readyState === 1;
      let blog = null;

      if (isDbConnected) {
        try {
          blog = await Blog.findOne({ slug: cleanSlug, status: 'published' }).lean();
        } catch (dbErr) {
          logger.warn('Failed querying article for SSR render', { slug: cleanSlug, error: dbErr.message });
        }
      }

      if (!blog) {
        blog = defaultBlogs.find((b) => b.slug === cleanSlug && b.status === 'published');
      }

      if (!blog) {
        return res.status(404).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Article Not Found — ${SITE_NAME}</title>
  <meta name="robots" content="noindex">
</head>
<body style="font-family:sans-serif;padding:40px;text-align:center;">
  <h1>Article Not Found</h1>
  <p>The requested editorial article "${escapeHtml(cleanSlug)}" was not found or is unpublished.</p>
  <a href="${SITE_URL}/blog">Browse All Editorial Guides</a>
</body>
</html>`);
      }

      const pageTitle = blog.metaTitle || `${blog.title} — ${SITE_NAME} Insights`;
      const pageDescription = blog.metaDescription || blog.excerpt || DEFAULT_DESC;
      const canonicalUrl = `${SITE_URL}/blog/${blog.slug}`;
      const coverImage = blog.coverImage
        ? (blog.coverImage.startsWith('http') ? blog.coverImage : `${SITE_URL}${blog.coverImage.startsWith('/') ? '' : '/'}${blog.coverImage}`)
        : DEFAULT_IMAGE;

      const authorName = blog.author?.name || 'KONNEVIA Editorial Staff';
      const authorRole = blog.author?.role || 'Domain Contributor';
      const publishedIso = blog.publishedAt ? new Date(blog.publishedAt).toISOString() : new Date().toISOString();
      const modifiedIso = blog.updatedAt ? new Date(blog.updatedAt).toISOString() : publishedIso;

      // Complete Schema.org JSON-LD Article definition
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: blog.title,
        description: pageDescription,
        image: coverImage,
        datePublished: publishedIso,
        dateModified: modifiedIso,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        author: {
          '@type': 'Person',
          name: authorName,
          jobTitle: authorRole,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/logo.svg`,
          },
        },
        articleSection: blog.category,
        keywords: Array.isArray(blog.tags) ? blog.tags.join(', ') : undefined,
      };

      // Full HTML Document containing complete <head> metadata and content body for crawlers
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph Metadata -->
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${escapeHtml(coverImage)}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="article:published_time" content="${publishedIso}" />
    <meta property="article:modified_time" content="${modifiedIso}" />
    <meta property="article:section" content="${escapeHtml(blog.category)}" />
    <meta property="article:author" content="${escapeHtml(authorName)}" />

    <!-- Twitter Card Metadata -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(coverImage)}" />

    <!-- Article JSON-LD Structured Data -->
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 24px; }
      h1 { font-size: 2rem; color: #142D4E; margin-bottom: 0.5rem; }
      .meta { font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem; }
      .excerpt { font-size: 1.125rem; font-weight: 500; color: #334155; margin-bottom: 2rem; }
      .content { white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <article>
      <header>
        <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #13A89E;">${escapeHtml(blog.category)}</span>
        <h1>${escapeHtml(blog.title)}</h1>
        <div class="meta">
          <span>By ${escapeHtml(authorName)}</span> | 
          <time datetime="${publishedIso}">Published ${new Date(publishedIso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
        </div>
        <p class="excerpt">${escapeHtml(blog.excerpt)}</p>
      </header>
      <div class="content">
${escapeHtml(blog.content)}
      </div>
    </article>
  </body>
</html>`;

      res.header('Content-Type', 'text/html; charset=utf-8');
      res.header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=300');
      return res.status(200).send(html);
    } catch (err) {
      logger.error('Error rendering blog page for SEO', { error: err.message });
      next(err);
    }
  },

  /**
   * Detects whether incoming request User-Agent is a search bot or social preview crawler.
   */
  isCrawler(userAgent = '') {
    return BOT_UA_REGEX.test(userAgent);
  },
};

export default renderController;
