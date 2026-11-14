/**
 * KONNEVIA Phase 5.3 SEO & Dynamic Sitemap Test Suite
 * Validates:
 * 1. Raw HTML delivery for blog detail (title, meta, Open Graph, Twitter, JSON-LD)
 * 2. Dynamic XML Sitemap syntax and content
 * 3. Draft/archived exclusion from sitemap and crawler render
 * 4. Automatic inclusion of new articles & lastmod updates
 * Run: node backend/test-seo-infrastructure.cjs
 */

const http = require('http');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./testEnvironment.cjs').assertTestEnvironment();

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
let passed = 0;
let failed = 0;
const results = [];

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function assert(label, fn) {
  try {
    const result = await fn();
    if (result === true) {
      console.log(`  ✅ PASS: ${label}`);
      passed++;
      results.push({ label, status: 'PASS' });
    } else {
      console.log(`  ❌ FAIL: ${label} — ${result}`);
      failed++;
      results.push({ label, status: 'FAIL', reason: result });
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${label} — ${err.message}`);
    failed++;
    results.push({ label, status: 'ERROR', reason: err.message });
  }
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   KONNEVIA Phase 5.3 SEO Infrastructure Verification     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Raw HTML Fetch for Blog Detail
  console.log('── 1. Raw HTML SEO Verification ──');

  const rawRes = await request('/render/blog/how-to-choose-interior-designer');
  const html = rawRes.data;

  await assert('Raw HTML endpoint returns HTTP 200 and text/html', async () => {
    if (rawRes.status !== 200) return `Expected 200, got ${rawRes.status}`;
    if (!rawRes.headers['content-type'].includes('text/html')) return `Expected text/html, got ${rawRes.headers['content-type']}`;
    return true;
  });

  await assert('Raw HTML contains article-specific <title>', async () => {
    if (!html.includes('<title>How to Choose the Right Home Interior Designer — KONNEVIA Editorial</title>')) {
      return 'Missing expected article <title>';
    }
    return true;
  });

  await assert('Raw HTML contains article-specific meta description', async () => {
    if (!html.includes('name="description" content="Essential steps to evaluate interior design firms')) {
      return 'Missing expected meta description';
    }
    return true;
  });

  await assert('Raw HTML contains canonical URL (https://konnevia.in/blog/...)', async () => {
    if (!html.includes('<link rel="canonical" href="https://konnevia.in/blog/how-to-choose-interior-designer" />')) {
      return 'Missing expected canonical URL';
    }
    return true;
  });

  await assert('Raw HTML contains Open Graph tags (og:title, og:desc, og:image, og:url, og:type=article)', async () => {
    const checks = [
      'property="og:type" content="article"',
      'property="og:title"',
      'property="og:description"',
      'property="og:url" content="https://konnevia.in/blog/how-to-choose-interior-designer"',
      'property="og:image"',
      'property="article:published_time"',
      'property="article:author" content="Priya Sharma"',
    ];
    for (const c of checks) {
      if (!html.includes(c)) return `Missing Open Graph tag: ${c}`;
    }
    return true;
  });

  await assert('Raw HTML contains Twitter Card metadata (summary_large_image)', async () => {
    const checks = [
      'name="twitter:card" content="summary_large_image"',
      'name="twitter:title"',
      'name="twitter:description"',
      'name="twitter:image"',
    ];
    for (const c of checks) {
      if (!html.includes(c)) return `Missing Twitter tag: ${c}`;
    }
    return true;
  });

  await assert('Raw HTML contains valid Article JSON-LD Structured Data', async () => {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) return 'Missing application/ld+json script tag';
    const json = JSON.parse(match[1]);
    if (json['@type'] !== 'Article') return `Expected @type Article, got ${json['@type']}`;
    if (json.headline !== 'How to Choose the Right Home Interior Designer in India') return `Wrong headline: ${json.headline}`;
    if (!json.author || json.author.name !== 'Priya Sharma') return 'Missing/wrong author';
    if (!json.publisher || json.publisher.name !== 'KONNEVIA') return 'Missing/wrong publisher';
    return true;
  });

  // 2. Crawler Detection on /blog/:slug
  console.log('\n── 2. Crawler Detection Middleware ──');

  await assert('Googlebot User-Agent triggers server-rendered HTML on /blog/:slug', async () => {
    const botRes = await request('/blog/how-to-choose-interior-designer', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    if (botRes.status !== 200) return `Expected 200, got ${botRes.status}`;
    if (!botRes.data.includes('<title>How to Choose the Right Home Interior Designer — KONNEVIA Editorial</title>')) {
      return 'Googlebot did not receive pre-rendered article HTML';
    }
    return true;
  });

  await assert('Facebook crawler (facebookexternalhit) triggers server-rendered HTML', async () => {
    const fbRes = await request('/blog/how-to-choose-interior-designer', {
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    });
    if (fbRes.status !== 200) return `Expected 200, got ${fbRes.status}`;
    if (!fbRes.data.includes('property="og:type" content="article"')) {
      return 'Facebook crawler did not receive Open Graph article HTML';
    }
    return true;
  });

  await assert('Crawler accessing non-existent article receives 404 with noindex', async () => {
    const notFoundRes = await request('/blog/non-existent-article-slug', {
      headers: { 'User-Agent': 'Googlebot/2.1' },
    });
    if (notFoundRes.status !== 404) return `Expected 404, got ${notFoundRes.status}`;
    if (!notFoundRes.data.includes('noindex')) return 'Missing noindex directive';
    return true;
  });

  // 3. Dynamic XML Sitemap Verification
  console.log('\n── 3. Dynamic XML Sitemap Verification ──');

  const sitemapRes = await request('/sitemap.xml');
  const sitemapXml = sitemapRes.data;

  await assert('GET /sitemap.xml returns HTTP 200 and application/xml', async () => {
    if (sitemapRes.status !== 200) return `Expected 200, got ${sitemapRes.status}`;
    if (!sitemapRes.headers['content-type'].includes('xml')) return `Expected xml content-type, got ${sitemapRes.headers['content-type']}`;
    return true;
  });

  await assert('Sitemap XML is well-formed with <urlset> declaration', async () => {
    if (!sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) return 'Missing XML declaration';
    if (!sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) return 'Missing urlset declaration';
    if (!sitemapXml.endsWith('</urlset>')) return 'Missing closing urlset tag';
    return true;
  });

  await assert('Sitemap includes all primary static public pages', async () => {
    const expected = [
      'https://konnevia.in/',
      'https://konnevia.in/categories',
      'https://konnevia.in/providers',
      'https://konnevia.in/get-quote',
      'https://konnevia.in/become-a-partner',
      'https://konnevia.in/blog',
    ];
    for (const url of expected) {
      if (!sitemapXml.includes(`<loc>${url}</loc>`)) return `Missing static page: ${url}`;
    }
    return true;
  });

  await assert('Sitemap dynamically includes all published articles with <lastmod>', async () => {
    const articles = [
      'https://konnevia.in/blog/how-to-choose-interior-designer',
      'https://konnevia.in/blog/wedding-event-budget-planning-guide',
      'https://konnevia.in/blog/corporate-website-redesign-performance-checklist',
    ];
    for (const url of articles) {
      if (!sitemapXml.includes(`<loc>${url}</loc>`)) return `Missing published article: ${url}`;
    }
    if (!sitemapXml.includes('<lastmod>')) return 'Missing lastmod tags on articles';
    return true;
  });

  // 4. Draft & Archived Exclusion and Publishing Updates
  console.log('\n── 4. Draft Exclusion & Publishing Verification ──');

  // Load dotenv first to ensure env vars are populated
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
  const mongoose = (await import('mongoose')).default;
  const Blog = (await import('./src/models/Blog.js')).default;
  const env = (await import('./src/config/env.js')).default;

  await mongoose.connect(env.mongodbUri);

  try {
    // Insert a draft article
    const testDraftSlug = 'test-audit-draft-article';
    await Blog.deleteOne({ slug: testDraftSlug });
    const draftArticle = new Blog({
      title: 'Draft Unlisted Article',
      slug: testDraftSlug,
      excerpt: 'This should never be indexed or rendered to crawlers.',
      content: 'Private content',
      category: 'Home & Construction',
      status: 'draft',
    });
    await draftArticle.save();

    await assert('Draft article is excluded from dynamic sitemap', async () => {
      const res = await request('/sitemap.xml');
      if (res.data.includes(testDraftSlug)) return 'Draft article appeared in sitemap!';
      return true;
    });

    await assert('Draft article returns 404 to crawlers on /render/blog/:slug', async () => {
      const res = await request(`/render/blog/${testDraftSlug}`);
      if (res.status !== 404) return `Expected 404 for draft, got ${res.status}`;
      return true;
    });

    // Now publish a new article and verify automatic sitemap inclusion
    const newPubSlug = 'test-seo-new-published-guide';
    await Blog.deleteOne({ slug: newPubSlug });
    const pubArticle = new Blog({
      title: 'Automated SEO Test Published Guide',
      slug: newPubSlug,
      excerpt: 'Testing dynamic sitemap inclusion and crawler rendering.',
      content: 'Comprehensive testing content body for audit verification.',
      category: 'Digital & Professional Services',
      status: 'published',
      publishedAt: new Date(),
    });
    await pubArticle.save();

    await assert('Newly published article automatically appears in dynamic sitemap', async () => {
      const res = await request('/sitemap.xml');
      if (!res.data.includes(`https://konnevia.in/blog/${newPubSlug}`)) {
        return 'Newly published article did not appear in sitemap';
      }
      return true;
    });

    await assert('Updating an article updates the <lastmod> date in sitemap', async () => {
      const futureDate = new Date('2026-12-31T12:00:00Z');
      await Blog.updateOne({ slug: newPubSlug }, { $set: { updatedAt: futureDate } }, { timestamps: false });
      const res = await request('/sitemap.xml');
      if (!res.data.includes('<lastmod>2026-12-31</lastmod>')) {
        return 'Sitemap lastmod did not reflect updated article date';
      }
      return true;
    });

    // Cleanup test records
    await Blog.deleteOne({ slug: testDraftSlug });
    await Blog.deleteOne({ slug: newPubSlug });

  } finally {
    await mongoose.disconnect();
  }

  // ── Results summary ──
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  SEO Tests: ${passed} PASSED, ${failed} FAILED / ${passed + failed} total`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter((r) => r.status !== 'PASS').forEach((r) => {
      console.log(`  ✗ ${r.label}: ${r.reason || r.status}`);
    });
    process.exit(1);
  } else {
    console.log('ALL PHASE 5.3 SEO INFRASTRUCTURE TESTS PASSED ✅');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
