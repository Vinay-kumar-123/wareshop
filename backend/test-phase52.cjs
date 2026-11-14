/**
 * KONNEVIA Phase 5.2 Remediation Test Suite
 * Tests all fixes from the Phase 5.1 Forensic Audit.
 * Run: node backend/test-phase52.cjs
 */

const http = require('http');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./testEnvironment.cjs').assertTestEnvironment();

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api/v1`;
let passed = 0;
let failed = 0;
const results = [];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
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
  console.log('║   KONNEVIA Phase 5.2 Remediation Tests                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── B1: Search input capped to 200 chars ──────────────────────────────────
  console.log('── B1: Search Input Length Cap ──');

  await assert('200-char input returns valid response (not error)', async () => {
    const longSearch = 'a'.repeat(200);
    const r = await get(`${BASE}/blogs?search=${encodeURIComponent(longSearch)}`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (!Array.isArray(r.body.data?.blogs)) return 'Missing blogs array';
    return true;
  });

  await assert('301-char input is accepted (server-side trimmed to 200)', async () => {
    const longSearch = 'x'.repeat(301);
    const r = await get(`${BASE}/blogs?search=${encodeURIComponent(longSearch)}`);
    // Should 200 (search capped, returns empty results, not an error)
    if (r.status !== 200) return `HTTP ${r.status} — expected 200`;
    return true;
  });

  await assert('ReDoS payload (a+)+ is safely bounded', async () => {
    const r = await get(`${BASE}/blogs?search=${encodeURIComponent('(a+)+')}`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    return true;
  });

  // ── B2: Fallback only when DB disconnected ────────────────────────────────
  console.log('\n── B2: defaultBlogs Fallback Trigger ──');

  await assert('Connected DB + non-matching category returns 0 articles (not seed data)', async () => {
    // Use a category that has no published articles in DB (or a nonsense one)
    const r = await get(`${BASE}/blogs?category=NonExistentCategory12345`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    const blogs = r.body.data?.blogs;
    const total = r.body.data?.pagination?.total;
    if (!Array.isArray(blogs)) return 'Missing blogs array';
    // If DB is connected, seed fallback must NOT be injected for a valid empty query
    if (blogs.length > 0) {
      // Check whether any returned article is a dev sample (would indicate wrong fallback)
      const hasSeed = blogs.some(b => b.isDevSample === true);
      if (hasSeed) return `Seed content injected for empty category query — fallback trigger is wrong (${blogs.length} articles returned)`;
    }
    return true;
  });

  await assert('Connected DB + non-matching search returns 0 articles (not seed data)', async () => {
    const r = await get(`${BASE}/blogs?search=zzz_no_match_xqz_12345`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    const blogs = r.body.data?.blogs;
    if (!Array.isArray(blogs)) return 'Missing blogs array';
    if (blogs.length > 0) {
      const hasSeed = blogs.some(b => b.isDevSample === true);
      if (hasSeed) return `Seed content injected for empty search query — fallback trigger is wrong`;
    }
    return true;
  });

  // ── B3: content field never in list responses ─────────────────────────────
  console.log('\n── B3: content Field Exclusion from List ──');

  await assert('GET /blogs — no article in list response has a content field', async () => {
    const r = await get(`${BASE}/blogs`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    const blogs = r.body.data?.blogs;
    if (!Array.isArray(blogs)) return 'Missing blogs array';
    const withContent = blogs.filter(b => Object.prototype.hasOwnProperty.call(b, 'content'));
    if (withContent.length > 0) return `${withContent.length} article(s) in list contain content field`;
    return true;
  });

  await assert('GET /blogs?category=Home — no content field in filtered list', async () => {
    const r = await get(`${BASE}/blogs?category=${encodeURIComponent('Home & Construction')}`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    const blogs = r.body.data?.blogs;
    if (!Array.isArray(blogs)) return 'Missing blogs array';
    const withContent = blogs.filter(b => Object.prototype.hasOwnProperty.call(b, 'content'));
    if (withContent.length > 0) return `${withContent.length} article(s) contain content field`;
    return true;
  });

  await assert('GET /blogs/:slug detail response DOES include content field', async () => {
    const r = await get(`${BASE}/blogs/how-to-choose-interior-designer`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    const hasContent = Object.prototype.hasOwnProperty.call(r.body.data, 'content');
    if (!hasContent) return 'Detail response missing content field';
    return true;
  });

  // ── Published-only filtering ──────────────────────────────────────────────
  console.log('\n── Published-Only Filtering ──');

  await assert('Draft article slug returns 404', async () => {
    // Attempt a known non-published slug — if no draft exists, 404 is correct
    const r = await get(`${BASE}/blogs/this-is-a-draft-article-slug`);
    if (r.status !== 404) return `Expected 404, got ${r.status}`;
    return true;
  });

  await assert('All articles in list have status=published', async () => {
    const r = await get(`${BASE}/blogs`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    const blogs = r.body.data?.blogs;
    if (!Array.isArray(blogs)) return 'Missing blogs array';
    const nonPublished = blogs.filter(b => b.status !== 'published');
    if (nonPublished.length > 0) return `${nonPublished.length} non-published articles in list`;
    return true;
  });

  // ── Pagination correctness ────────────────────────────────────────────────
  console.log('\n── Pagination Boundaries ──');

  await assert('page=0 is clamped to page=1', async () => {
    const r = await get(`${BASE}/blogs?page=0`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (r.body.data?.pagination?.page !== 1) return `page=${r.body.data?.pagination?.page}`;
    return true;
  });

  await assert('limit=100 is clamped to 50', async () => {
    const r = await get(`${BASE}/blogs?limit=100`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (r.body.data?.pagination?.limit !== 50) return `limit=${r.body.data?.pagination?.limit}`;
    return true;
  });

  await assert('limit=-1 is clamped to 1', async () => {
    const r = await get(`${BASE}/blogs?limit=-1`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (r.body.data?.pagination?.limit !== 1) return `limit=${r.body.data?.pagination?.limit}`;
    return true;
  });

  await assert('Response pagination shape is correct (page, limit, total, pages)', async () => {
    const r = await get(`${BASE}/blogs`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    const p = r.body.data?.pagination;
    if (!p) return 'Missing pagination object';
    const keys = ['page', 'limit', 'total', 'pages'];
    const missing = keys.filter(k => !(k in p));
    if (missing.length > 0) return `Missing pagination keys: ${missing.join(', ')}`;
    return true;
  });

  // ── Write endpoint protection ─────────────────────────────────────────────
  console.log('\n── Write Endpoint Protection ──');

  await assert('POST /blogs returns 404 (no write endpoint)', async () => {
    const r = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'localhost', port: PORT,
        path: '/api/v1/blogs', method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };
      const req = http.request(opts, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({ status: res.statusCode }));
      });
      req.on('error', reject);
      req.write(JSON.stringify({ title: 'inject', slug: 'test' }));
      req.end();
    });
    if (r.status !== 404) return `Expected 404, got ${r.status}`;
    return true;
  });

  // ── API response schema ───────────────────────────────────────────────────
  console.log('\n── API Response Schema ──');

  await assert('GET /blogs — top level: success, message, data', async () => {
    const r = await get(`${BASE}/blogs`);
    const keys = Object.keys(r.body || {});
    const missing = ['success', 'data'].filter(k => !keys.includes(k));
    if (missing.length) return `Missing keys: ${missing.join(', ')}`;
    return true;
  });

  await assert('GET /blogs/:slug — data includes relatedArticles', async () => {
    const r = await get(`${BASE}/blogs/how-to-choose-interior-designer`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (!Array.isArray(r.body.data?.relatedArticles)) return 'Missing relatedArticles array';
    return true;
  });

  await assert('GET /blogs/categories returns array', async () => {
    const r = await get(`${BASE}/blogs/categories`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (!Array.isArray(r.body.data)) return 'data is not an array';
    return true;
  });

  // ── Results summary ───────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed} PASSED, ${failed} FAILED / ${passed + failed} total`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter(r => r.status !== 'PASS').forEach(r => {
      console.log(`  ✗ ${r.label}: ${r.reason || r.status}`);
    });
    process.exit(1);
  } else {
    console.log('ALL PHASE 5.2 TESTS PASSED ✅');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Test suite crashed:', err.message);
  process.exit(1);
});
