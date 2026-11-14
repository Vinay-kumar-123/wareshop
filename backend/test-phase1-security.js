/**
 * WARESHOP — Phase 1 Automated Security & Reliability Test Suite
 *
 * Non-destructive, isolated test harness verifying all Phase 1 requirements:
 * 1. Missing and weak production configuration rejected; no default admin credentials.
 * 2. Database unavailable -> HTTP 503 fail-fast; liveness vs readiness health accuracy.
 * 3. Proxy-aware independent rate limiters (IP + phone for OTP; isolated from login & contact).
 * 4. Mass-assignment rejection & allow-listed DTO enforcement.
 * 5. Bearer-only admin authentication (hashed token in DB, cookie-only rejected, expiry & logout enforced).
 * 6. Fake/demo public listings fallback removed; API failures propagate cleanly to UI error states.
 *
 * Runs completely in-memory without touching production or development databases.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure test environment before importing app modules
process.env.NODE_ENV = 'test';
process.env.MONGODB_DB_NAME = 'wareshop_phase1_isolated_test';

const { buildEnv, validateEnv, isStrongPassword } = await import('./src/config/env.js');
const { isDatabaseReady } = await import('./src/config/db.js');
const appModule = await import('./src/app.js');
const app = appModule.default;
const Admin = (await import('./src/models/Admin.js')).default;
const ProviderAccount = (await import('./src/models/ProviderAccount.js')).default;
const Lead = (await import('./src/models/Lead.js')).default;
const Provider = (await import('./src/models/Provider.js')).default;
const Category = (await import('./src/models/Category.js')).default;
const ActivityLog = (await import('./src/models/ActivityLog.js')).default;
const OtpChallenge = (await import('./src/models/OtpChallenge.js')).default;
const authService = (await import('./src/services/authService.js')).default;
const leadService = (await import('./src/services/leadService.js')).default;
const { buildPartnerLeadDto } = await import('./src/middleware/validate.js');

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  FAIL  ${name}\n        -> ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Start ephemeral HTTP server on port 0 (OS-assigned random port)
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const BASE_URL = `http://127.0.0.1:${port}`;

function httpRequest(reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const headers = { ...(options.headers || {}) };
    let payload = null;

    if (options.body !== undefined) {
      if (typeof options.body === 'string') {
        payload = options.body;
      } else {
        payload = JSON.stringify(options.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json ?? raw,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

// Control simulated Mongoose connection readyState without touching any external MongoDB server
let simulatedReadyState = 0;
Object.defineProperty(mongoose.connection, 'readyState', {
  get: () => simulatedReadyState,
  configurable: true,
});

// In-memory fixture stores for isolated model stubs
const inMemoryAdmins = new Map();
const inMemoryLeads = [];
const inMemoryActivityLogs = [];
const inMemoryCategories = new Map();
const inMemoryProviders = new Map();

const testAdminEmail = 'security-owner@wareshop.in';
const testAdminPassword = 'Str0ng#Phase1Password2026!';
const { salt: adminSalt, passwordHash: adminHash } = Admin.hashPassword(testAdminPassword);

function resetAdminFixture() {
  inMemoryAdmins.clear();
  const doc = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    email: testAdminEmail,
    passwordHash: adminHash,
    salt: adminSalt,
    role: 'SUPER_ADMIN',
    sessionToken: null,
    sessionTokenHash: null,
    sessionExpiresAt: null,
    lastLoginAt: null,
    passwordRotatedAt: new Date(),
    verifyPassword(pw) {
      return Admin.schema.methods.verifyPassword.call(this, pw);
    },
    async save() {
      inMemoryAdmins.set(this.email, this);
      return this;
    },
  };
  inMemoryAdmins.set(testAdminEmail, doc);
  return doc;
}

resetAdminFixture();

// Stub Mongoose model operations so zero network DB calls occur
Admin.findOne = async (query = {}) => {
  if (query.email) {
    return inMemoryAdmins.get(query.email) || null;
  }
  if (query.sessionTokenHash) {
    for (const adm of inMemoryAdmins.values()) {
      const notExpired =
        adm.sessionExpiresAt &&
        query.sessionExpiresAt?.$gt &&
        adm.sessionExpiresAt > query.sessionExpiresAt.$gt;
      if (adm.sessionTokenHash === query.sessionTokenHash && notExpired) {
        return adm;
      }
    }
    return null;
  }
  return null;
};

ActivityLog.create = async (entry) => {
  inMemoryActivityLogs.push(entry);
  return entry;
};

const verifiedAccountId = '507f1f77bcf86cd799439022';
const verifiedPhone = '9876543299';
const testProviderToken = 'b'.repeat(64);
const testProviderTokenHash = crypto.createHash('sha256').update(testProviderToken).digest('hex');

ProviderAccount.findOne = async (query = {}) => {
  if (query.sessionTokenHash === testProviderTokenHash) {
    return {
      _id: new mongoose.Types.ObjectId(verifiedAccountId),
      phone: verifiedPhone,
      status: 'ACTIVE',
      role: 'PROVIDER',
      sessionTokenHash: testProviderTokenHash,
      sessionExpiresAt: new Date(Date.now() + 3600_000),
      async save() {
        return this;
      },
    };
  }
  if (String(query._id) === verifiedAccountId && query.phone === verifiedPhone) {
    return { _id: new mongoose.Types.ObjectId(verifiedAccountId), phone: verifiedPhone, status: 'ACTIVE' };
  }
  return null;
};

ProviderAccount.find = () => ({
  select: () => ({
    lean: async () => [],
  }),
  lean: async () => [],
});

ProviderAccount.findById = () => ({
  lean: async () => ({
    _id: new mongoose.Types.ObjectId(verifiedAccountId),
    phone: verifiedPhone,
    status: 'ACTIVE',
  }),
});

Lead.countDocuments = async () => 0;

Lead.prototype.save = async function () {
  const plain = this.toObject();
  inMemoryLeads.push(plain);
  return this;
};

const sampleProviderId = '507f1f77bcf86cd799439033';
inMemoryProviders.set(sampleProviderId, {
  _id: new mongoose.Types.ObjectId(sampleProviderId),
  businessName: 'Verified Logistics Hub',
  providerName: 'Rohan Sharma',
  slug: 'verified-logistics-hub',
  description: 'Grade-A commercial warehouse facility with dock levelers.',
  category: 'Warehouse',
  categorySlug: 'warehouse',
  services: ['Industrial Storage'],
  contactNumber: '9876543210',
  email: 'ops@verifiedlogistics.in',
  city: 'Mumbai',
  state: 'Maharashtra',
  status: 'PUBLISHED',
  verificationStatus: 'VERIFIED',
  publicationStatus: 'PUBLISHED',
  consentToDisplayPhone: true,
  isDemo: false,
  async save() {
    inMemoryProviders.set(String(this._id), this);
    return this;
  },
});

Provider.findById = async (id) => {
  const found = inMemoryProviders.get(String(id));
  if (!found) return null;
  return { ...found, async save() { inMemoryProviders.set(String(this._id), this); return this; } };
};

Provider.findOne = (query = {}) => ({
  select: () => ({
    lean: async () => {
      for (const p of inMemoryProviders.values()) {
        if (p.slug === query.slug && p.verificationStatus === 'VERIFIED' && p.publicationStatus === 'PUBLISHED') {
          return { ...p };
        }
      }
      return null;
    },
  }),
  lean: async () => {
    for (const p of inMemoryProviders.values()) {
      if (p.slug === query.slug && p.verificationStatus === 'VERIFIED' && p.publicationStatus === 'PUBLISHED') {
        return { ...p };
      }
    }
    return null;
  },
});

Provider.find = () => ({
  select: () => ({
    sort: () => ({
      lean: async () => Array.from(inMemoryProviders.values()),
    }),
  }),
  sort: () => ({
    skip: () => ({
      limit: () => ({
        lean: async () => Array.from(inMemoryProviders.values()),
      }),
    }),
    limit: () => ({
      lean: async () => Array.from(inMemoryProviders.values()),
    }),
    lean: async () => Array.from(inMemoryProviders.values()),
  }),
});

Provider.countDocuments = async () => inMemoryProviders.size;

const defaultSeedCategories = [
  { _id: new mongoose.Types.ObjectId(), name: 'Shop', slug: 'shop', status: 'ACTIVE' },
  { _id: new mongoose.Types.ObjectId(), name: 'Office', slug: 'office', status: 'ACTIVE' },
  { _id: new mongoose.Types.ObjectId(), name: 'Warehouse', slug: 'warehouse', status: 'ACTIVE' },
  { _id: new mongoose.Types.ObjectId(), name: 'Godown', slug: 'godown', status: 'ACTIVE' },
];
for (const c of defaultSeedCategories) {
  inMemoryCategories.set(c.slug, c);
}

Category.estimatedDocumentCount = async () => inMemoryCategories.size;
Category.updateOne = async () => ({ acknowledged: true });
Category.find = () => ({
  select: () => ({
    lean: async () => Array.from(inMemoryCategories.values()).filter((c) => c.status === 'ACTIVE'),
  }),
  sort: () => ({
    lean: async () => Array.from(inMemoryCategories.values()),
  }),
  lean: async () => Array.from(inMemoryCategories.values()),
});
Category.findOne = (query = {}) => ({
  lean: async () => {
    for (const c of inMemoryCategories.values()) {
      if (query.slug && c.slug === query.slug) return c;
      if (
        query.$or?.some(
          (cond) =>
            (cond.slug && c.slug === cond.slug) ||
            (cond.name instanceof RegExp && cond.name.test(c.name))
        )
      ) {
        return c;
      }
    }
    return null;
  },
});

Category.exists = async ({ $or } = {}) => {
  for (const c of inMemoryCategories.values()) {
    if ($or?.some((cond) => (cond.slug && c.slug === cond.slug) || (cond.name && cond.name.test(c.name)))) {
      return true;
    }
  }
  return false;
};

Category.create = async (data) => {
  const created = { _id: new mongoose.Types.ObjectId(), ...data };
  inMemoryCategories.set(created.slug, created);
  return created;
};

OtpChallenge.findOne = () => ({
  sort: () => ({
    lean: async () => null,
    select: () => ({
      lean: async () => null,
    }),
  }),
  lean: async () => null,
});
OtpChallenge.countDocuments = async () => 0;
OtpChallenge.create = async (doc) => ({
  _id: new mongoose.Types.ObjectId(),
  ...doc,
  async save() {
    return this;
  },
});
OtpChallenge.updateOne = async () => ({ acknowledged: true });

console.log('\n================================================================');
console.log(' WARESHOP — PHASE 1 SECURITY & RELIABILITY TEST SUITE');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// 1. Missing & Weak Production Configuration + No Default Credentials
// ---------------------------------------------------------------------------
console.log('--- 1. Environment Validation & Credential Hardening ---');

await test('1.1 buildEnv({}) contains no hardcoded default admin email or password', async () => {
  const cleanConfig = buildEnv({});
  assert(cleanConfig.admin.email === '', `Expected empty admin.email, got "${cleanConfig.admin.email}"`);
  assert(cleanConfig.admin.password === '', 'Expected empty admin.password');
  assert(cleanConfig.admin.jwtSecret === undefined, 'Expected unused jwtSecret fallback to be removed');
});

await test('1.2 Source files contain no hardcoded default credentials', async () => {
  const filesToScan = [
    path.join(__dirname, 'src/config/env.js'),
    path.join(__dirname, 'src/scripts/bootstrapAdmin.js'),
    path.join(__dirname, '.env.example'),
    path.join(__dirname, '.env.test.example'),
  ];
  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf8');
    assert(!content.includes('admin@konnevia.in'), `Hardcoded email found in ${path.basename(file)}`);
    assert(!content.includes('konnevia-secret-superadmin-key-2026'), `Hardcoded secret found in ${path.basename(file)}`);
    if (path.basename(file) !== 'env.js') {
      assert(!content.includes('Konnevia@Admin2026!'), `Hardcoded password found in ${path.basename(file)}`);
    }
  }
});

await test('1.3 validateEnv rejects missing or localhost MONGODB_URI in production', async () => {
  const baseProd = {
    NODE_ENV: 'production',
    MONGODB_URI: '',
    MONGODB_DB_NAME: 'wareshop_prod',
    CORS_ORIGIN: 'https://wareshop.in',
    ADMIN_EMAIL: 'owner@wareshop.in',
    ADMIN_PASSWORD: 'Val1d#ProdPassword2026!',
  };
  let threwMissing = false;
  try {
    validateEnv(buildEnv(baseProd));
  } catch {
    threwMissing = true;
  }
  assert(threwMissing, 'Expected validateEnv to reject empty MONGODB_URI in production');

  let threwLocalhost = false;
  try {
    validateEnv(buildEnv({ ...baseProd, MONGODB_URI: 'mongodb://localhost:27017/wareshop_prod' }));
  } catch {
    threwLocalhost = true;
  }
  assert(threwLocalhost, 'Expected validateEnv to reject localhost MONGODB_URI in production');
});

await test('1.4 validateEnv rejects missing MONGODB_DB_NAME or "test" DB name in production', async () => {
  const baseProd = {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://cluster.example.mongodb.net/?retryWrites=true',
    MONGODB_DB_NAME: '',
    CORS_ORIGIN: 'https://wareshop.in',
    ADMIN_EMAIL: 'owner@wareshop.in',
    ADMIN_PASSWORD: 'Val1d#ProdPassword2026!',
  };
  let threwEmptyDb = false;
  try {
    validateEnv(buildEnv(baseProd));
  } catch {
    threwEmptyDb = true;
  }
  assert(threwEmptyDb, 'Expected validateEnv to reject missing database name in production');

  let threwTestDb = false;
  try {
    validateEnv(buildEnv({ ...baseProd, MONGODB_DB_NAME: 'test' }));
  } catch {
    threwTestDb = true;
  }
  assert(threwTestDb, 'Expected validateEnv to reject MONGODB_DB_NAME="test" in production');
});

await test('1.5 validateEnv rejects missing or wildcard (*) CORS_ORIGIN in production', async () => {
  const baseProd = {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://cluster.example.mongodb.net/wareshop_prod',
    MONGODB_DB_NAME: 'wareshop_prod',
    CORS_ORIGIN: '*',
    ADMIN_EMAIL: 'owner@wareshop.in',
    ADMIN_PASSWORD: 'Val1d#ProdPassword2026!',
  };
  let threwWildcard = false;
  try {
    validateEnv(buildEnv(baseProd));
  } catch {
    threwWildcard = true;
  }
  assert(threwWildcard, 'Expected validateEnv to reject wildcard CORS_ORIGIN in production');
});

await test('1.6 validateEnv rejects missing or weak ADMIN_PASSWORD in production', async () => {
  const baseProd = {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://cluster.example.mongodb.net/wareshop_prod',
    MONGODB_DB_NAME: 'wareshop_prod',
    CORS_ORIGIN: 'https://wareshop.in',
    ADMIN_EMAIL: 'owner@wareshop.in',
  };

  for (const weakPw of ['', 'short1!', 'alllowercase1234!', 'Konnevia@Admin2026!', 'change_this_to_a_strong_password_in_production']) {
    let threw = false;
    try {
      validateEnv(buildEnv({ ...baseProd, ADMIN_PASSWORD: weakPw }));
    } catch {
      threw = true;
    }
    assert(threw, `Expected validateEnv to reject weak password "${weakPw}"`);
  }

  const validConfig = buildEnv({ ...baseProd, ADMIN_PASSWORD: 'Val1d#ProdPassword2026!' });
  assert(validateEnv(validConfig) === true, 'Expected strong production config to pass validateEnv');
});

await test('1.7 Automatic production Super Admin creation is disabled', async () => {
  const envObj = (await import('./src/config/env.js')).env;
  const prevProd = envObj.isProduction;
  envObj.isProduction = true;
  let threw = false;
  try {
    await authService.bootstrapAdmin({
      email: 'owner@wareshop.in',
      password: 'Val1d#ProdPassword2026!',
    });
  } catch (err) {
    threw = err.message.includes('disabled in production');
  } finally {
    envObj.isProduction = prevProd;
  }
  assert(threw, 'Expected authService.bootstrapAdmin() without allowInProduction=true to throw in production');
});

// ---------------------------------------------------------------------------
// 2. Database Reliability, Fail-Fast 503 & Health/Readiness Probes
// ---------------------------------------------------------------------------
console.log('\n--- 2. Database Reliability & Health/Readiness Status ---');

await test('2.1 Mongoose bufferCommands is disabled globally', async () => {
  assert(mongoose.get('bufferCommands') === false, 'Expected mongoose bufferCommands to be false');
});

await test('2.2 When DB is disconnected, /health/live is 200 but /health and /health/ready return 503', async () => {
  simulatedReadyState = 0;
  assert(isDatabaseReady() === false, 'Expected isDatabaseReady() to be false');

  const liveRes = await httpRequest('/health/live');
  assert(liveRes.status === 200 && liveRes.body.status === 'alive', 'Expected /health/live 200 alive');

  const readyRes = await httpRequest('/health/ready');
  assert(readyRes.status === 503, `Expected /health/ready 503, got ${readyRes.status}`);
  assert(readyRes.body.ready === false && readyRes.body.database?.connected === false, 'Expected ready=false');

  const healthRes = await httpRequest('/health');
  assert(healthRes.status === 503, `Expected /health 503 when DB down, got ${healthRes.status}`);
  assert(healthRes.body.status === 'unavailable', `Expected status="unavailable", got "${healthRes.body.status}"`);

  const apiHealthRes = await httpRequest('/api/v1/health');
  assert(apiHealthRes.status === 503, `Expected /api/v1/health 503 when DB down, got ${apiHealthRes.status}`);
});

await test('2.3 When DB is disconnected, database-dependent APIs return HTTP 503 immediately', async () => {
  simulatedReadyState = 0;
  const start = Date.now();

  const providersRes = await httpRequest('/api/v1/providers');
  const loginRes = await httpRequest('/api/v1/admin/auth/login', {
    method: 'POST',
    body: { email: testAdminEmail, password: testAdminPassword },
  });
  const partnerRes = await httpRequest('/api/v1/leads/partner', {
    method: 'POST',
    body: {},
  });

  const elapsed = Date.now() - start;
  assert(providersRes.status === 503, `Expected GET /api/v1/providers 503, got ${providersRes.status}`);
  assert(loginRes.status === 503, `Expected POST /api/v1/admin/auth/login 503, got ${loginRes.status}`);
  assert(partnerRes.status === 503, `Expected POST /api/v1/leads/partner 503, got ${partnerRes.status}`);
  assert(elapsed < 1000, `Expected fail-fast < 1000ms, took ${elapsed}ms`);

  let serviceThrew503 = false;
  try {
    await leadService.createPartnerLead({ businessName: 'Test' });
  } catch (err) {
    serviceThrew503 = err.statusCode === 503;
  }
  assert(serviceThrew503, 'Expected leadService.createPartnerLead to throw 503 when DB is disconnected');
});

await test('2.4 When DB is connected, /health and /health/ready return HTTP 200', async () => {
  simulatedReadyState = 1;
  const readyRes = await httpRequest('/health/ready');
  assert(readyRes.status === 200 && readyRes.body.ready === true, 'Expected /health/ready 200 ready=true');

  const healthRes = await httpRequest('/health');
  assert(healthRes.status === 200 && healthRes.body.status === 'ok', 'Expected /health 200 status=ok');
});

// ---------------------------------------------------------------------------
// 3. Proxy-Aware Independent Rate Limiters
// ---------------------------------------------------------------------------
console.log('\n--- 3. Proxy-Aware Independent Rate Limiters ---');

await test('3.1 Express trust proxy is configured to 1 (Render hop count)', async () => {
  assert(app.get('trust proxy') === 1, `Expected trust proxy = 1, got ${app.get('trust proxy')}`);
});

await test('3.2 OTP limiter keys by both IP and phone and is independent from admin login & contact limiters', async () => {
  simulatedReadyState = 1;
  const ipA = '198.51.100.10';
  const ipB = '198.51.100.20';
  const ipC = '198.51.100.30';
  const phone1 = '9876543210';
  const phone2 = '9876543211';

  // Send 5 requests for phone1 from ipA (reaches phone limit of 5)
  for (let i = 0; i < 5; i++) {
    const res = await httpRequest('/api/v1/provider-auth/otp/request', {
      method: 'POST',
      headers: { 'X-Forwarded-For': ipA },
      body: { phone: phone1 },
    });
    assert(res.status !== 429, `Request ${i + 1} should not be rate-limited yet (got ${res.status})`);
  }

  // 6th request for phone1 from ipA -> 429
  const sixthSameIpPhone = await httpRequest('/api/v1/provider-auth/otp/request', {
    method: 'POST',
    headers: { 'X-Forwarded-For': ipA },
    body: { phone: phone1 },
  });
  assert(sixthSameIpPhone.status === 429, `Expected 6th OTP request for same phone+IP to return 429, got ${sixthSameIpPhone.status}`);

  // Request for SAME phone1 from DIFFERENT ipB -> also 429 (keyed by phone)
  const samePhoneDiffIp = await httpRequest('/api/v1/provider-auth/otp/request', {
    method: 'POST',
    headers: { 'X-Forwarded-For': ipB },
    body: { phone: phone1 },
  });
  assert(samePhoneDiffIp.status === 429, `Expected OTP request for rate-limited phone from different IP to return 429, got ${samePhoneDiffIp.status}`);

  // Request for DIFFERENT phone2 from DIFFERENT ipC -> NOT rate-limited (proxy-aware per-client isolation)
  const diffPhoneDiffIp = await httpRequest('/api/v1/provider-auth/otp/request', {
    method: 'POST',
    headers: { 'X-Forwarded-For': ipC },
    body: { phone: phone2 },
  });
  assert(diffPhoneDiffIp.status !== 429, `Expected different IP + different phone not to be rate-limited, got ${diffPhoneDiffIp.status}`);

  // Exhaust IP limiter for ipA using distinct phones (5 more requests = 10 total for ipA)
  for (let i = 0; i < 5; i++) {
    await httpRequest('/api/v1/provider-auth/otp/request', {
      method: 'POST',
      headers: { 'X-Forwarded-For': ipA },
      body: { phone: `987650000${i}` },
    });
  }
  const eleventhFromIpA = await httpRequest('/api/v1/provider-auth/otp/request', {
    method: 'POST',
    headers: { 'X-Forwarded-For': ipA },
    body: { phone: '9876599999' },
  });
  assert(eleventhFromIpA.status === 429, `Expected 11th OTP request from same IP across rotating phones to return 429, got ${eleventhFromIpA.status}`);

  // Verify admin login limiter and contact reveal limiter are still completely unaffected for ipA
  const loginFromIpA = await httpRequest('/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'X-Forwarded-For': ipA },
    body: { email: testAdminEmail, password: testAdminPassword },
  });
  assert(loginFromIpA.status === 200, `Expected admin login from ipA to remain unaffected (200), got ${loginFromIpA.status}`);

  const contactFromIpA = await httpRequest('/api/v1/providers/verified-logistics-hub/contact', {
    headers: { 'X-Forwarded-For': ipA },
  });
  assert(contactFromIpA.status === 200, `Expected contact reveal from ipA to remain unaffected (200), got ${contactFromIpA.status}`);
});

// ---------------------------------------------------------------------------
// 4. Mass-Assignment Rejection & DTO Allow-Listing
// ---------------------------------------------------------------------------
console.log('\n--- 4. Mass-Assignment Prevention ---');

const validPartnerPayload = {
  businessName: 'Apex Industrial Warehousing',
  contactPerson: 'Vikram Mehta',
  phone: verifiedPhone,
  email: 'vikram@apexwarehousing.in',
  category: 'Warehouse',
  providerAccountId: verifiedAccountId,
  servicesOffered: 'Industrial Storage, Bonded Warehousing',
  city: 'Pune',
  state: 'Maharashtra',
  address: 'Plot 14, Chakan MIDC Phase 2',
  pinCode: '410501',
  serviceAreas: 'Pune, Mumbai',
  website: 'https://apexwarehousing.in',
  businessDescription: 'modern industrial warehousing with 24x7 security and dock levelers.',
  consentToContact: true,
  consentToDisplayPhone: true,
};

await test('4.1 POST /api/v1/leads/partner rejects client-supplied status, approval, ownership, or shopImage metadata', async () => {
  simulatedReadyState = 1;
  const forbiddenAttempts = [
    { status: 'qualified' },
    { shopImage: { url: 'https://evil.example/payload.jpg' } },
    { verificationStatus: 'VERIFIED' },
    { publicationStatus: 'PUBLISHED' },
    { assignedProviderId: '507f1f77bcf86cd799439011' },
    { isDemo: true },
    { role: 'SUPER_ADMIN' },
    { metadata: { rejectionReason: 'none' } },
    { unexpectedField: 'injected' },
  ];

  for (const extra of forbiddenAttempts) {
    const fieldName = Object.keys(extra)[0];
    const res = await httpRequest('/api/v1/leads/partner', {
      method: 'POST',
      headers: {
        'X-Forwarded-For': '198.51.100.55',
        Authorization: `Bearer ${testProviderToken}`,
      },
      body: { ...validPartnerPayload, ...extra },
    });
    assert(
      res.status === 400,
      `Expected HTTP 400 when injecting forbidden field "${fieldName}", got ${res.status}`
    );
  }
});

await test('4.2 Valid partner submission succeeds and persists only allow-listed DTO fields with backend-controlled status', async () => {
  inMemoryLeads.length = 0;
  const res = await httpRequest('/api/v1/leads/partner', {
    method: 'POST',
    headers: {
      'X-Forwarded-For': '198.51.100.56',
      Authorization: `Bearer ${testProviderToken}`,
    },
    body: validPartnerPayload,
  });
  assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
  assert(inMemoryLeads.length === 1, 'Expected 1 persisted lead');
  const saved = inMemoryLeads[0];
  assert(
    saved.status === 'new' || saved.status === 'SUBMITTED',
    `Expected backend-controlled initial status ("new" or "SUBMITTED"), got "${saved.status}"`
  );
  assert(saved.type === 'partner', `Expected type="partner", got "${saved.type}"`);
  assert(!saved.shopImage || !saved.shopImage.url, 'Expected empty shopImage when no file uploaded');

  // Also verify buildPartnerLeadDto strips any injected fields directly
  const dto = buildPartnerLeadDto({
    ...validPartnerPayload,
    status: 'converted',
    shopImage: { url: 'https://evil.example/x.png' },
    role: 'SUPER_ADMIN',
  });
  assert(dto.status === undefined, 'DTO must not include status');
  assert(dto.shopImage === undefined, 'DTO must not include shopImage');
  assert(dto.role === undefined, 'DTO must not include role');
});

// ---------------------------------------------------------------------------
// 5. Bearer-Only Admin Authentication & Session Security
// ---------------------------------------------------------------------------
console.log('\n--- 5. Bearer-Only Admin Authentication ---');

let activeAdminToken = null;

await test('5.1 Admin login returns Bearer token without setting any cookies and stores only SHA-256 hash in DB', async () => {
  simulatedReadyState = 1;
  resetAdminFixture();
  inMemoryActivityLogs.length = 0;

  const res = await httpRequest('/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '198.51.100.99, 203.0.113.5' },
    body: { email: testAdminEmail, password: testAdminPassword },
  });

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.headers['set-cookie'] === undefined, 'Expected no Set-Cookie header on Bearer-only admin login');
  activeAdminToken = res.body?.data?.token;
  assert(typeof activeAdminToken === 'string' && /^[a-f0-9]{64}$/i.test(activeAdminToken), 'Expected 64-char hex Bearer token');

  const storedAdmin = inMemoryAdmins.get(testAdminEmail);
  const expectedHash = crypto.createHash('sha256').update(activeAdminToken).digest('hex');
  assert(storedAdmin.sessionToken === null, 'Raw sessionToken must never be stored in MongoDB');
  assert(storedAdmin.sessionTokenHash === expectedHash, 'sessionTokenHash in MongoDB must match SHA-256(token)');

  // Verify audit log recorded req.ip from trusted rightmost proxy hop (203.0.113.5), ignoring spoofed prefix
  const loginLog = inMemoryActivityLogs.find((l) => l.action === 'LOGIN');
  assert(loginLog && loginLog.ip === '203.0.113.5', `Expected audit log IP "203.0.113.5", got "${loginLog?.ip}"`);
});

await test('5.2 Cookie-only and x-admin-token requests are rejected with HTTP 401', async () => {
  const cookieGetRes = await httpRequest('/api/v1/admin/auth/me', {
    headers: { Cookie: `konnevia_admin_session=${activeAdminToken}` },
  });
  assert(cookieGetRes.status === 401, `Expected 401 for cookie-only GET /admin/auth/me, got ${cookieGetRes.status}`);

  const cookiePostRes = await httpRequest('/api/v1/categories/admin', {
    method: 'POST',
    headers: { Cookie: `konnevia_admin_session=${activeAdminToken}` },
    body: { name: 'Unauthorized Cookie Category' },
  });
  assert(cookiePostRes.status === 401, `Expected 401 for cookie-only admin mutation, got ${cookiePostRes.status}`);

  const customHeaderRes = await httpRequest('/api/v1/admin/auth/me', {
    headers: { 'x-admin-token': activeAdminToken },
  });
  assert(customHeaderRes.status === 401, `Expected 401 for x-admin-token header, got ${customHeaderRes.status}`);
});

await test('5.3 Missing or invalid Bearer tokens are rejected with HTTP 401', async () => {
  const noHeaderRes = await httpRequest('/api/v1/admin/auth/me');
  assert(noHeaderRes.status === 401, `Expected 401 when Authorization header is missing, got ${noHeaderRes.status}`);

  const malformedRes = await httpRequest('/api/v1/admin/auth/me', {
    headers: { Authorization: 'Bearer not-a-valid-64-hex-token' },
  });
  assert(malformedRes.status === 401, `Expected 401 for malformed Bearer token, got ${malformedRes.status}`);

  const wrongTokenRes = await httpRequest('/api/v1/admin/auth/me', {
    headers: { Authorization: `Bearer ${'a'.repeat(64)}` },
  });
  assert(wrongTokenRes.status === 401, `Expected 401 for unknown Bearer token, got ${wrongTokenRes.status}`);
});

await test('5.4 Valid Bearer session is accepted for admin reads and mutations, and enforces DTO validation on mutations', async () => {
  const meRes = await httpRequest('/api/v1/admin/auth/me', {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  assert(meRes.status === 200 && meRes.body?.data?.email === testAdminEmail, 'Expected 200 on /admin/auth/me with valid Bearer token');

  // Verify admin mutation rejects forbidden fields (e.g., shopImage) even when authenticated
  const badUpdateRes = await httpRequest(`/api/v1/admin/providers/${sampleProviderId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${activeAdminToken}` },
    body: { shopImage: { url: 'https://evil.example/injected.png' } },
  });
  assert(badUpdateRes.status === 400, `Expected 400 when admin update includes forbidden shopImage field, got ${badUpdateRes.status}`);

  const goodUpdateRes = await httpRequest(`/api/v1/admin/providers/${sampleProviderId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${activeAdminToken}` },
    body: { city: 'Navi Mumbai' },
  });
  assert(goodUpdateRes.status === 200, `Expected 200 on valid admin provider update, got ${goodUpdateRes.status}`);
});

await test('5.5 Expired admin session is rejected with HTTP 401', async () => {
  const storedAdmin = inMemoryAdmins.get(testAdminEmail);
  const validExpiry = storedAdmin.sessionExpiresAt;
  storedAdmin.sessionExpiresAt = new Date(Date.now() - 60_000);

  const expiredRes = await httpRequest('/api/v1/admin/auth/me', {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  assert(expiredRes.status === 401, `Expected 401 for expired admin session, got ${expiredRes.status}`);

  storedAdmin.sessionExpiresAt = validExpiry;
});

await test('5.6 Server-side logout invalidates the Bearer token immediately', async () => {
  const logoutRes = await httpRequest('/api/v1/admin/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  assert(logoutRes.status === 200, `Expected 200 on logout, got ${logoutRes.status}`);

  const storedAdmin = inMemoryAdmins.get(testAdminEmail);
  assert(storedAdmin.sessionTokenHash === null && storedAdmin.sessionExpiresAt === null, 'Expected sessionTokenHash and sessionExpiresAt to be cleared on logout');

  const afterLogoutRes = await httpRequest('/api/v1/admin/auth/me', {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  assert(afterLogoutRes.status === 401, `Expected 401 when reusing logged-out token, got ${afterLogoutRes.status}`);
});

await test('5.7 Frontend AuthContext and api client store admin token in memory only (no localStorage)', async () => {
  const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const apiSource = stripComments(fs.readFileSync(path.join(__dirname, '../frontend/src/services/api.js'), 'utf8'));
  const authCtxSource = stripComments(fs.readFileSync(path.join(__dirname, '../frontend/src/context/AuthContext.jsx'), 'utf8'));
  assert(!apiSource.includes('localStorage') && !apiSource.includes('sessionStorage'), 'frontend/src/services/api.js must not use localStorage/sessionStorage');
  assert(!authCtxSource.includes('localStorage') && !authCtxSource.includes('sessionStorage'), 'frontend/src/context/AuthContext.jsx must not use localStorage/sessionStorage');
});

// ---------------------------------------------------------------------------
// 6. Fake Public Listings Removal & API Failure Handling
// ---------------------------------------------------------------------------
console.log('\n--- 6. Public Listings Integrity (No Demo Fallback) ---');

await test('6.1 Frontend providerService and public pages never import or fall back to fake demo listings', async () => {
  const frontendFiles = [
    '../frontend/src/services/providerService.js',
    '../frontend/src/pages/home/HomePage.jsx',
    '../frontend/src/pages/providers/ProvidersPage.jsx',
    '../frontend/src/pages/providers/ProviderProfilePage.jsx',
    '../frontend/src/pages/categories/CategoryDetailPage.jsx',
    '../frontend/src/pages/services/ServiceDetailPage.jsx',
  ];

  for (const relPath of frontendFiles) {
    const absPath = path.join(__dirname, relPath);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, 'utf8');
    assert(
      !content.includes('data/providers.js'),
      `Expected ${relPath} not to import static sample data/providers.js`
    );
  }

  // Test providerService behavior when backend returns 503 (DB unavailable)
  globalThis.importMetaEnvStub = BASE_URL;
  const originalFetch = globalThis.fetch;

  try {
    // Point global fetch to our test server's /api/v1
    globalThis.fetch = (input, init) => {
      const rewritten = String(input).replace(/^http:\/\/localhost:\d+\/api\/v1/, `${BASE_URL}/api/v1`);
      return originalFetch(rewritten, init);
    };

    const { providerService } = await import('../frontend/src/services/providerService.js');

    // Case A: Database down (HTTP 503) -> getProviders() must throw, never return sample businesses
    simulatedReadyState = 0;
    let threwOn503 = false;
    try {
      await providerService.getProviders();
    } catch (err) {
      threwOn503 = true;
      assert(err.status === 503, `Expected ApiError status 503, got ${err.status}`);
    }
    assert(threwOn503, 'Expected providerService.getProviders() to throw when API returns 503');

    // Case B: Database up, 0 providers in DB -> returns empty list [], never sample businesses
    simulatedReadyState = 1;
    const savedProviders = new Map(inMemoryProviders);
    inMemoryProviders.clear();
    const emptyResult = await providerService.getProviders();
    assert(
      Array.isArray(emptyResult.data) && emptyResult.data.length === 0 && emptyResult.total === 0,
      `Expected empty provider list when DB has 0 records, got ${emptyResult.data?.length}`
    );

    // Case C: Requesting a known seed slug ('sunrise-retail-store') when not in DB -> throws 404, never returns seed
    let threwOnMissingSlug = false;
    try {
      await providerService.getProviderBySlug('sunrise-retail-store');
    } catch (err) {
      threwOnMissingSlug = true;
      assert(err.status === 404, `Expected 404 for nonexistent slug, got ${err.status}`);
    }
    assert(threwOnMissingSlug, 'Expected providerService.getProviderBySlug() to throw 404 rather than returning seed data');

    // Restore fixture
    for (const [k, v] of savedProviders.entries()) inMemoryProviders.set(k, v);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await new Promise((resolve) => server.close(resolve));

console.log('\n================================================================');
console.log(` SUMMARY: ${passed} passed, ${failed} failed (Total: ${passed + failed})`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
