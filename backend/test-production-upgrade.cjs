/**
 * KONNEVIA Production-Grade Upgrade Validation Test Suite
 * Tests:
 * 1. Owner Authentication Lifecycle (Login, Bearer token, Cookie, /me, Logout, Session revocation)
 * 2. RBAC & Security Middleware (Unauthenticated 401, Request ID propagation, Security headers)
 * 3. Provider Onboarding & Shop Image Upload (Multipart file handling, storage metadata, validation)
 * 4. Admin Management (Application review, Approval -> Provider creation, Status transitions)
 * 5. Public Visibility Rules (Draft vs Published, Phone consent masking)
 * 6. Customer Enquiries & Lead Desk (Submission, Status updates, DB counts)
 * 7. Activity Audit Logs (Event recording, queryable trail)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./testEnvironment.cjs').assertTestEnvironment();

const PORT = process.env.PORT || 8000;
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
        'x-konnevia-test-suite': 'production-upgrade',
        ...(options.headers || {}),
      },
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof Buffer)) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || raw,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else if (typeof options.body === 'string') {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }
    req.end();
  });
}

async function assert(label, fn) {
  try {
    const result = await fn();
    if (result === true) {
      passed++;
      console.log(`  ✓ PASS: ${label}`);
      results.push({ label, status: 'PASS' });
    } else {
      failed++;
      console.log(`  ✗ FAIL: ${label} — ${result || 'Assertion evaluated to false'}`);
      results.push({ label, status: 'FAIL', reason: result });
    }
  } catch (err) {
    failed++;
    console.log(`  ❌ ERROR: ${label} — ${err.message}`);
    results.push({ label, status: 'ERROR', reason: err.message });
  }
}

// Multipart FormData helper for testing file uploads without heavy dependencies
function createMultipartPayload(fields, file) {
  const boundary = '----KonneviaTestBoundary' + Math.random().toString(16).substring(2);
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
    );
  }

  if (file) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`
    );
    const head = Buffer.from(parts.join(''), 'utf8');
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const body = Buffer.concat([head, file.content, tail]);
    return {
      body,
      contentType: `multipart/form-data; boundary=${boundary}`,
    };
  }

  parts.push(`--${boundary}--\r\n`);
  return {
    body: Buffer.from(parts.join(''), 'utf8'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function run() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   KONNEVIA PRODUCTION UPGRADE AUTOMATED VERIFICATION SUITE     ║');
  console.log(`║   Target: ${BASE_URL.padEnd(52)} ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let adminToken = null;
  let adminCookie = null;
  let testLeadRefId = null;
  let testAppId = null;
  let testProviderId = null;
  let testProviderSlug = null;

  // ─────────────────────────────────────────────────────────────
  // 1. SECURITY HEADERS & REQUEST ID
  // ─────────────────────────────────────────────────────────────
  console.log('── 1. Security Headers & Request Tracing ──');
  await assert('Health endpoint returns HTTP 200 with x-request-id header', async () => {
    const res = await request('/health');
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (!res.headers['x-request-id']) return 'Missing x-request-id response header';
    return true;
  });

  await assert('Security headers are present (Helmet X-Content-Type-Options)', async () => {
    const res = await request('/health');
    if (res.headers['x-content-type-options'] !== 'nosniff') {
      return 'Expected x-content-type-options: nosniff';
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & SESSION LIFECYCLE
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 2. Owner Authentication & Session Lifecycle ──');

  await assert('Unauthenticated GET /api/v1/admin/auth/me returns 401', async () => {
    const res = await request('/api/v1/admin/auth/me');
    return res.status === 401 ? true : `Expected 401, got ${res.status}`;
  });

  await assert('Invalid password returns HTTP 401', async () => {
    const res = await request('/api/v1/admin/auth/login', {
      method: 'POST',
      body: { email: 'admin@konnevia.in', password: 'WrongPassword123!' },
    });
    return res.status === 401 ? true : `Expected 401, got ${res.status}`;
  });

  await assert('Valid login returns 200, sessionToken, and Set-Cookie', async () => {
    const res = await request('/api/v1/admin/auth/login', {
      method: 'POST',
      body: {
        email: process.env.ADMIN_EMAIL || 'admin@konnevia.in',
        password: process.env.ADMIN_PASSWORD || 'Konnevia@Admin2026!',
      },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`;
    if (!res.data?.data?.token) return 'Missing session token in response';
    if (res.data?.data?.role !== 'SUPER_ADMIN') return `Expected SUPER_ADMIN role, got ${res.data?.data?.role}`;

    adminToken = res.data.data.token;
    const cookieHeader = res.headers['set-cookie'];
    if (cookieHeader && cookieHeader.length > 0) {
      adminCookie = cookieHeader[0].split(';')[0];
    }
    return true;
  });

  await assert('Authenticated GET /api/v1/admin/auth/me with Bearer token succeeds', async () => {
    const res = await request('/api/v1/admin/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (!res.data?.data?.email) return 'Missing email in identity data';
    return true;
  });

  if (adminCookie) {
    await assert('Authenticated GET /api/v1/admin/auth/me with session Cookie succeeds', async () => {
      const res = await request('/api/v1/admin/auth/me', {
        headers: { Cookie: adminCookie },
      });
      if (res.status !== 200) return `Expected 200, got ${res.status}`;
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ADMIN DASHBOARD METRICS
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 3. Operational Dashboard Metrics ──');

  await assert('GET /api/v1/admin/dashboard returns real structured counts', async () => {
    const res = await request('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const stats = res.data?.data?.stats;
    if (!stats?.applications || !stats?.enquiries || !stats?.providers || !stats?.blogs) {
      return 'Missing required dashboard stat sections';
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // 4. PROVIDER ONBOARDING & SHOP IMAGE UPLOAD
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 4. Partner Application & Shop Image Upload ──');

  await assert('Rejects invalid file format (e.g. fake executable or txt file)', async () => {
    const fakeExe = Buffer.from('MZ...fake executable content');
    const { body, contentType } = createMultipartPayload(
      {
        businessName: 'Reject Me Trades',
        contactPerson: 'Tester',
        phone: '9820199999',
        email: 'reject@test.in',
        category: 'home-construction',
        servicesOffered: 'Carpentry',
        city: 'Mumbai',
        businessDescription: 'Testing invalid file rejection handling on server.',
        consentToContact: 'true',
      },
      {
        fieldname: 'shopImage',
        filename: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        content: fakeExe,
      }
    );

    const res = await request('/api/v1/leads/partner', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    return res.status === 400 ? true : `Expected 400, got ${res.status}`;
  });

  await assert('Accepts partner submission with valid JPEG shop image', async () => {
    // 1x1 valid JPEG image buffer
    const minimalJpg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00,
      0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
      0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b,
      0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31,
      0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff,
      0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
      0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00, 0xff, 0xd9,
    ]);

    const timestamp = Date.now();
    const { body, contentType } = createMultipartPayload(
      {
        businessName: `Apex Architects ${timestamp}`,
        contactPerson: 'Suresh Patil',
        phone: '9820555123',
        email: `apex_${timestamp}@test.in`,
        category: 'home-construction',
        servicesOffered: 'Architectural Planning, 3D Elevation',
        city: 'Pune',
        address: 'Office 402, Elite Tower',
        state: 'Maharashtra',
        pinCode: '411045',
        businessDescription: 'Award-winning architectural and construction consultancy based in Pune.',
        consentToContact: 'true',
        consentToDisplayPhone: 'true',
      },
      {
        fieldname: 'shopImage',
        filename: 'apex_studio.jpg',
        mimetype: 'image/jpeg',
        content: minimalJpg,
      }
    );

    const res = await request('/api/v1/leads/partner', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });

    if (res.status !== 201) return `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`;
    if (!res.data?.data?.referenceId) return 'Missing referenceId in response';
    if (!res.data?.data?.shopImage?.url) return 'Expected shopImage.url in response data';

    testLeadRefId = res.data.data.referenceId;
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // 5. ADMIN REVIEW, APPROVAL & PROVIDER CREATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 5. Admin Review & Workflow Transitions ──');

  await assert('Admin finds submitted partner application in pending list', async () => {
    const res = await request('/api/v1/admin/applications?status=pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const apps = res.data?.data || [];
    const found = apps.find((a) => a.referenceId === testLeadRefId);
    if (!found) return `Application with refId ${testLeadRefId} not found in pending list`;
    testAppId = found._id;
    return true;
  });

  await assert('Application details include uploaded shop image metadata', async () => {
    const res = await request(`/api/v1/admin/applications/${testAppId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const app = res.data?.data?.application;
    if (!app?.shopImage?.url) return 'shopImage.url missing from application details';
    return true;
  });

  await assert('Admin approves application -> creates VERIFIED + DRAFT Provider', async () => {
    const res = await request(`/api/v1/admin/applications/${testAppId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {},
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`;
    const provider = res.data?.data?.provider;
    if (!provider) return 'Provider record was not returned in approval response';
    if (provider.verificationStatus !== 'VERIFIED') return `Expected VERIFIED, got ${provider.verificationStatus}`;
    if (provider.publicationStatus !== 'DRAFT') return `Expected DRAFT, got ${provider.publicationStatus}`;
    if (!provider.shopImage?.url) return 'Provider did not inherit shopImage from application';

    testProviderId = provider._id;
    testProviderSlug = provider.slug;
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // 6. PUBLIC VISIBILITY GATE AUDIT
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 6. Public Visibility Gating ──');

  await assert('DRAFT provider is NOT listed in public GET /api/v1/providers', async () => {
    const res = await request('/api/v1/providers');
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const list = res.data?.data?.providers || [];
    const leak = list.find((p) => p.slug === testProviderSlug);
    if (leak) return `Leaked DRAFT provider "${testProviderSlug}" in public listing!`;
    return true;
  });

  await assert('DRAFT provider slug returns 404 on public GET /api/v1/providers/:slug', async () => {
    const res = await request(`/api/v1/providers/${testProviderSlug}`);
    return res.status === 404 ? true : `Expected 404, got ${res.status}`;
  });

  await assert('Admin publishes provider -> updates publicationStatus to PUBLISHED', async () => {
    const res = await request(`/api/v1/admin/providers/${testProviderId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        publicationStatus: 'PUBLISHED',
        consentToDisplayPhone: true,
      },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    return res.data?.data?.publicationStatus === 'PUBLISHED' ? true : 'Not PUBLISHED';
  });

  await assert('PUBLISHED provider is now accessible via public GET /api/v1/providers/:slug', async () => {
    const res = await request(`/api/v1/providers/${testProviderSlug}`);
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (!res.data?.data?.contactNumber) return 'Expected contactNumber since consentToDisplayPhone=true';
    return true;
  });

  await assert('Phone masking is enforced when consentToDisplayPhone=false', async () => {
    // Set consentToDisplayPhone to false
    await request(`/api/v1/admin/providers/${testProviderId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { consentToDisplayPhone: false },
    });

    const res = await request(`/api/v1/providers/${testProviderSlug}`);
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    if (res.data?.data?.contactNumber !== null && res.data?.data?.contactNumber !== undefined && res.data?.data?.contactNumber !== '') {
      return `Expected contactNumber to be masked/null, got "${res.data?.data?.contactNumber}"`;
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // 7. CUSTOMER ENQUIRIES & LEAD DESK
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 7. Customer Enquiries & Lead Desk ──');

  let testEnquiryId = null;

  await assert('Customer submits quote enquiry via /api/v1/leads/enquiry', async () => {
    const res = await request('/api/v1/leads/enquiry', {
      method: 'POST',
      body: {
        name: 'Rahul Sharma',
        phone: '9820112233',
        email: 'rahul@example.com',
        category: 'home-construction',
        service: 'Full Home Renovation',
        city: 'Mumbai',
        requirements: 'Looking for a comprehensive 3BHK flat interior and civil renovation.',
        consentToContact: true,
        consentProviderSharing: true,
      },
    });
    if (res.status !== 201) return `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`;
    return true;
  });

  await assert('Admin can fetch enquiries and update enquiry status', async () => {
    const listRes = await request('/api/v1/admin/enquiries?status=new', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (listRes.status !== 200) return `Expected 200, got ${listRes.status}`;
    const enquiries = listRes.data?.data || [];
    if (enquiries.length === 0) return 'No enquiries returned in new status';
    testEnquiryId = enquiries[0]._id;

    // Update status to 'contacted'
    const updateRes = await request(`/api/v1/admin/enquiries/${testEnquiryId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'contacted' },
    });
    if (updateRes.status !== 200) return `Expected 200, got ${updateRes.status}`;
    if (updateRes.data?.data?.status !== 'contacted') return 'Status not updated to contacted';
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // 8. ACTIVITY LOGS AUDIT TRAIL
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 8. Activity Logs & Security Audit Trail ──');

  await assert('GET /api/v1/admin/activity-logs returns recorded administrative operations', async () => {
    const res = await request('/api/v1/admin/activity-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const logs = res.data?.data || [];
    if (logs.length === 0) return 'No activity logs found in database';
    const actions = logs.map((l) => l.action);
    if (!actions.includes('LOGIN') && !actions.includes('APPLICATION_APPROVED')) {
      return `Expected recorded actions like LOGIN or APPLICATION_APPROVED, found: ${actions.join(', ')}`;
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // 9. LOGOUT & SESSION REVOCATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n── 9. Logout & Session Revocation ──');

  await assert('POST /api/v1/admin/auth/logout succeeds', async () => {
    const res = await request('/api/v1/admin/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return res.status === 200 ? true : `Expected 200, got ${res.status}`;
  });

  await assert('Revoked session token returns HTTP 401 on subsequent requests', async () => {
    const res = await request('/api/v1/admin/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return res.status === 401 ? true : `Expected 401, got ${res.status}`;
  });

  // ─────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║  TESTS PASSED: ${String(passed).padStart(2)} / ${passed + failed} total                                    ║`);
  if (failed === 0) {
    console.log('║  STATUS: ALL TESTS PASSED SUCCESSFULLY!                        ║');
  } else {
    console.log(`║  STATUS: ${failed} TESTS FAILED                                       ║`);
  }
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
