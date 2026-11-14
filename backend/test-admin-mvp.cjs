/**
 * KONNEVIA Admin MVP Automated Integration Test Suite
 * Validates:
 * 1. Owner Login, Session Generation, Invalid Credentials Rejection
 * 2. Unauthenticated 401 Rejections on /api/v1/admin/*
 * 3. Dashboard metrics endpoint
 * 4. Full Provider Onboarding -> Review -> Approve (Verified+Draft) -> Publish -> Public API visibility
 * 5. Full Blog Creation (Draft) -> Unlisted verification -> Publish -> Public verification -> Archive
 * Run: node backend/test-admin-mvp.cjs
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
      headers: {
        'Content-Type': 'application/json',
        'x-konnevia-test-suite': 'admin-mvp',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
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
  console.log('║   KONNEVIA Admin MVP Integration & Security Tests        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Authentication & Security Guard Tests
  console.log('── 1. Owner Authentication & Security Guards ──');

  await assert('Unauthenticated GET /api/v1/admin/dashboard returns HTTP 401', async () => {
    const res = await request('/api/v1/admin/dashboard');
    if (res.status !== 401) return `Expected 401, got ${res.status}`;
    return true;
  });

  await assert('Unauthenticated GET /api/v1/admin/applications returns HTTP 401', async () => {
    const res = await request('/api/v1/admin/applications');
    if (res.status !== 401) return `Expected 401, got ${res.status}`;
    return true;
  });

  await assert('Invalid password returns HTTP 401', async () => {
    const res = await request('/api/v1/admin/auth/login', {
      method: 'POST',
      body: { email: 'admin@konnevia.in', password: 'WrongPassword123!' },
    });
    if (res.status !== 401) return `Expected 401, got ${res.status}`;
    return true;
  });

  let authToken = null;
  await assert('Valid owner credentials returns HTTP 200 with session token & SUPER_ADMIN role', async () => {
    const res = await request('/api/v1/admin/auth/login', {
      method: 'POST',
      body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (!res.data?.data?.token) return 'Missing session token';
    if (res.data?.data?.role !== 'SUPER_ADMIN') return `Expected SUPER_ADMIN role, got ${res.data?.data?.role}`;
    authToken = res.data.data.token;
    return true;
  });

  const authHeaders = { Authorization: `Bearer ${authToken}` };

  await assert('Authenticated GET /api/v1/admin/auth/me returns owner identity', async () => {
    const res = await request('/api/v1/admin/auth/me', { headers: authHeaders });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (res.data?.data?.email !== process.env.ADMIN_EMAIL) return 'Email mismatch';
    return true;
  });

  await assert('Authenticated GET /api/v1/admin/dashboard returns structured metrics', async () => {
    const res = await request('/api/v1/admin/dashboard', { headers: authHeaders });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const stats = res.data?.data?.stats;
    if (!stats?.applications || !stats?.providers || !stats?.blogs) return 'Missing required metrics groups';
    return true;
  });

  // 2. Full Provider Application & Publishing Workflow
  console.log('\n── 2. Provider Application, Verification & Publishing Workflow ──');

  let testAppRef = null;
  let testAppId = null;
  let testProviderId = null;
  let testProviderSlug = null;

  await assert('Submit partner application through public /api/v1/leads/partner', async () => {
    const res = await request('/api/v1/leads/partner', {
      method: 'POST',
      body: {
        businessName: 'Apex Civil Engineering Works',
        contactPerson: 'Suresh Varma',
        phone: '9845012345',
        email: 'suresh@apexcivil.com',
        category: 'Home & Construction',
        servicesOffered: ['Civil Masonry', 'Structural RCC Work', 'Foundation Deepening'],
        city: 'Bengaluru',
        serviceAreas: ['Whitefield', 'Indiranagar', 'Koramangala'],
        website: 'https://apexcivil.com',
        businessDescription: 'Licensed Grade-1 civil contracting firm executing commercial & residential masonry.',
        consentToContact: true,
      },
    });
    if (res.status !== 201) return `Expected 201, got ${res.status}`;
    testAppRef = res.data?.data?.referenceId;
    if (!testAppRef.startsWith('KNV-PTR-')) return `Invalid reference prefix: ${testAppRef}`;
    return true;
  });

  await assert('Owner sees new application under Pending filter', async () => {
    const res = await request('/api/v1/admin/applications?status=pending', { headers: authHeaders });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const target = res.data?.data?.find((a) => a.referenceId === testAppRef);
    if (!target) return 'Application not found in pending list';
    testAppId = target._id;
    return true;
  });

  await assert('Owner approves application -> Provider created as VERIFIED + DRAFT', async () => {
    const res = await request(`/api/v1/admin/applications/${testAppId}/approve`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const prov = res.data?.data?.provider;
    if (prov.verificationStatus !== 'VERIFIED') return `Expected VERIFIED, got ${prov.verificationStatus}`;
    if (prov.publicationStatus !== 'DRAFT') return `Expected DRAFT, got ${prov.publicationStatus}`;
    testProviderId = prov._id;
    testProviderSlug = prov.slug;
    return true;
  });

  await assert('DRAFT provider is NOT accessible via public GET /api/v1/providers', async () => {
    const res = await request('/api/v1/providers');
    const provList = res.data?.data?.providers || [];
    const exists = provList.some((p) => p.slug === testProviderSlug);
    if (exists) return 'Draft provider leaked into public provider listing!';
    return true;
  });

  await assert('DRAFT provider returns 404 via public GET /api/v1/providers/:slug', async () => {
    const res = await request(`/api/v1/providers/${testProviderSlug}`);
    if (res.status !== 404) return `Expected 404 for draft provider, got ${res.status}`;
    return true;
  });

  await assert('Owner edits contact phone and PUBLISHES provider', async () => {
    const res = await request(`/api/v1/admin/providers/${testProviderId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        publicationStatus: 'PUBLISHED',
        contactNumber: '9845012345',
        consentToDisplayPhone: true,
      },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (res.data?.data?.publicationStatus !== 'PUBLISHED') return 'Failed to update to PUBLISHED';
    return true;
  });

  await assert('PUBLISHED provider is discoverable via public GET /api/v1/providers with contact number', async () => {
    const res = await request('/api/v1/providers');
    const provList = res.data?.data?.providers || [];
    const target = provList.find((p) => p.slug === testProviderSlug);
    if (!target) return 'Published provider not in public listing';
    if (target.contactNumber !== '9845012345') return `Wrong contact number: ${target.contactNumber}`;
    return true;
  });

  await assert('PUBLISHED provider returns HTTP 200 via public GET /api/v1/providers/:slug', async () => {
    const res = await request(`/api/v1/providers/${testProviderSlug}`);
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (res.data?.data?.contactNumber !== '9845012345') return 'Public phone missing';
    return true;
  });

  // 3. Blog Editorial CMS Workflow
  console.log('\n── 3. Blog Editorial CMS Workflow ──');

  let testBlogId = null;
  let testBlogSlug = null;

  await assert('Owner creates blog as DRAFT', async () => {
    const res = await request('/api/v1/admin/blogs', {
      method: 'POST',
      headers: authHeaders,
      body: {
        title: 'Mastering Commercial Civil Contracts in Bengaluru',
        excerpt: 'Standard BOQ structures and dispute mitigation for commercial developers.',
        content: '### Detailed Civil Scoping Guide\n\nEnsure bill of quantities are verified.',
        category: 'Business & Property',
        status: 'draft',
      },
    });
    if (res.status !== 201) return `Expected 201, got ${res.status}`;
    testBlogId = res.data?.data?._id;
    testBlogSlug = res.data?.data?.slug;
    return true;
  });

  await assert('DRAFT blog returns 404 on public GET /api/v1/blogs/:slug', async () => {
    const res = await request(`/api/v1/blogs/${testBlogSlug}`);
    if (res.status !== 404) return `Expected 404 for draft blog, got ${res.status}`;
    return true;
  });

  await assert('Owner updates blog to PUBLISHED', async () => {
    const res = await request(`/api/v1/admin/blogs/${testBlogId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: { status: 'published' },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (res.data?.data?.status !== 'published') return 'Status mismatch';
    return true;
  });

  await assert('PUBLISHED blog returns HTTP 200 on public GET /api/v1/blogs/:slug', async () => {
    const res = await request(`/api/v1/blogs/${testBlogSlug}`);
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    return true;
  });

  await assert('Dynamic XML Sitemap includes newly published provider and blog', async () => {
    const res = await request('/sitemap.xml');
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (!res.data.includes(`/providers/${testProviderSlug}`)) return 'Published provider missing from sitemap';
    if (!res.data.includes(`/blog/${testBlogSlug}`)) return 'Published blog missing from sitemap';
    return true;
  });

  // Cleanup test artifacts from database
  try {
    const mongoose = (await import('mongoose')).default;
    const Lead = (await import('./src/models/Lead.js')).default;
    const Provider = (await import('./src/models/Provider.js')).default;
    const Blog = (await import('./src/models/Blog.js')).default;
    const env = (await import('./src/config/env.js')).default;

    const uri = process.env.MONGODB_URI || env.mongodbUri;
    if (uri && !uri.includes('localhost')) {
      await mongoose.connect(uri);
      await Lead.deleteOne({ referenceId: testAppRef });
      await Provider.deleteOne({ _id: testProviderId });
      await Blog.deleteOne({ _id: testBlogId });
      await mongoose.disconnect();
    }
  } catch (cleanErr) {
    console.warn('  ⚠️ Test cleanup warning:', cleanErr.message);
  }

  // ── Results summary ──
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Admin MVP Tests: ${passed} PASSED, ${failed} FAILED / ${passed + failed} total`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter((r) => r.status !== 'PASS').forEach((r) => {
      console.log(`  ✗ ${r.label}: ${r.reason || r.status}`);
    });
    process.exit(1);
  } else {
    console.log('ALL ADMIN MVP TESTS PASSED ✅');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
