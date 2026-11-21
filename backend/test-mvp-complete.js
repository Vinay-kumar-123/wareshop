/**
 * WARESHOP — Complete Production-Grade MVP Automated Test Suite
 *
 * Covers all required PART 10 test categories in an isolated, non-destructive environment:
 *   A. Customer Marketplace Tests (Listings, Search, Category Filter, Location Filter, Detail, Contact Reveal, Zero Enquiry Creation)
 *   B. Provider Portal & Resend Email OTP Tests (OTP Send, Cooldown, Verify, Register, Returning Login, Submit Listing with Image, Edit Re-Review, Status/Rejection Visibility)
 *   C. Admin Panel & Lifecycle State Machine Tests (Login, Dashboard Stats, Applications, Approve, Reject with Reason, Publish, Unpublish, Suspend/Reactivate, Category CRUD & Custom Category Requests)
 *   D. Application Security & Abuse Tests (Unauthenticated Access, IDOR Prevention, Mass Assignment, OTP Brute-Force Lockout, Concurrent Approval Prevention, Publish Preconditions, Image Magic-Byte & EXIF Sanitization, Contact Reveal Rate Limit & Consent Gate)
 */

import http from 'http';
import crypto from 'crypto';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.MONGODB_DB_NAME = 'wareshop_mvp_isolated_test';
process.env.OTP_HMAC_SECRET = 'test-hmac-secret-wareshop-2026-key-32bytes';
process.env.RESEND_API_KEY = 're_test_wareshop_resend_key';
process.env.RESEND_FROM_EMAIL = 'WARESHOP <no-reply@wareshop.in>';

const appModule = await import('./src/app.js');
const app = appModule.default;
const Admin = (await import('./src/models/Admin.js')).default;
const ProviderAccount = (await import('./src/models/ProviderAccount.js')).default;
const OtpChallenge = (await import('./src/models/OtpChallenge.js')).default;
const GoogleAuthNonce = (await import('./src/models/GoogleAuthNonce.js')).default;
const Category = (await import('./src/models/Category.js')).default;
const CustomCategoryRequest = (await import('./src/models/CustomCategoryRequest.js')).default;
const Lead = (await import('./src/models/Lead.js')).default;
const Provider = (await import('./src/models/Provider.js')).default;
const ActivityLog = (await import('./src/models/ActivityLog.js')).default;
const { DEFAULT_CATEGORIES } = await import('./src/services/listingLifecycleService.js');
const { validateAndSanitizeImage } = await import('./src/utils/imageSecurity.js');
const storageService = (await import('./src/services/storageService.js')).default;
const googleAuthService = (await import('./src/services/googleAuthService.js')).default;
const {
  buildOtpEmailHtml,
  buildOtpEmailText,
  OTP_EMAIL_SUBJECT,
} = await import('./src/services/resendEmailService.js');

// Simulate connected MongoDB readyState (1) without touching any external database
Object.defineProperty(mongoose.connection, 'readyState', {
  get: () => 1,
  configurable: true,
});

// ---------------------------------------------------------------------------
// In-Memory Collections & Mongoose Query Engine
// ---------------------------------------------------------------------------
const collections = {
  admins: new Map(),
  providerAccounts: new Map(),
  otpChallenges: new Map(),
  googleAuthNonces: new Map(),
  categories: new Map(),
  customCategoryRequests: new Map(),
  leads: new Map(),
  providers: new Map(),
  activityLogs: [],
};

function toIdStr(val) {
  if (!val) return '';
  return String(val._id || val);
}

function matchesCondition(fieldVal, cond) {
  if (cond === null) {
    return fieldVal === null || fieldVal === undefined;
  }
  if (cond instanceof RegExp) {
    if (Array.isArray(fieldVal)) return fieldVal.some((v) => cond.test(String(v)));
    return cond.test(String(fieldVal || ''));
  }
  if (cond instanceof mongoose.Types.ObjectId || typeof cond !== 'object') {
    if (Array.isArray(fieldVal)) {
      return fieldVal.map(String).includes(String(cond));
    }
    if (fieldVal instanceof mongoose.Types.ObjectId || cond instanceof mongoose.Types.ObjectId) {
      return String(fieldVal || '') === String(cond || '');
    }
    return fieldVal === cond;
  }

  // Operator object ($in, $nin, $ne, $gt, $lt, $regex)
  if ('$regex' in cond) {
    const flags = cond.$options || '';
    const re = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(cond.$regex, flags);
    if (Array.isArray(fieldVal)) return fieldVal.some((v) => re.test(String(v)));
    return re.test(String(fieldVal || ''));
  }
  if ('$in' in cond) {
    const list = cond.$in.map((x) => (x instanceof mongoose.Types.ObjectId ? String(x) : x));
    if (Array.isArray(fieldVal)) {
      return fieldVal.some((v) => list.includes(v) || list.includes(String(v)));
    }
    return (
      list.includes(fieldVal) ||
      list.includes(String(fieldVal)) ||
      cond.$in.some((item) => item instanceof RegExp && item.test(String(fieldVal || '')))
    );
  }
  if ('$nin' in cond) {
    const list = cond.$nin.map((x) => (x instanceof mongoose.Types.ObjectId ? String(x) : x));
    if (Array.isArray(fieldVal)) {
      return !fieldVal.some((v) => list.includes(v) || list.includes(String(v)));
    }
    return !list.includes(fieldVal) && !list.includes(String(fieldVal));
  }
  if ('$ne' in cond) {
    if (cond.$ne === null) {
      return fieldVal !== null && fieldVal !== undefined;
    }
    if (cond.$ne instanceof mongoose.Types.ObjectId || fieldVal instanceof mongoose.Types.ObjectId) {
      return String(fieldVal || '') !== String(cond.$ne || '');
    }
    return fieldVal !== cond.$ne;
  }
  if ('$gt' in cond) {
    if (fieldVal instanceof Date || cond.$gt instanceof Date) {
      return new Date(fieldVal).getTime() > new Date(cond.$gt).getTime();
    }
    return fieldVal > cond.$gt;
  }
  if ('$lt' in cond) {
    if (fieldVal instanceof Date || cond.$lt instanceof Date) {
      return new Date(fieldVal).getTime() < new Date(cond.$lt).getTime();
    }
    return fieldVal < cond.$lt;
  }
  return true;
}

function matchesQuery(doc, query = {}) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, cond] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(cond) || !cond.some((sub) => matchesQuery(doc, sub))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(cond) || !cond.every((sub) => matchesQuery(doc, sub))) return false;
      continue;
    }
    if (!matchesCondition(doc[key], cond)) return false;
  }
  return true;
}

function wrapDoc(Model, store, raw) {
  if (!raw) return null;
  let hydrated = raw;
  if (Model && typeof Model === 'function') {
    try {
      const instance = new Model(raw);
      hydrated = instance.toObject();
    } catch {
      hydrated = { ...raw };
    }
  }
  if (!hydrated._id) hydrated._id = new mongoose.Types.ObjectId();
  if (!hydrated.createdAt) hydrated.createdAt = new Date();
  if (!hydrated.updatedAt) hydrated.updatedAt = new Date();

  const doc = {
    ...hydrated,
    toObject() {
      const copy = { ...this };
      delete copy.save;
      delete copy.toObject;
      return copy;
    },
    async save() {
      this.updatedAt = new Date();
      store.set(String(this._id), this);
      return this;
    },
  };
  return doc;
}

function makeChainableQuery(getResultsFn, isSingle = false) {
  let sortSpec = null;
  let skipCount = 0;
  let limitCount = null;

  const execute = (asLean) => {
    let list = getResultsFn();
    if (sortSpec) {
      const entries = Object.entries(sortSpec);
      list = [...list].sort((a, b) => {
        for (const [field, dir] of entries) {
          const av = a[field] instanceof Date ? a[field].getTime() : a[field] ?? '';
          const bv = b[field] instanceof Date ? b[field].getTime() : b[field] ?? '';
          if (av < bv) return dir === -1 ? 1 : -1;
          if (av > bv) return dir === -1 ? -1 : 1;
        }
        return 0;
      });
    }
    if (skipCount > 0) list = list.slice(skipCount);
    if (limitCount !== null) list = list.slice(0, limitCount);

    if (isSingle) {
      const item = list[0] || null;
      return item ? (asLean ? item.toObject() : item) : null;
    }
    return asLean ? list.map((d) => d.toObject()) : list;
  };

  const chain = {
    select() {
      return chain;
    },
    sort(spec) {
      sortSpec = spec;
      return chain;
    },
    skip(n) {
      skipCount = n;
      return chain;
    },
    limit(n) {
      limitCount = n;
      return chain;
    },
    populate() {
      return chain;
    },
    lean() {
      return Promise.resolve(execute(true));
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(execute(false)).then(onFulfilled, onRejected);
    },
  };
  return chain;
}

function attachStoreMethods(Model, store) {
  Model.find = (query = {}) =>
    makeChainableQuery(() => Array.from(store.values()).filter((d) => matchesQuery(d, query)), false);

  Model.findOne = (query = {}) =>
    makeChainableQuery(() => Array.from(store.values()).filter((d) => matchesQuery(d, query)), true);

  Model.findById = (id) =>
    makeChainableQuery(() => {
      const found = store.get(toIdStr(id));
      return found ? [found] : [];
    }, true);

  Model.countDocuments = async (query = {}) =>
    Array.from(store.values()).filter((d) => matchesQuery(d, query)).length;

  Model.estimatedDocumentCount = async () => store.size;

  Model.exists = async (query = {}) => {
    const found = Array.from(store.values()).find((d) => matchesQuery(d, query));
    return found ? { _id: found._id } : null;
  };

  Model.create = async (data) => {
    const doc = wrapDoc(Model, store, { ...data });
    store.set(String(doc._id), doc);
    return doc;
  };

  Model.updateOne = async (filter, update, options = {}) => {
    const existing = Array.from(store.values()).find((d) => matchesQuery(d, filter));
    if (existing) {
      if (update.$set) Object.assign(existing, update.$set);
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          existing[k] = (existing[k] || 0) + v;
        }
      }
      existing.updatedAt = new Date();
      store.set(String(existing._id), existing);
      return { acknowledged: true, modifiedCount: 1 };
    }
    if (options.upsert) {
      const base = {};
      for (const [k, v] of Object.entries(filter)) {
        if (!k.startsWith('$') && (typeof v !== 'object' || v instanceof mongoose.Types.ObjectId)) {
          base[k] = v;
        }
      }
      if (update.$setOnInsert) Object.assign(base, update.$setOnInsert);
      if (update.$set) Object.assign(base, update.$set);
      const created = wrapDoc(Model, store, base);
      store.set(String(created._id), created);
      return { acknowledged: true, upsertedCount: 1 };
    }
    return { acknowledged: true, modifiedCount: 0 };
  };

  Model.updateMany = async (filter, update) => {
    const matches = Array.from(store.values()).filter((d) => matchesQuery(d, filter));
    for (const doc of matches) {
      if (update.$set) Object.assign(doc, update.$set);
      doc.updatedAt = new Date();
      store.set(String(doc._id), doc);
    }
    return { acknowledged: true, modifiedCount: matches.length };
  };

  Model.findOneAndUpdate = async (filter, update, options = {}) => {
    const existing = Array.from(store.values()).find((d) => matchesQuery(d, filter));
    if (!existing) return null;
    if (update.$set) Object.assign(existing, update.$set);
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        existing[k] = (existing[k] || 0) + v;
      }
    }
    existing.updatedAt = new Date();
    store.set(String(existing._id), existing);
    return options.new ? existing : existing;
  };
}

attachStoreMethods(Category, collections.categories);
attachStoreMethods(CustomCategoryRequest, collections.customCategoryRequests);
attachStoreMethods(OtpChallenge, collections.otpChallenges);
attachStoreMethods(GoogleAuthNonce, collections.googleAuthNonces);
attachStoreMethods(ProviderAccount, collections.providerAccounts);
attachStoreMethods(Lead, collections.leads);
attachStoreMethods(Provider, collections.providers);

// Hook Lead.prototype.save and Provider.prototype.save for `new Lead(...)` / `new Provider(...)`
Lead.prototype.save = async function () {
  const plain = this.toObject();
  const wrapped = wrapDoc(Lead, collections.leads, plain);
  collections.leads.set(String(wrapped._id), wrapped);
  return this;
};

Provider.prototype.save = async function () {
  const plain = this.toObject();
  const wrapped = wrapDoc(Provider, collections.providers, plain);
  collections.providers.set(String(wrapped._id), wrapped);
  return this;
};

Provider.aggregate = async () => {
  const map = new Map();
  for (const p of collections.providers.values()) {
    const slug = p.categorySlug;
    const entry = map.get(slug) || { _id: slug, totalCount: 0, publishedCount: 0 };
    entry.totalCount += 1;
    if (p.verificationStatus === 'VERIFIED' && p.publicationStatus === 'PUBLISHED') {
      entry.publishedCount += 1;
    }
    map.set(slug, entry);
  }
  return Array.from(map.values());
};

// Admin & ActivityLog stubs
const adminEmail = 'owner@wareshop.in';
const adminPassword = 'Own3r#WareshopPassword2026!';
const { salt: adminSalt, passwordHash: adminHash } = Admin.hashPassword(adminPassword);

const adminDoc = {
  _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
  email: adminEmail,
  passwordHash: adminHash,
  salt: adminSalt,
  role: 'SUPER_ADMIN',
  sessionToken: null,
  sessionTokenHash: null,
  sessionExpiresAt: null,
  verifyPassword(pw) {
    return Admin.schema.methods.verifyPassword.call(this, pw);
  },
  async save() {
    collections.admins.set(this.email, this);
    return this;
  },
};
collections.admins.set(adminEmail, adminDoc);

Admin.findOne = async (query = {}) => {
  if (query.email) return collections.admins.get(query.email) || null;
  if (query.sessionTokenHash) {
    for (const adm of collections.admins.values()) {
      if (
        adm.sessionTokenHash === query.sessionTokenHash &&
        adm.sessionExpiresAt &&
        adm.sessionExpiresAt > new Date()
      ) {
        return adm;
      }
    }
  }
  return null;
};

ActivityLog.create = async (entry) => {
  const doc = { _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...entry };
  collections.activityLogs.unshift(doc);
  return doc;
};
ActivityLog.find = () => ({
  sort: () => ({
    limit: (n) => ({
      lean: async () => collections.activityLogs.slice(0, n),
    }),
  }),
});

// Seed the 4 initial WARESHOP categories
for (const cat of DEFAULT_CATEGORIES) {
  const doc = wrapDoc(Category, collections.categories, { ...cat, _id: new mongoose.Types.ObjectId() });
  collections.categories.set(String(doc._id), doc);
}

// Intercept outbound Resend API HTTP requests to capture generated OTPs without external network calls
let lastCapturedOtpByEmail = new Map();
let lastOutboundEndpoint = null;
let lastOutboundPayload = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const urlStr = String(input);
  lastOutboundEndpoint = urlStr;
  if (urlStr.includes('fast2sms.com') || urlStr.includes('2factor.in')) {
    throw new Error(`Unexpected legacy SMS/WhatsApp call detected: ${urlStr}`);
  }
  if (urlStr.includes('api.resend.com/emails')) {
    const bodyJson = init?.body ? JSON.parse(String(init.body)) : {};
    lastOutboundPayload = bodyJson;
    const recipient = Array.isArray(bodyJson.to) ? String(bodyJson.to[0] || '').toLowerCase() : '';
    const otpMatch = String(bodyJson.text || bodyJson.html || '').match(/\b(\d{6})\b/);
    if (recipient && otpMatch) {
      lastCapturedOtpByEmail.set(recipient, otpMatch[1]);
    }
    return new Response(
      JSON.stringify({
        id: `resend-email-${Date.now()}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return realFetch(input, init);
};

// Preserve real storageService methods for Cloudinary integration tests in Part E
const realStorageUploadImage = storageService.uploadImage.bind(storageService);
const realStorageDeleteImage = storageService.deleteImage.bind(storageService);

// Stub storageService.uploadImage to run real binary magic-byte + EXIF sanitization without writing files to disk
storageService.uploadImage = async (file) => {
  const sanitized = validateAndSanitizeImage(file);
  return {
    url: `https://res.cloudinary.com/demo/image/upload/v1/wareshop/providers/test-${Date.now()}.jpg`,
    publicId: `wareshop/providers/test-${Date.now()}`,
    mimeType: sanitized.mimeType,
    size: sanitized.size,
  };
};
storageService.deleteImage = async () => {};

// Start ephemeral HTTP server
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const BASE_URL = `http://127.0.0.1:${port}`;

function httpRequest(reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const headers = { ...(options.headers || {}) };
    let payload = null;

    if (options.rawBuffer) {
      payload = options.rawBuffer;
      headers['Content-Length'] = payload.length;
    } else if (options.body !== undefined) {
      payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
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
          resolve({ status: res.statusCode, headers: res.headers, body: json ?? raw });
        });
      }
    );
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

function buildMultipartRequest(fields, fileField) {
  const boundary = `----WareshopTestBoundary${crypto.randomBytes(8).toString('hex')}`;
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(value)}\r\n`,
        'utf8'
      )
    );
  }

  if (fileField) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.fieldName || 'shopImage'}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.contentType}\r\n\r\n`,
        'utf8'
      )
    );
    parts.push(fileField.buffer);
    parts.push(Buffer.from('\r\n', 'utf8'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    buffer: Buffer.concat(parts),
  };
}

// Create a valid minimal JPEG with an APP1 EXIF segment to verify EXIF stripping
function createValidJpegWithExif() {
  const soi = Buffer.from([0xff, 0xd8]);
  const exifPayload = Buffer.from('Exif\0\0GPS-SECRET-COORDINATES', 'ascii');
  const app1Len = Buffer.alloc(2);
  app1Len.writeUInt16BE(exifPayload.length + 2, 0);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), app1Len, exifPayload]);

  // SOF0 marker + minimal scan + EOI
  const sof0 = Buffer.from([
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
    0x03, 0x11, 0x01,
  ]);
  const sos = Buffer.from([
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, 0x00,
  ]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app1, sof0, sos, eoi]);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        -> ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

console.log('\n================================================================');
console.log(' WARESHOP — COMPLETE MVP INTEGRATION & SECURITY TEST SUITE');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// PART A: PROVIDER EMAIL OTP AUTHENTICATION & PORTAL WORKFLOW
// ---------------------------------------------------------------------------
console.log('--- A. Provider Resend Email OTP Authentication & Portal Workflow ---');

const provider1Email = 'rajesh@bhiwandilogistics.in';
const provider1Phone = '9820111222';
const provider2Email = 'suresh@navicoldchain.in';
const provider2Phone = '9820333444';
let provider1Token = null;
let provider2Token = null;
let provider1ApplicationId = null;

await test('A.1 Provider requests Email OTP via Resend endpoint and 60s cooldown blocks immediate duplicate', async () => {
  const sendRes = await httpRequest('/api/v1/provider-auth/otp/send', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: '  Rajesh@BhiwandiLogistics.IN  ' },
  });
  assert(sendRes.status === 200, `Expected 200 on Email OTP send, got ${sendRes.status}`);
  assert(lastCapturedOtpByEmail.has(provider1Email), 'Expected Resend email gateway to receive generated 6-digit OTP');
  assert(
    lastOutboundEndpoint && lastOutboundEndpoint.includes('api.resend.com/emails'),
    'Expected outbound delivery to use Resend Email API'
  );
  assert(
    !lastOutboundEndpoint.includes('fast2sms.com') && !lastOutboundEndpoint.includes('2factor.in'),
    'Expected Fast2SMS/2Factor to NOT be used'
  );
  assert(
    sendRes.body?.data?.emailMasked && !sendRes.body?.data?.otp,
    'Expected masked email and zero plaintext OTP exposure in response'
  );

  // Verify plaintext OTP is never persisted in OtpChallenge
  const latestChallenge = Array.from(collections.otpChallenges.values()).find(
    (c) => c.email === provider1Email
  );
  assert(latestChallenge, 'Expected OtpChallenge document created');
  assert(!latestChallenge.phone, 'Expected OtpChallenge.phone to remain unset for email challenges');
  assert(
    latestChallenge.otpHash && latestChallenge.otpHash !== lastCapturedOtpByEmail.get(provider1Email),
    'Expected OtpChallenge to store only HMAC hash, never plaintext OTP'
  );

  // Immediate second request within 60s cooldown -> 429
  const cooldownRes = await httpRequest('/api/v1/provider-auth/otp/send', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: provider1Email },
  });
  assert(cooldownRes.status === 429, `Expected 429 cooldown block, got ${cooldownRes.status}`);
  assert(cooldownRes.headers['retry-after'], 'Expected Retry-After header on cooldown 429');
});

await test('A.2 Invalid OTP is rejected, valid OTP issues one-time verificationToken, and Email OTP never marks phoneVerified', async () => {
  const badRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: provider1Email, otp: '000000' },
  });
  assert(badRes.status === 400, `Expected 400 for wrong OTP, got ${badRes.status}`);

  const realOtp = lastCapturedOtpByEmail.get(provider1Email);
  const verifyRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: provider1Email, otp: realOtp },
  });
  assert(verifyRes.status === 200, `Expected 200 on valid OTP verify, got ${verifyRes.status}`);
  assert(verifyRes.body?.data?.emailVerified === true, 'Expected emailVerified=true on verify response');
  const verificationToken = verifyRes.body?.data?.verificationToken;
  assert(verificationToken && verificationToken.length === 64, 'Expected 64-char verificationToken');

  // Replaying already-verified OTP must fail
  const replayOtpRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: provider1Email, otp: realOtp },
  });
  assert(replayOtpRes.status === 400, `Expected 400 when replaying used OTP, got ${replayOtpRes.status}`);

  // Unauthorized registration with wrong email or missing verificationToken -> 403
  const wrongEmailReg = await httpRequest('/api/v1/provider-auth/register', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: 'attacker@example.com', verificationToken, phone: provider1Phone },
  });
  assert(wrongEmailReg.status === 403, `Expected 403 when binding verificationToken to wrong email, got ${wrongEmailReg.status}`);

  // Register provider account using bound verificationToken
  const regRes = await httpRequest('/api/v1/provider-auth/register', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: provider1Email, verificationToken, phone: provider1Phone },
  });
  assert(regRes.status === 201, `Expected 201 on new provider registration, got ${regRes.status}`);
  assert(regRes.body?.data?.emailVerified === true, 'Expected emailVerified=true on registered provider');
  assert(regRes.body?.data?.phoneVerified === false, 'Email OTP must NEVER mark phoneVerified=true');
  assert(regRes.body?.data?.phone === provider1Phone, 'Expected provider business mobile number preserved');
  assert(regRes.headers['set-cookie']?.some((c) => c.includes('wareshop_provider_session=')), 'Expected session cookie');
  provider1Token = regRes.body?.data?.token;
  assert(provider1Token && provider1Token.length === 64, 'Expected provider session token');

  // Reusing consumed verificationToken must fail with 403
  const reuseRes = await httpRequest('/api/v1/provider-auth/register', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.10' },
    body: { email: provider1Email, verificationToken },
  });
  assert(reuseRes.status === 403, `Expected 403 when reusing consumed verificationToken, got ${reuseRes.status}`);
});

await test('A.3 Returning provider can log in again via Email OTP and update profile (verified email remains locked)', async () => {
  // Expire cooldown on previous challenge so provider1 can request a new login OTP
  for (const ch of collections.otpChallenges.values()) {
    ch.sentAt = new Date(Date.now() - 120_000);
  }

  const sendRes = await httpRequest('/api/v1/provider-auth/otp/send', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.11' },
    body: { email: provider1Email },
  });
  assert(sendRes.status === 200, `Expected 200 on returning provider Email OTP send, got ${sendRes.status}`);

  const loginOtp = lastCapturedOtpByEmail.get(provider1Email);
  const verifyRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.11' },
    body: { email: provider1Email, otp: loginOtp },
  });
  const loginRes = await httpRequest('/api/v1/provider-auth/login', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.11' },
    body: { email: provider1Email, verificationToken: verifyRes.body.data.verificationToken },
  });
  assert(loginRes.status === 200, `Expected 200 on returning provider login, got ${loginRes.status}`);
  assert(loginRes.body.data.isNewAccount === false, 'Expected isNewAccount=false for returning provider');
  assert(loginRes.body.data.phone === provider1Phone, 'Expected existing phone preserved on returning login');
  assert(loginRes.body.data.phoneVerified === false, 'Expected phoneVerified to remain false');
  provider1Token = loginRes.body.data.token;

  // Attempt to change verified email via profile endpoint -> 400
  const changeEmailRes = await httpRequest('/api/v1/provider-auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${provider1Token}` },
    body: { name: 'Rajesh Logistics Owner', email: 'hacked@otherdomain.in' },
  });
  assert(changeEmailRes.status === 400, `Expected 400 when attempting to change verified email, got ${changeEmailRes.status}`);

  // Valid profile update (name) -> 200
  const profileRes = await httpRequest('/api/v1/provider-auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${provider1Token}` },
    body: { name: 'Rajesh Deshmukh' },
  });
  assert(profileRes.status === 200 && profileRes.body.data.name === 'Rajesh Deshmukh', 'Expected profile update 200');
});

await test('A.4 Provider submits a listing with a valid JPEG (EXIF stripped) and listing starts as SUBMITTED (not public)', async () => {
  const jpegWithExif = createValidJpegWithExif();
  assert(jpegWithExif.includes(Buffer.from('GPS-SECRET-COORDINATES')), 'Test JPEG fixture must initially contain EXIF GPS bytes');

  const sanitizedCheck = validateAndSanitizeImage({
    buffer: jpegWithExif,
    mimetype: 'image/jpeg',
  });
  assert(!sanitizedCheck.buffer.includes(Buffer.from('GPS-SECRET-COORDINATES')), 'EXIF APP1 metadata must be stripped from JPEG buffer');

  const mp = buildMultipartRequest(
    {
      businessName: 'Bhiwandi Mega Logistics Hub',
      contactPerson: 'Rajesh Deshmukh',
      phone: provider1Phone,
      email: 'rajesh@bhiwandilogistics.in',
      category: 'Warehouse',
      servicesOffered: 'Bonded Storage, Pallet Racking, Dock Levelers',
      serviceAreas: 'Mumbai, Bhiwandi, Thane',
      address: 'Gate 4, Industrial Corridor, NH-3',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '421302',
      website: 'https://bhiwandilogistics.in',
      businessDescription: '60,000 sq.ft Grade-A commercial warehouse with 6 loading bays and 24x7 security.',
      consentToContact: 'true',
      consentToDisplayPhone: 'true',
    },
    {
      filename: 'warehouse-front.jpg',
      contentType: 'image/jpeg',
      buffer: jpegWithExif,
    }
  );

  const subRes = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider1Token}`,
      'Content-Type': mp.contentType,
      'X-Forwarded-For': '203.0.113.12',
    },
    rawBuffer: mp.buffer,
  });

  assert(subRes.status === 201, `Expected 201 on listing submission, got ${subRes.status}: ${JSON.stringify(subRes.body)}`);
  assert(subRes.body.data.status === 'SUBMITTED', `Expected initial status SUBMITTED, got ${subRes.body.data.status}`);
  provider1ApplicationId = subRes.body.data.id;

  // Verify listing does NOT appear in public marketplace while SUBMITTED
  const pubRes = await httpRequest('/api/v1/providers');
  assert(pubRes.status === 200 && pubRes.body.data.providers.length === 0, 'SUBMITTED listing must not appear publicly');
});

await test('A.5 Submitting a listing with an invalid phone number or malicious non-image file is rejected', async () => {
  // Invalid mobile number -> 400
  const wrongPhoneRes = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider1Token}`,
      'X-Forwarded-For': '203.0.113.13',
    },
    body: {
      businessName: 'Invalid Phone Shop',
      contactPerson: 'Rajesh Deshmukh',
      phone: '12345',
      category: 'Shop',
      servicesOffered: 'Retail Showroom',
      city: 'Mumbai',
      businessDescription: 'Attempting to submit an invalid phone number.',
      consentToContact: true,
    },
  });
  assert(wrongPhoneRes.status === 400, `Expected 400 when submitting invalid phone number, got ${wrongPhoneRes.status}`);

  // Disguised SVG/script uploaded as .jpg -> 400
  const fakeJpg = Buffer.from('<svg onload="alert(1)"></svg>', 'utf8');
  const badMp = buildMultipartRequest(
    {
      businessName: 'Malicious Image Shop',
      contactPerson: 'Rajesh Deshmukh',
      phone: provider1Phone,
      category: 'Shop',
      servicesOffered: 'Retail Showroom',
      city: 'Mumbai',
      businessDescription: 'Attempting to upload SVG disguised as JPEG.',
      consentToContact: 'true',
    },
    {
      filename: 'exploit.jpg',
      contentType: 'image/jpeg',
      buffer: fakeJpg,
    }
  );

  const badImgRes = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider1Token}`,
      'Content-Type': badMp.contentType,
      'X-Forwarded-For': '203.0.113.14',
    },
    rawBuffer: badMp.buffer,
  });
  assert(badImgRes.status === 400, `Expected 400 for disguised non-image upload, got ${badImgRes.status}`);
});

await test('A.6 Email OTP handles expired OTPs, concurrent verification races, and Resend delivery failures without bypassing verification', async () => {
  // 1. Concurrent verification race: only ONE of two simultaneous /otp/verify calls can succeed
  const raceEmail = 'Concurrent.Test@WareShop.IN';
  const normalizedRaceEmail = 'concurrent.test@wareshop.in';
  const sendRaceRes = await httpRequest('/api/v1/provider-auth/otp/send', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.15' },
    body: { email: raceEmail },
  });
  assert(sendRaceRes.status === 200, `Expected 200 for normalized email OTP request, got ${sendRaceRes.status}`);
  const raceOtp = lastCapturedOtpByEmail.get(normalizedRaceEmail);
  assert(raceOtp && /^\d{6}$/.test(raceOtp), 'Expected 6-digit OTP captured for normalized email');

  const [verA, verB] = await Promise.all([
    httpRequest('/api/v1/provider-auth/otp/verify', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.15' },
      body: { email: normalizedRaceEmail, otp: raceOtp },
    }),
    httpRequest('/api/v1/provider-auth/otp/verify', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.15' },
      body: { email: normalizedRaceEmail, otp: raceOtp },
    }),
  ]);
  const raceStatuses = [verA.status, verB.status].sort();
  assert(
    raceStatuses[0] === 200 && raceStatuses[1] === 400,
    `Expected strictly one 200 and one 400 on concurrent verification, got ${raceStatuses.join(', ')}`
  );

  // 2. Expired OTP must be rejected with 400
  const expiredEmail = 'expired-otp@wareshop.in';
  const sendExpRes = await httpRequest('/api/v1/provider-auth/otp/send', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.17' },
    body: { email: expiredEmail },
  });
  assert(sendExpRes.status === 200, `Expected 200 on OTP send for expiry test, got ${sendExpRes.status}`);
  const expOtp = lastCapturedOtpByEmail.get(expiredEmail);
  const expChallenge = Array.from(collections.otpChallenges.values()).find(
    (c) => c.email === expiredEmail
  );
  expChallenge.expiresAt = new Date(Date.now() - 10_000);

  const expiredVerifyRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.17' },
    body: { email: expiredEmail, otp: expOtp },
  });
  assert(expiredVerifyRes.status === 400, `Expected 400 for expired OTP, got ${expiredVerifyRes.status}`);

  // 3. Simulate Resend provider delivery failure: returns 502, marks challenge FAILED, never bypasses verification
  const failingEmail = 'delivery-failure@wareshop.in';
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const urlStr = String(input);
    if (urlStr.includes('api.resend.com/emails')) {
      const bodyJson = init?.body ? JSON.parse(String(init.body)) : {};
      if (Array.isArray(bodyJson.to) && bodyJson.to.includes(failingEmail)) {
        return new Response(
          JSON.stringify({ statusCode: 502, name: 'application_error', message: 'Resend outage simulation' }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    return savedFetch(input, init);
  };

  try {
    const failRes = await httpRequest('/api/v1/provider-auth/otp/send', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.16' },
      body: { email: failingEmail },
    });
    assert(failRes.status === 502, `Expected 502 on Resend delivery failure, got ${failRes.status}`);

    const failedChallenge = Array.from(collections.otpChallenges.values()).find(
      (c) => c.email === failingEmail
    );
    assert(
      failedChallenge && failedChallenge.deliveryStatus === 'FAILED',
      'Expected failed challenge to be marked deliveryStatus=FAILED'
    );

    // Attempting to verify this failed challenge must fail
    const bypassAttemptRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.16' },
      body: { email: failingEmail, otp: '123456' },
    });
    assert(
      bypassAttemptRes.status === 400,
      `Expected 400 verification rejection on failed challenge, got ${bypassAttemptRes.status}`
    );
  } finally {
    globalThis.fetch = savedFetch;
  }
});

// ---------------------------------------------------------------------------
// PART B: ADMIN PANEL & LISTING LIFECYCLE STATE MACHINE
// ---------------------------------------------------------------------------
console.log('\n--- B. Admin Panel, Application Review & Listing Lifecycle ---');

let adminToken = null;
let publishedProviderId = null;
let publishedProviderSlug = null;

await test('B.1 Admin logs in and views real database dashboard statistics', async () => {
  const loginRes = await httpRequest('/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.20' },
    body: { email: adminEmail, password: adminPassword },
  });
  assert(loginRes.status === 200, `Expected 200 on admin login, got ${loginRes.status}`);
  adminToken = loginRes.body.data.token;

  const dashRes = await httpRequest('/api/v1/admin/dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(dashRes.status === 200, `Expected 200 on admin dashboard, got ${dashRes.status}`);
  assert(dashRes.body.data.stats.pendingApplications === 1, 'Expected 1 pending application in dashboard stats');
  assert(dashRes.body.data.stats.totalProviders === 1, 'Expected 1 registered provider account');
});

await test('B.2 Admin views pending application, approves it (creates APPROVED/DRAFT listing), and duplicate concurrent approval returns 409', async () => {
  const listRes = await httpRequest('/api/v1/admin/applications?status=SUBMITTED', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(listRes.status === 200 && listRes.body.data.length === 1, 'Expected 1 SUBMITTED application');

  // Fire two concurrent approval requests for the same application
  const [resA, resB] = await Promise.all([
    httpRequest(`/api/v1/admin/applications/${provider1ApplicationId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {},
    }),
    httpRequest(`/api/v1/admin/applications/${provider1ApplicationId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {},
    }),
  ]);

  const statuses = [resA.status, resB.status].sort();
  assert(
    statuses[0] === 200 && statuses[1] === 409,
    `Expected one 200 and one 409 on concurrent approval, got ${statuses.join(', ')}`
  );
  assert(collections.providers.size === 1, `Expected exactly 1 Provider listing created, got ${collections.providers.size}`);

  const winRes = resA.status === 200 ? resA : resB;
  publishedProviderId = winRes.body.data.provider._id;
  publishedProviderSlug = winRes.body.data.provider.slug;
  assert(winRes.body.data.provider.status === 'APPROVED', 'Approved listing must start in APPROVED state');
  assert(winRes.body.data.provider.publicationStatus === 'DRAFT', 'Approval must not auto-publish (starts as DRAFT)');

  // Still not visible on public marketplace before explicit publish
  const pubCheck = await httpRequest('/api/v1/providers');
  assert(pubCheck.body.data.providers.length === 0, 'APPROVED/DRAFT listing must not appear publicly before publish');
});

await test('B.3 Admin publishes the approved listing -> appears in public marketplace', async () => {
  const pubAction = await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(pubAction.status === 200, `Expected 200 on publish, got ${pubAction.status}`);
  assert(pubAction.body.data.status === 'PUBLISHED', 'Expected status PUBLISHED');

  const pubList = await httpRequest('/api/v1/providers');
  assert(pubList.status === 200 && pubList.body.data.providers.length === 1, 'Expected 1 published listing in public API');
});

// ---------------------------------------------------------------------------
// PART C: CUSTOMER MARKETPLACE & DIRECT OWNER CONTACT WORKFLOW
// ---------------------------------------------------------------------------
console.log('\n--- C. Customer Marketplace Search, Detail & Protected Contact Reveal ---');

await test('C.1 Customer searches by keyword, category, and location ($and combined filters)', async () => {
  // Keyword search
  const kwRes = await httpRequest('/api/v1/providers?search=Bonded');
  assert(kwRes.status === 200 && kwRes.body.data.providers.length === 1, 'Keyword search for "Bonded" should match');

  // Category filter
  const catMatch = await httpRequest('/api/v1/providers?category=warehouse');
  assert(catMatch.status === 200 && catMatch.body.data.providers.length === 1, 'Category filter "warehouse" should match');

  const catEmpty = await httpRequest('/api/v1/providers?category=office');
  assert(catEmpty.status === 200 && catEmpty.body.data.providers.length === 0, 'Category filter "office" should return 0');

  // Combined location + keyword search ($and)
  const combinedMatch = await httpRequest('/api/v1/providers?location=Mumbai&search=Warehouse');
  assert(combinedMatch.status === 200 && combinedMatch.body.data.providers.length === 1, 'Combined Mumbai + Warehouse should match');

  const combinedMiss = await httpRequest('/api/v1/providers?location=Delhi&search=Warehouse');
  assert(combinedMiss.status === 200 && combinedMiss.body.data.providers.length === 0, 'Combined Delhi + Warehouse must return 0 (no $or overwrite)');
});

await test('C.2 Public listing search and detail endpoints never leak contactNumber or email', async () => {
  const listRes = await httpRequest('/api/v1/providers');
  const cardItem = listRes.body.data.providers[0];
  assert(cardItem.contactNumber === undefined, 'Public search response must not expose contactNumber');
  assert(cardItem.email === undefined, 'Public search response must not expose email');

  const detailRes = await httpRequest(`/api/v1/providers/${publishedProviderSlug}`);
  assert(detailRes.status === 200, `Expected 200 on detail page, got ${detailRes.status}`);
  assert(detailRes.body.data.businessName === 'Bhiwandi Mega Logistics Hub', 'Expected businessName on detail page');
  assert(detailRes.body.data.contactNumber === undefined, 'Public detail response must not expose contactNumber');
  assert(detailRes.body.data.email === undefined, 'Public detail response must not expose email');
});

await test('C.3 Protected contact-reveal endpoint returns verified owner phone & tel: URI and creates ZERO enquiry records', async () => {
  const leadsBefore = collections.leads.size;

  const revealRes = await httpRequest(`/api/v1/providers/${publishedProviderSlug}/contact`, {
    headers: { 'X-Forwarded-For': '198.51.100.77' },
  });
  assert(revealRes.status === 200, `Expected 200 on contact reveal, got ${revealRes.status}`);
  assert(revealRes.body.data.contactNumber === provider1Phone, `Expected verified owner number ${provider1Phone}`);
  assert(revealRes.body.data.telUri === `tel:+91${provider1Phone}`, 'Expected tel:+91... URI');

  const leadsAfter = collections.leads.size;
  assert(leadsAfter === leadsBefore, 'Contact reveal must NEVER create an admin enquiry record');
});

// ---------------------------------------------------------------------------
// PART D: SECURITY, IDOR, RE-REVIEW ON EDIT, SUSPENSION & CUSTOM CATEGORIES
// ---------------------------------------------------------------------------
console.log('\n--- D. Security, IDOR, Re-Review on Edit, Suspension & Custom Categories ---');

await test('D.1 Second provider cannot view or edit first provider’s listing (IDOR -> 403)', async () => {
  // Authenticate second provider via Email OTP
  await httpRequest('/api/v1/provider-auth/otp/send', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.30' },
    body: { email: provider2Email },
  });
  const otp2 = lastCapturedOtpByEmail.get(provider2Email);
  const ver2 = await httpRequest('/api/v1/provider-auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.30' },
    body: { email: provider2Email, otp: otp2 },
  });
  const reg2 = await httpRequest('/api/v1/provider-auth/register', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.30' },
    body: {
      email: provider2Email,
      phone: provider2Phone,
      verificationToken: ver2.body.data.verificationToken,
    },
  });
  provider2Token = reg2.body.data.token;

  // Provider 2 tries to GET Provider 1's listing -> 403
  const idorGet = await httpRequest(`/api/v1/provider-portal/listings/${provider1ApplicationId}`, {
    headers: { Authorization: `Bearer ${provider2Token}` },
  });
  assert(idorGet.status === 403, `Expected 403 on cross-provider GET, got ${idorGet.status}`);

  // Provider 2 tries to PUT Provider 1's listing -> 403
  const idorPut = await httpRequest(`/api/v1/provider-portal/listings/${provider1ApplicationId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${provider2Token}` },
    body: {
      businessName: 'Hijacked Listing',
      contactPerson: 'Attacker',
      phone: provider2Phone,
      category: 'Warehouse',
      servicesOffered: 'Storage',
      city: 'Mumbai',
      businessDescription: 'Attempting to hijack another provider listing.',
      consentToContact: true,
    },
  });
  assert(idorPut.status === 403, `Expected 403 on cross-provider PUT, got ${idorPut.status}`);
});

await test('D.2 Editing a PUBLISHED listing by its owner transitions it back to SUBMITTED review and removes it from public search until re-approved', async () => {
  const editRes = await httpRequest(`/api/v1/provider-portal/listings/${provider1ApplicationId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${provider1Token}` },
    body: {
      businessName: 'Bhiwandi Mega Logistics Hub (Expanded Phase 2)',
      contactPerson: 'Rajesh Deshmukh',
      phone: provider1Phone,
      category: 'Warehouse',
      servicesOffered: 'Bonded Storage, Cold Chain, Pallet Racking',
      city: 'Mumbai',
      state: 'Maharashtra',
      businessDescription: 'Expanded 85,000 sq.ft Grade-A commercial warehouse facility.',
      consentToContact: true,
      consentToDisplayPhone: true,
    },
  });
  assert(editRes.status === 200, `Expected 200 on owner listing edit, got ${editRes.status}`);
  assert(editRes.body.data.status === 'SUBMITTED', `Edited listing must re-enter SUBMITTED review state, got ${editRes.body.data.status}`);

  // Verify no longer visible publicly while awaiting re-approval
  const pubAfterEdit = await httpRequest('/api/v1/providers');
  assert(pubAfterEdit.body.data.providers.length === 0, 'Edited listing awaiting re-review must not remain publicly visible');

  // Admin re-approves and re-publishes
  await httpRequest(`/api/v1/admin/applications/${provider1ApplicationId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {},
  });
  await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const pubRestored = await httpRequest('/api/v1/providers');
  assert(pubRestored.body.data.providers.length === 1, 'Re-approved and published listing is live again');
});

await test('D.3 Suspending a provider immediately hides their listings from public search and blocks contact reveal', async () => {
  const suspRes = await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/suspend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { reason: 'Compliance verification hold.' },
  });
  assert(suspRes.status === 200 && suspRes.body.data.status === 'SUSPENDED', 'Expected listing status SUSPENDED');

  const pubSearch = await httpRequest('/api/v1/providers');
  assert(pubSearch.body.data.providers.length === 0, 'Suspended provider listing must disappear from public search');

  const contactAttempt = await httpRequest(`/api/v1/providers/${publishedProviderSlug}/contact`);
  assert(contactAttempt.status === 404, `Contact reveal for suspended provider must return 404, got ${contactAttempt.status}`);

  // Reactivate and re-publish
  const reactRes = await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/reactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(reactRes.status === 200 && reactRes.body.data.status === 'APPROVED', 'Reactivated listing returns to APPROVED (Draft)');
});

await test('D.4 Custom category request ("Other") workflow & Rejection with mandatory reason visibility', async () => {
  // Provider 2 submits a listing with category="Other" and customCategoryName="Cold Storage Depot"
  const customSub = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider2Token}`,
      'X-Forwarded-For': '203.0.113.31',
    },
    body: {
      businessName: 'Navi Mumbai Cold Chain Godown',
      contactPerson: 'Suresh Patil',
      phone: provider2Phone,
      category: 'Other',
      customCategoryName: 'Cold Storage Depot',
      servicesOffered: 'Temperature Controlled Storage, Blast Freezing',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      businessDescription: 'Temperature-controlled cold storage facility near APMC market.',
      consentToContact: true,
    },
  });
  assert(customSub.status === 201, `Expected 201 for custom category submission, got ${customSub.status}`);
  const app2Id = customSub.body.data.id;

  // Admin tries to approve application BEFORE reviewing custom category request -> 400
  const prematureApprove = await httpRequest(`/api/v1/admin/applications/${app2Id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {},
  });
  assert(
    prematureApprove.status === 400,
    `Expected 400 when approving application with unreviewed "Other" category, got ${prematureApprove.status}`
  );

  // Admin reviews custom category request and approves "Cold Storage Depot" as a new active category
  const reqList = await httpRequest('/api/v1/categories/admin/requests?status=PENDING', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(reqList.status === 200 && reqList.body.data.length === 1, 'Expected 1 pending custom category request');
  const customReqId = reqList.body.data[0]._id;

  const reviewRes = await httpRequest(`/api/v1/categories/admin/requests/${customReqId}/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { action: 'approve', name: 'Cold Storage Depot', notes: 'Approved commercial vertical' },
  });
  assert(reviewRes.status === 200 && reviewRes.body.data.status === 'APPROVED', 'Expected custom category request APPROVED');

  // Test rejecting an application without a reason -> 400
  const rejectNoReason = await httpRequest(`/api/v1/admin/applications/${app2Id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { reason: '   ' },
  });
  assert(rejectNoReason.status === 400, 'Rejecting without reason must return 400');

  // Admin rejects with mandatory reason -> 200, and Provider 2 sees the rejection reason in their dashboard
  const rejectWithReason = await httpRequest(`/api/v1/admin/applications/${app2Id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { reason: 'Please upload a clear exterior photograph of the facility.' },
  });
  assert(rejectWithReason.status === 200, 'Expected 200 when rejecting with reason');

  const p2Dash = await httpRequest('/api/v1/provider-portal/dashboard', {
    headers: { Authorization: `Bearer ${provider2Token}` },
  });
  const rejectedItem = p2Dash.body.data.listings.find((l) => l.applicationId === String(app2Id));
  assert(rejectedItem && rejectedItem.status === 'REJECTED', 'Expected REJECTED status in provider dashboard');
  assert(
    rejectedItem.rejectionReason === 'Please upload a clear exterior photograph of the facility.',
    'Provider must see exact rejection reason in dashboard'
  );
});

await test('D.5 Email OTP brute-force (> 5 attempts) locks out the challenge atomically', async () => {
  const bruteEmail = 'brute-lockout@wareshop.in';
  await httpRequest('/api/v1/provider-auth/otp/send', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.40' },
    body: { email: bruteEmail },
  });
  const realOtp = lastCapturedOtpByEmail.get(bruteEmail);

  // Send 5 wrong OTP attempts
  for (let i = 0; i < 5; i++) {
    const wrongRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.40' },
      body: { email: bruteEmail, otp: '111111' },
    });
    assert(wrongRes.status === 400, `Attempt ${i + 1} should return 400`);
  }

  // 6th attempt even with the REAL OTP must fail because maxAttempts (5) was reached
  const lockedRes = await httpRequest('/api/v1/provider-auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '203.0.113.40' },
    body: { email: bruteEmail, otp: realOtp },
  });
  assert(lockedRes.status === 400, `Expected 6th attempt with real OTP to be rejected after 5 failed attempts, got ${lockedRes.status}`);
});

await test('D.6 Unauthenticated provider and admin requests are rejected with HTTP 401', async () => {
  const unauthListing = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    body: { businessName: 'Unauth Shop' },
  });
  assert(unauthListing.status === 401, `Expected 401 for unauthenticated listing submission, got ${unauthListing.status}`);

  const unauthAdmin = await httpRequest('/api/v1/admin/dashboard');
  assert(unauthAdmin.status === 401, `Expected 401 for unauthenticated admin dashboard, got ${unauthAdmin.status}`);
});

await test('D.7 Invalid category submission (400) and inactive category publish prevention (400)', async () => {
  const badCatSub = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider2Token}` },
    body: {
      businessName: 'Invalid Category Facility',
      contactPerson: 'Suresh Patil',
      phone: provider2Phone,
      category: 'NonExistentVertical',
      servicesOffered: 'Storage',
      city: 'Mumbai',
      businessDescription: 'Testing invalid category rejection on backend.',
      consentToContact: true,
    },
  });
  assert(badCatSub.status === 400, `Expected 400 for nonexistent category, got ${badCatSub.status}`);

  // Deactivate the Warehouse category and verify publishing a Warehouse listing is blocked (400)
  const warehouseCat = Array.from(collections.categories.values()).find((c) => c.slug === 'warehouse');
  await httpRequest(`/api/v1/categories/admin/${warehouseCat._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'INACTIVE' },
  });

  const pubInactiveRes = await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    pubInactiveRes.status === 400,
    `Expected 400 when attempting to publish a listing in an INACTIVE category, got ${pubInactiveRes.status}`
  );

  // Reactivate Warehouse category and publish listing again
  await httpRequest(`/api/v1/categories/admin/${warehouseCat._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'ACTIVE' },
  });
  const pubActiveRes = await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(pubActiveRes.status === 200, 'Expected 200 after reactivating category');
});

await test('D.8 Contact reveal enforces consentToDisplayPhone and per-IP rate limiting (429)', async () => {
  // Disable consentToDisplayPhone via admin update -> contact reveal returns 404
  await httpRequest(`/api/v1/admin/providers/${publishedProviderId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { consentToDisplayPhone: false },
  });

  const noConsentReveal = await httpRequest(`/api/v1/providers/${publishedProviderSlug}/contact`, {
    headers: { 'X-Forwarded-For': '198.51.100.88' },
  });
  assert(noConsentReveal.status === 404, `Expected 404 when consentToDisplayPhone is false, got ${noConsentReveal.status}`);

  // Re-enable consentToDisplayPhone
  await httpRequest(`/api/v1/admin/providers/${publishedProviderId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { consentToDisplayPhone: true },
  });

  // Exhaust 30-request contact reveal rate limit from IP 198.51.100.89
  for (let i = 0; i < 30; i++) {
    const okRes = await httpRequest(`/api/v1/providers/${publishedProviderSlug}/contact`, {
      headers: { 'X-Forwarded-For': '198.51.100.89' },
    });
    assert(okRes.status === 200, `Expected 200 on reveal ${i + 1}, got ${okRes.status}`);
  }
  const limitedRes = await httpRequest(`/api/v1/providers/${publishedProviderSlug}/contact`, {
    headers: { 'X-Forwarded-For': '198.51.100.89' },
  });
  assert(limitedRes.status === 429, `Expected 429 on 31st contact reveal from same IP, got ${limitedRes.status}`);
});

await test('D.9 Missing RESEND_API_KEY or RESEND_FROM_EMAIL fails with 503 and never simulates fake Email OTP success', async () => {
  const { env } = await import('./src/config/env.js');
  const savedEnvKey = process.env.RESEND_API_KEY;
  const savedCfgKey = env.resend?.apiKey;
  const savedEnvFrom = process.env.RESEND_FROM_EMAIL;
  const savedCfgFrom = env.resend?.fromEmail;
  process.env.RESEND_API_KEY = '';
  if (env.resend) env.resend.apiKey = '';
  try {
    const noKeyRes = await httpRequest('/api/v1/provider-auth/otp/send', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.50' },
      body: { email: 'unconfigured@wareshop.in' },
    });
    assert(noKeyRes.status === 503, `Expected 503 when RESEND_API_KEY is missing, got ${noKeyRes.status}`);
    const failedChallenge = Array.from(collections.otpChallenges.values()).find(
      (c) => c.email === 'unconfigured@wareshop.in'
    );
    assert(
      failedChallenge && failedChallenge.deliveryStatus === 'FAILED',
      'Expected OtpChallenge deliveryStatus to be marked FAILED when Resend is unconfigured'
    );

    // Also test missing RESEND_FROM_EMAIL when RESEND_API_KEY is present
    process.env.RESEND_API_KEY = savedEnvKey;
    if (env.resend) env.resend.apiKey = savedCfgKey;
    process.env.RESEND_FROM_EMAIL = '';
    if (env.resend) env.resend.fromEmail = '';

    const noFromRes = await httpRequest('/api/v1/provider-auth/otp/send', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.51' },
      body: { email: 'unconfigured-from@wareshop.in' },
    });
    assert(noFromRes.status === 503, `Expected 503 when RESEND_FROM_EMAIL is missing, got ${noFromRes.status}`);

    // Unauthorized registration without verificationToken -> 403
    const unauthRegRes = await httpRequest('/api/v1/provider-auth/register', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.52' },
      body: { email: 'bypass@wareshop.in' },
    });
    assert(unauthRegRes.status === 403, `Expected 403 for registration without verificationToken, got ${unauthRegRes.status}`);
  } finally {
    process.env.RESEND_API_KEY = savedEnvKey;
    if (env.resend) env.resend.apiKey = savedCfgKey;
    process.env.RESEND_FROM_EMAIL = savedEnvFrom;
    if (env.resend) env.resend.fromEmail = savedCfgFrom;
  }
});

await test('D.10 Cookie-authenticated multipart/form-data mutation without X-Requested-With is blocked (403 CSRF) while legitimate FormData upload succeeds (201)', async () => {
  const validJpeg = createValidJpegWithExif();
  const mpPayload = buildMultipartRequest(
    {
      businessName: 'CSRF Protected Godown Facility',
      contactPerson: 'Suresh Patil',
      phone: provider2Phone,
      category: 'Godown',
      servicesOffered: 'Pallet Storage',
      city: 'Pune',
      state: 'Maharashtra',
      businessDescription: 'Verifying multipart cookie CSRF protection and legitimate FormData upload.',
      consentToContact: 'true',
      consentToDisplayPhone: 'true',
    },
    {
      filename: 'godown.jpg',
      contentType: 'image/jpeg',
      buffer: validJpeg,
    }
  );

  // 1. Cookie-only multipart POST WITHOUT X-Requested-With header -> must return 403 CSRF failure
  const csrfBlockedRes = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    headers: {
      Cookie: `wareshop_provider_session=${provider2Token}`,
      'Content-Type': mpPayload.contentType,
      'X-Forwarded-For': '203.0.113.60',
    },
    rawBuffer: mpPayload.buffer,
  });
  assert(
    csrfBlockedRes.status === 403,
    `Expected 403 CSRF rejection for cookie-only multipart POST without X-Requested-With, got ${csrfBlockedRes.status}`
  );

  // 2. Cookie-only multipart POST WITH X-Requested-With: XMLHttpRequest -> must succeed (201)
  const legitimateUploadRes = await httpRequest('/api/v1/provider-portal/listings', {
    method: 'POST',
    headers: {
      Cookie: `wareshop_provider_session=${provider2Token}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': mpPayload.contentType,
      'X-Forwarded-For': '203.0.113.60',
    },
    rawBuffer: mpPayload.buffer,
  });
  assert(
    legitimateUploadRes.status === 201,
    `Expected 201 for legitimate cookie-authenticated FormData upload with X-Requested-With, got ${legitimateUploadRes.status}`
  );
});

// ---------------------------------------------------------------------------
// PART E: ADMIN CATEGORY IMAGE UPLOAD, CLOUDINARY CLEANUP & PUBLIC DISPLAY
// ---------------------------------------------------------------------------
console.log('\n--- E. Admin Category Image Management & Cloudinary Storage ---');

await test('E.1 Admin creates category with image -> signed Cloudinary upload to wareshop/categories, stored in DB, returned by public API', async () => {
  const savedProvider = process.env.STORAGE_PROVIDER;
  const savedCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const savedApiKey = process.env.CLOUDINARY_API_KEY;
  const savedApiSecret = process.env.CLOUDINARY_API_SECRET;
  const savedCatFolder = process.env.CLOUDINARY_CATEGORY_FOLDER;
  const savedFetch = globalThis.fetch;
  const savedUploadFn = storageService.uploadImage;
  const savedDeleteFn = storageService.deleteImage;

  const cloudinaryCalls = [];
  let uploadCounter = 0;

  process.env.STORAGE_PROVIDER = 'cloudinary';
  process.env.CLOUDINARY_CLOUD_NAME = 'wareshop-test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-api-key-123';
  process.env.CLOUDINARY_API_SECRET = 'test-api-secret-xyz';
  process.env.CLOUDINARY_CATEGORY_FOLDER = 'wareshop/categories';

  storageService.uploadImage = realStorageUploadImage;
  storageService.deleteImage = realStorageDeleteImage;

  globalThis.fetch = async (input, init) => {
    const urlStr = String(input);
    if (urlStr.includes('api.cloudinary.com/v1_1/wareshop-test-cloud/image/upload')) {
      const params = new URLSearchParams(String(init?.body || ''));
      const folder = params.get('folder');
      const signature = params.get('signature');
      const timestamp = params.get('timestamp');
      const fileDataUri = params.get('file') || '';
      uploadCounter += 1;
      const publicId = `${folder}/cat-asset-${uploadCounter}`;
      const secureUrl = `https://res.cloudinary.com/wareshop-test-cloud/image/upload/v${timestamp}/${publicId}.jpg`;
      cloudinaryCalls.push({ action: 'upload', folder, signature, timestamp, fileDataUri, publicId, secureUrl });
      return new Response(
        JSON.stringify({ secure_url: secureUrl, public_id: publicId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (urlStr.includes('api.cloudinary.com/v1_1/wareshop-test-cloud/image/destroy')) {
      const params = new URLSearchParams(String(init?.body || ''));
      const publicId = params.get('public_id');
      const signature = params.get('signature');
      cloudinaryCalls.push({ action: 'destroy', publicId, signature });
      return new Response(
        JSON.stringify({ result: 'ok' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return savedFetch(input, init);
  };

  try {
    const validJpeg = createValidJpegWithExif();
    const mp = buildMultipartRequest(
      {
        name: 'Industrial Shed',
        shortDescription: 'PEB & Manufacturing Sheds',
        description: 'Heavy-duty industrial sheds and manufacturing floors across India.',
        displayOrder: '5',
        status: 'ACTIVE',
      },
      {
        fieldName: 'image',
        filename: 'industrial-shed.jpg',
        contentType: 'image/jpeg',
        buffer: validJpeg,
      }
    );

    const createRes = await httpRequest('/api/v1/categories/admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': mp.contentType,
      },
      rawBuffer: mp.buffer,
    });

    assert(createRes.status === 201, `Expected 201 creating category with image, got ${createRes.status}: ${JSON.stringify(createRes.body)}`);
    assert(cloudinaryCalls.length === 1 && cloudinaryCalls[0].action === 'upload', 'Expected 1 Cloudinary upload call');
    assert(cloudinaryCalls[0].folder === 'wareshop/categories', `Expected Cloudinary folder wareshop/categories, got ${cloudinaryCalls[0].folder}`);
    assert(Boolean(cloudinaryCalls[0].signature), 'Expected signed Cloudinary upload');
    assert(!cloudinaryCalls[0].fileDataUri.includes(Buffer.from('GPS-SECRET-COORDINATES').toString('base64')), 'Expected EXIF stripped before Cloudinary upload');

    const createdCat = createRes.body.data;
    assert(createdCat.imageUrl === cloudinaryCalls[0].secureUrl, 'Category doc must store Cloudinary secure_url');
    assert(createdCat.imagePublicId === cloudinaryCalls[0].publicId, 'Category doc must store Cloudinary public_id');

    // Public Categories API must return the uploaded imageUrl
    const pubCatsRes = await httpRequest('/api/v1/categories');
    assert(pubCatsRes.status === 200, `Expected 200 from public categories API, got ${pubCatsRes.status}`);
    const publicShed = pubCatsRes.body.data.find((c) => c.slug === 'industrial-shed');
    assert(publicShed, 'Newly created active category must appear in public categories API');
    assert(publicShed.imageUrl === createdCat.imageUrl, 'Public categories API must return uploaded imageUrl');

    // E.2: Replace existing category image -> deletes previous asset ONLY after DB save
    const replaceMp = buildMultipartRequest(
      {
        name: 'Industrial Shed',
        shortDescription: 'Updated PEB Sheds',
        description: 'Updated description for industrial sheds.',
        displayOrder: '5',
        status: 'ACTIVE',
      },
      {
        fieldName: 'image',
        filename: 'industrial-shed-v2.jpg',
        contentType: 'image/jpeg',
        buffer: validJpeg,
      }
    );

    const replaceRes = await httpRequest(`/api/v1/categories/admin/${createdCat._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': replaceMp.contentType,
      },
      rawBuffer: replaceMp.buffer,
    });
    assert(replaceRes.status === 200, `Expected 200 replacing category image, got ${replaceRes.status}`);
    assert(replaceRes.body.data.imagePublicId === 'wareshop/categories/cat-asset-2', 'Expected updated imagePublicId');
    assert(
      cloudinaryCalls.some((c) => c.action === 'destroy' && c.publicId === 'wareshop/categories/cat-asset-1'),
      'Expected previous Cloudinary asset to be deleted after successful replacement save'
    );

    // Verify rollback / orphan cleanup if DB save fails during replacement
    const storedCat = collections.categories.get(String(createdCat._id));
    const origSave = storedCat.save;
    storedCat.save = async () => {
      throw new Error('Simulated DB write failure');
    };
    const callsBeforeFailure = cloudinaryCalls.length;
    const failedSaveRes = await httpRequest(`/api/v1/categories/admin/${createdCat._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': replaceMp.contentType,
      },
      rawBuffer: replaceMp.buffer,
    });
    storedCat.save = origSave;
    // Restore fields on in-memory doc mutated prior to failed save
    storedCat.imageUrl = replaceRes.body.data.imageUrl;
    storedCat.imagePublicId = replaceRes.body.data.imagePublicId;

    assert(failedSaveRes.status === 500, `Expected 500 on simulated DB save failure, got ${failedSaveRes.status}`);
    const failureCalls = cloudinaryCalls.slice(callsBeforeFailure);
    assert(
      failureCalls.some((c) => c.action === 'destroy' && c.publicId === 'wareshop/categories/cat-asset-3'),
      'Expected newly uploaded orphan asset to be cleaned up when DB save fails'
    );
    assert(
      !failureCalls.some((c) => c.action === 'destroy' && c.publicId === 'wareshop/categories/cat-asset-2'),
      'Previous active asset must NOT be deleted when DB save fails'
    );

    // E.3: Remove image -> clears imageUrl & imagePublicId and deletes Cloudinary asset
    const removeRes = await httpRequest(`/api/v1/categories/admin/${createdCat._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { removeImage: true },
    });
    assert(removeRes.status === 200, `Expected 200 when removing category image, got ${removeRes.status}`);
    assert(removeRes.body.data.imageUrl === '', 'Expected imageUrl cleared after removal');
    assert(removeRes.body.data.imagePublicId === '', 'Expected imagePublicId cleared after removal');
    assert(
      cloudinaryCalls.some((c) => c.action === 'destroy' && c.publicId === 'wareshop/categories/cat-asset-2'),
      'Expected Cloudinary asset cleanup on image removal'
    );

    // Existing category without image can be created, edited, deactivated, and reactivated
    const noImgCreate = await httpRequest('/api/v1/categories/admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Logistics Yard',
        shortDescription: 'Open Yard & Container Storage',
        description: 'Open logistics yards for container parking and heavy machinery.',
        displayOrder: 6,
        status: 'ACTIVE',
      },
    });
    assert(noImgCreate.status === 201, `Expected 201 creating category without image, got ${noImgCreate.status}`);
    assert(noImgCreate.body.data.imageUrl === '', 'Category created without image should have empty imageUrl');

    const deactivateRes = await httpRequest(`/api/v1/categories/admin/${noImgCreate.body.data._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'INACTIVE' },
    });
    assert(deactivateRes.status === 200 && deactivateRes.body.data.status === 'INACTIVE', 'Category deactivation must continue working');

    const activateRes = await httpRequest(`/api/v1/categories/admin/${noImgCreate.body.data._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'ACTIVE' },
    });
    assert(activateRes.status === 200 && activateRes.body.data.status === 'ACTIVE', 'Category activation must continue working');

    // E.4: Validation & authorization checks (must not call Cloudinary)
    const callsBeforeValidationTests = cloudinaryCalls.length;

    // 4a. Unauthenticated user rejected (401)
    const unauthUpload = await httpRequest('/api/v1/categories/admin', {
      method: 'POST',
      headers: { 'Content-Type': mp.contentType },
      rawBuffer: mp.buffer,
    });
    assert(unauthUpload.status === 401, `Expected 401 for unauthenticated category image upload, got ${unauthUpload.status}`);

    // 4b. Provider token (non-admin) rejected (401)
    const providerUpload = await httpRequest(`/api/v1/categories/admin/${createdCat._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${provider1Token}`,
        'Content-Type': replaceMp.contentType,
      },
      rawBuffer: replaceMp.buffer,
    });
    assert(providerUpload.status === 401, `Expected 401 for non-admin provider token on category update, got ${providerUpload.status}`);

    // 4c. Disguised non-image (SVG with image/jpeg MIME) rejected (400)
    const fakeMp = buildMultipartRequest(
      { name: 'Disguised Image Cat', status: 'ACTIVE' },
      {
        fieldName: 'image',
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
        buffer: Buffer.from('<svg onload="alert(1)"></svg>', 'utf8'),
      }
    );
    const fakeImgRes = await httpRequest('/api/v1/categories/admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': fakeMp.contentType,
      },
      rawBuffer: fakeMp.buffer,
    });
    assert(fakeImgRes.status === 400, `Expected 400 for disguised non-image category upload, got ${fakeImgRes.status}`);

    // 4d. Unsupported MIME type (image/gif) rejected (400)
    const gifMp = buildMultipartRequest(
      { name: 'Gif Cat', status: 'ACTIVE' },
      {
        fieldName: 'image',
        filename: 'anim.gif',
        contentType: 'image/gif',
        buffer: Buffer.from('GIF89a1234567890', 'ascii'),
      }
    );
    const gifRes = await httpRequest('/api/v1/categories/admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': gifMp.contentType,
      },
      rawBuffer: gifMp.buffer,
    });
    assert(gifRes.status === 400, `Expected 400 for unsupported GIF MIME type, got ${gifRes.status}`);

    // 4e. Duplicate category name rejected (409) BEFORE uploading to Cloudinary
    const dupMp = buildMultipartRequest(
      { name: 'Industrial Shed', status: 'ACTIVE' },
      {
        fieldName: 'image',
        filename: 'dup.jpg',
        contentType: 'image/jpeg',
        buffer: validJpeg,
      }
    );
    const dupRes = await httpRequest('/api/v1/categories/admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': dupMp.contentType,
      },
      rawBuffer: dupMp.buffer,
    });
    assert(dupRes.status === 409, `Expected 409 for duplicate category name, got ${dupRes.status}`);

    // 4f. Oversized file (>5MB) rejected (400)
    const hugeMp = buildMultipartRequest(
      { name: 'Huge Image Cat', status: 'ACTIVE' },
      {
        fieldName: 'image',
        filename: 'huge.jpg',
        contentType: 'image/jpeg',
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1024, 0xff),
      }
    );
    const hugeRes = await httpRequest('/api/v1/categories/admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': hugeMp.contentType,
      },
      rawBuffer: hugeMp.buffer,
    });
    assert(hugeRes.status === 400, `Expected 400 for >5MB category image, got ${hugeRes.status}`);

    assert(
      cloudinaryCalls.length === callsBeforeValidationTests,
      `Expected zero Cloudinary calls on rejected/unauthorized uploads, got ${cloudinaryCalls.length - callsBeforeValidationTests}`
    );
  } finally {
    process.env.STORAGE_PROVIDER = savedProvider;
    process.env.CLOUDINARY_CLOUD_NAME = savedCloudName;
    process.env.CLOUDINARY_API_KEY = savedApiKey;
    process.env.CLOUDINARY_API_SECRET = savedApiSecret;
    process.env.CLOUDINARY_CATEGORY_FOLDER = savedCatFolder;
    globalThis.fetch = savedFetch;
    storageService.uploadImage = savedUploadFn;
    storageService.deleteImage = savedDeleteFn;
  }
});

// ---------------------------------------------------------------------------
// PART F: GOOGLE OAUTH 2.0 AUTHENTICATION, ACCOUNT LINKING & WARERENT EMAIL BRANDING
// ---------------------------------------------------------------------------
console.log('\n--- F. Google OAuth 2.0 Authentication, Account Linking & WARERENT Email Branding ---');

const TEST_GOOGLE_CLIENT_ID = '1234567890-warerenttest.apps.googleusercontent.com';
const SAMPLE_JWT_FORMAT_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl';

async function requestServerGoogleNonce(suiteKey = 'google-nonce-helper') {
  const res = await httpRequest('/api/v1/provider-auth/google/nonce', {
    method: 'POST',
    headers: { 'x-wareshop-test-suite': suiteKey },
    body: {},
  });
  assert(
    res.status === 200 && res.body?.data?.nonce && res.body?.data?.attemptToken,
    `Expected 200 from /provider-auth/google/nonce, got ${res.status}`
  );
  return res.body.data;
}

await test('F.1 Provider OTP email templates use WARERENT branding in subject, HTML, and plain text', async () => {
  assert(
    OTP_EMAIL_SUBJECT === 'Your WARERENT Verification Code',
    `Expected WARERENT email subject, got "${OTP_EMAIL_SUBJECT}"`
  );

  const html = buildOtpEmailHtml({ otp: '654321', expiresInMinutes: 5 });
  const text = buildOtpEmailText({ otp: '654321', expiresInMinutes: 5 });

  assert(
    html.includes('WARERENT Provider Portal Verification') &&
      html.includes('WARERENT provider account') &&
      html.includes('654321'),
    'HTML OTP template must contain WARERENT Provider Portal Verification and WARERENT provider account'
  );
  assert(
    text.includes('WARERENT Provider Portal Verification') &&
      text.includes('WARERENT provider account') &&
      text.includes('654321'),
    'Plain-text OTP template must contain WARERENT Provider Portal Verification and WARERENT provider account'
  );
  assert(
    !/wareshop/i.test(html) && !/wareshop/i.test(text) && !/wareshop/i.test(OTP_EMAIL_SUBJECT),
    'OTP email templates must not contain legacy WARESHOP branding'
  );

  assert(
    lastOutboundPayload &&
      lastOutboundPayload.subject === 'Your WARERENT Verification Code' &&
      !/wareshop/i.test(lastOutboundPayload.html) &&
      !/wareshop/i.test(lastOutboundPayload.text),
    'Actual dispatched Resend payload must use WARERENT branding'
  );
});

await test('F.2 Missing GOOGLE_CLIENT_ID fails closed (503) on nonce & auth endpoints without breaking Email OTP', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = '';
  try {
    const nonceRes = await httpRequest('/api/v1/provider-auth/google/nonce', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-unconfigured-nonce' },
      body: {},
    });
    assert(nonceRes.status === 503, `Expected 503 on /google/nonce when GOOGLE_CLIENT_ID is unset, got ${nonceRes.status}`);

    const res = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-unconfigured' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: 'a'.repeat(64),
        attemptToken: 'b'.repeat(64),
      },
    });
    assert(res.status === 503, `Expected 503 when GOOGLE_CLIENT_ID is unset, got ${res.status}`);
  } finally {
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await test('F.3 Invalid, malformed, wrong-audience, wrong-issuer, expired, missing-nonce, and mismatched-nonce Google tokens are rejected', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  try {
    const n0 = await requestServerGoogleNonce('google-invalid-nonce-0');

    // 1. Missing nonce or attemptToken -> 400
    const missingNonceRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-0' },
      body: { idToken: SAMPLE_JWT_FORMAT_TOKEN },
    });
    assert(missingNonceRes.status === 400, `Expected 400 when nonce is missing, got ${missingNonceRes.status}`);

    // 2. Malformed non-JWT token -> 400
    const badFormatRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-1' },
      body: { idToken: 'not-a-valid-jwt', nonce: n0.nonce, attemptToken: n0.attemptToken },
    });
    assert(badFormatRes.status === 400, `Expected 400 for malformed token, got ${badFormatRes.status}`);

    // 3. Real google-auth-library OAuth2Client rejects forged/unsigned JWT -> 401
    const forgedRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-2' },
      body: { idToken: SAMPLE_JWT_FORMAT_TOKEN, nonce: n0.nonce, attemptToken: n0.attemptToken },
    });
    assert(forgedRes.status === 401, `Expected 401 from OAuth2Client on forged JWT, got ${forgedRes.status}`);

    // 4. Wrong audience -> 401
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: '9999999999-wrongaud.apps.googleusercontent.com',
      sub: 'google-sub-wrong-aud',
      email: 'wrongaud@warerent.in',
      email_verified: true,
      nonce: n0.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const wrongAudRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-3' },
      body: { idToken: SAMPLE_JWT_FORMAT_TOKEN, nonce: n0.nonce, attemptToken: n0.attemptToken },
    });
    assert(wrongAudRes.status === 401, `Expected 401 for wrong audience, got ${wrongAudRes.status}`);

    // 5. Wrong issuer -> 401
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://evil-issuer.example.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-wrong-iss',
      email: 'wrongiss@warerent.in',
      email_verified: true,
      nonce: n0.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const wrongIssRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-4' },
      body: { idToken: SAMPLE_JWT_FORMAT_TOKEN, nonce: n0.nonce, attemptToken: n0.attemptToken },
    });
    assert(wrongIssRes.status === 401, `Expected 401 for wrong issuer, got ${wrongIssRes.status}`);

    // 6. Expired token -> 401
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-expired',
      email: 'expired@warerent.in',
      email_verified: true,
      nonce: n0.nonce,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const expiredRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-5' },
      body: { idToken: SAMPLE_JWT_FORMAT_TOKEN, nonce: n0.nonce, attemptToken: n0.attemptToken },
    });
    assert(expiredRes.status === 401, `Expected 401 for expired Google token, got ${expiredRes.status}`);

    // 7. Nonce mismatch between token claim and supplied nonce -> 401
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-nonce',
      email: 'nonce@warerent.in',
      email_verified: true,
      nonce: 'c'.repeat(64),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const badNonceRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-6' },
      body: { idToken: SAMPLE_JWT_FORMAT_TOKEN, nonce: n0.nonce, attemptToken: n0.attemptToken },
    });
    assert(badNonceRes.status === 401, `Expected 401 for mismatched OAuth nonce, got ${badNonceRes.status}`);

    // 8. Forged client-generated nonce (never issued by server) -> 401
    const forgedClientNonce = 'd'.repeat(64);
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-forged-nonce',
      email: 'forgednonce@warerent.in',
      email_verified: true,
      nonce: forgedClientNonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const unissuedNonceRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-invalid-7' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: forgedClientNonce,
        attemptToken: 'e'.repeat(64),
      },
    });
    assert(unissuedNonceRes.status === 401, `Expected 401 for unissued client-forged nonce, got ${unissuedNonceRes.status}`);
  } finally {
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await test('F.4 Unverified Google email claim (email_verified !== true) is rejected with HTTP 403', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  try {
    const issued = await requestServerGoogleNonce('google-unverified-nonce');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-unverified-email',
      email: 'unverified.google@warerent.in',
      email_verified: false,
      name: 'Unverified User',
      nonce: issued.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const res = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-unverified-email' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: issued.nonce,
        attemptToken: issued.attemptToken,
      },
    });
    assert(res.status === 403, `Expected 403 for unverified Google email, got ${res.status}`);

    const count = await ProviderAccount.countDocuments({ email: 'unverified.google@warerent.in' });
    assert(count === 0, 'Unverified Google email must never create a ProviderAccount');
  } finally {
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await test('F.5 Successful Google Sign-In creates provider account, issues session, ignores spoofed body fields, and never marks phoneVerified', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  try {
    const issued = await requestServerGoogleNonce('google-success-nonce');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-new-provider-1001',
      email: 'google.owner@warerent.in',
      email_verified: true,
      name: 'Anita Desai',
      nonce: issued.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const loginRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-success-new' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: issued.nonce,
        attemptToken: issued.attemptToken,
        phone: '9820777888',
        // Attempt to spoof email, phoneVerified, and role in request body (must be ignored)
        email: 'attacker@spoofed.com',
        phoneVerified: true,
        role: 'SUPER_ADMIN',
      },
    });

    assert(loginRes.status === 201, `Expected 201 for new Google provider, got ${loginRes.status}`);
    const data = loginRes.body?.data;
    assert(data?.isNewAccount === true, 'Expected isNewAccount=true');
    assert(data?.email === 'google.owner@warerent.in', 'Must use verified Google token email, never req.body.email');
    assert(data?.emailVerified === true, 'Expected emailVerified=true');
    assert(data?.phone === '9820777888', 'Expected optional valid phone to be saved');
    assert(data?.phoneVerified === false, 'Google Sign-In must NEVER mark phoneVerified=true');
    assert(data?.googleLinked === true && data?.authProvider === 'GOOGLE', 'Expected googleLinked=true and authProvider=GOOGLE');
    assert(data?.token && /^[a-f0-9]{64}$/i.test(data.token), 'Expected 64-char hex session token');

    const rawCookies = loginRes.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(rawCookies) ? rawCookies.join('; ') : String(rawCookies);
    assert(
      cookieStr.includes('wareshop_provider_session=') && /httponly/i.test(cookieStr),
      'Expected HttpOnly wareshop_provider_session cookie to be set'
    );

    // Verify immediate access to /me and /provider-portal/dashboard without needing Email OTP
    const meRes = await httpRequest('/api/v1/provider-auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${data.token}` },
    });
    assert(meRes.status === 200 && meRes.body?.data?.email === 'google.owner@warerent.in', 'Expected /me to succeed with Google session');

    const dashRes = await httpRequest('/api/v1/provider-portal/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${data.token}` },
    });
    assert(dashRes.status === 200 && dashRes.body?.data?.account?.email === 'google.owner@warerent.in', 'Expected /provider-portal/dashboard to succeed with Google session');
  } finally {
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await test('F.6 Safe account linking & duplicate account prevention for existing Email-OTP provider', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  try {
    const beforeCount = await ProviderAccount.countDocuments({ email: provider2Email });
    assert(beforeCount === 1, 'Expected existing Email-OTP provider2 account to exist');
    const existingBefore = await ProviderAccount.findOne({ email: provider2Email }).lean();

    const issuedLink = await requestServerGoogleNonce('google-link-nonce-1');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-provider2-link',
      email: provider2Email.toUpperCase(),
      email_verified: true,
      name: 'Overwritten Name Should Not Apply',
      nonce: issuedLink.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const linkRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-account-link' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: issuedLink.nonce,
        attemptToken: issuedLink.attemptToken,
      },
    });

    assert(linkRes.status === 200, `Expected 200 on linking existing account, got ${linkRes.status}`);
    const data = linkRes.body?.data;
    assert(data?.isNewAccount === false, 'Expected isNewAccount=false when linking existing account');
    assert(data?.accountLinked === true, 'Expected accountLinked=true on first Google link');
    assert(data?.googleLinked === true && data?.authProvider === 'BOTH', 'Expected authProvider=BOTH after linking Google to Email-OTP account');
    assert(
      String(data?.id) === String(existingBefore._id),
      'Linked session must resolve to the exact same ProviderAccount ID'
    );
    assert(
      data?.name === existingBefore.name && data?.phone === existingBefore.phone,
      'Account linking must NOT overwrite existing provider name or phone'
    );
    assert(data?.phoneVerified === false, 'Account linking must keep phoneVerified=false');

    const afterCount = await ProviderAccount.countDocuments({ email: provider2Email });
    assert(afterCount === 1, 'Account linking must never create duplicate ProviderAccount records');

    // Attempting to authenticate the same email with a DIFFERENT Google sub must be rejected (409)
    const issuedConflict = await requestServerGoogleNonce('google-link-nonce-2');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-different-impostor',
      email: provider2Email,
      email_verified: true,
      name: 'Impostor',
      nonce: issuedConflict.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const conflictRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-account-conflict' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: issuedConflict.nonce,
        attemptToken: issuedConflict.attemptToken,
      },
    });
    assert(conflictRes.status === 409, `Expected 409 when different Google sub claims already-linked email, got ${conflictRes.status}`);
  } finally {
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await test('F.7 Suspended provider account restrictions are preserved when signing in with Google', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  try {
    // Suspend provider1 via admin endpoint first (since D.3 reactivated provider1 at the end of D.3)
    const preSuspRes = await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Compliance hold for Google auth restriction test.' },
    });
    assert(preSuspRes.status === 200, `Expected 200 on admin suspend, got ${preSuspRes.status}`);

    const issuedSusp = await requestServerGoogleNonce('google-susp-nonce');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-suspended-provider1',
      email: provider1Email,
      email_verified: true,
      name: 'Rajesh Logistics',
      nonce: issuedSusp.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const suspLoginRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-suspended-check' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: issuedSusp.nonce,
        attemptToken: issuedSusp.attemptToken,
        status: 'ACTIVE',
      },
    });

    assert(suspLoginRes.status === 200, `Expected 200 on suspended account login, got ${suspLoginRes.status}`);
    assert(
      suspLoginRes.body?.data?.status === 'SUSPENDED',
      'Google Sign-In must preserve SUSPENDED account status and never reset it to ACTIVE'
    );
    const suspToken = suspLoginRes.body?.data?.token;

    // Attempting to submit a listing while suspended must still be rejected with 403
    const blockedSubmit = await httpRequest('/api/v1/leads/partner', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${suspToken}`,
        'x-wareshop-test-suite': 'google-suspended-submit',
      },
      body: {
        businessName: 'Suspended Bypass Attempt Warehouse',
        contactPerson: 'Rajesh Sharma',
        phone: provider1Phone,
        email: provider1Email,
        category: 'Warehouse',
        servicesOffered: 'Cold storage, loading dock',
        city: 'Mumbai',
        businessDescription: 'Attempting to submit a listing while suspended via Google login.',
        consentToContact: true,
      },
    });
    assert(
      blockedSubmit.status === 403,
      `Suspended provider authenticated via Google must be blocked (403) from submitting listings, got ${blockedSubmit.status}`
    );

    // Attempting to mutate profile while suspended must also be rejected with 403
    const blockedProfile = await httpRequest('/api/v1/provider-auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${suspToken}`,
        'x-wareshop-test-suite': 'google-suspended-profile',
      },
      body: { name: 'Bypass Profile Edit' },
    });
    assert(
      blockedProfile.status === 403,
      `Suspended provider must be blocked (403) from mutating profile, got ${blockedProfile.status}`
    );
  } finally {
    await httpRequest(`/api/v1/admin/providers/${publishedProviderId}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).catch(() => {});
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await test('F.8 Expired nonce, sequential replay, and concurrent replay attacks on Google Sign-In are blocked', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  try {
    // 1. Expired server-issued nonce -> 401
    const expiredIssued = await requestServerGoogleNonce('google-exp-nonce');
    const expNonceHash = crypto.createHash('sha256').update(expiredIssued.nonce).digest('hex');
    await GoogleAuthNonce.updateOne(
      { nonceHash: expNonceHash },
      { $set: { expiresAt: new Date(Date.now() - 5_000) } }
    );

    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-new-provider-1001',
      email: 'google.owner@warerent.in',
      email_verified: true,
      name: 'Anita Desai',
      nonce: expiredIssued.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const expNonceRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-exp-nonce-auth' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: expiredIssued.nonce,
        attemptToken: expiredIssued.attemptToken,
      },
    });
    assert(expNonceRes.status === 401, `Expected 401 for expired server nonce, got ${expNonceRes.status}`);

    // 2. Concurrent replay attack (5 simultaneous requests with the same valid nonce + attemptToken)
    const raceIssued = await requestServerGoogleNonce('google-race-nonce');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-new-provider-1001',
      email: 'google.owner@warerent.in',
      email_verified: true,
      name: 'Anita Desai',
      nonce: raceIssued.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const concurrentResponses = await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        httpRequest('/api/v1/provider-auth/google', {
          method: 'POST',
          headers: { 'x-wareshop-test-suite': `google-race-${i}` },
          body: {
            idToken: SAMPLE_JWT_FORMAT_TOKEN,
            nonce: raceIssued.nonce,
            attemptToken: raceIssued.attemptToken,
          },
        })
      )
    );

    const successResponses = concurrentResponses.filter((r) => r.status === 200);
    const rejectedResponses = concurrentResponses.filter((r) => r.status === 401);
    assert(
      successResponses.length === 1 && rejectedResponses.length === 4,
      `Expected strictly 1 success (200) and 4 replay rejections (401) in concurrent replay test, got ${successResponses.length} successes and ${rejectedResponses.length} 401s`
    );

    // 3. Sequential replay of the already-consumed nonce -> 401
    const seqReplayRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-seq-replay' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: raceIssued.nonce,
        attemptToken: raceIssued.attemptToken,
      },
    });
    assert(seqReplayRes.status === 401, `Expected 401 on sequential replay of consumed nonce, got ${seqReplayRes.status}`);
  } finally {
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await test('F.9 Provider session rotation, expiration, logout invalidation, login-CSRF protection, and Admin isolation', async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  try {
    // 1. Cross-site HTML form login-CSRF attempt (application/x-www-form-urlencoded) -> 403
    const formCsrfRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-wareshop-test-suite': 'google-login-csrf',
      },
      rawBuffer: Buffer.from('idToken=abc&nonce=def&attemptToken=ghi', 'utf8'),
    });
    assert(formCsrfRes.status === 403, `Expected 403 on form-urlencoded login CSRF attempt, got ${formCsrfRes.status}`);

    // 1b. Non-JSON Content-Type on auth endpoint -> 403
    const nonJsonCsrfRes = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-wareshop-test-suite': 'google-nonjson-csrf',
      },
      rawBuffer: Buffer.from('{"idToken":"abc"}', 'utf8'),
    });
    assert(nonJsonCsrfRes.status === 403, `Expected 403 on non-JSON Content-Type auth attempt, got ${nonJsonCsrfRes.status}`);

    // 1c. Untrusted Referer origin on auth endpoint (when Origin is stripped) -> 403
    const untrustedRefAuthRes = await httpRequest('/api/v1/provider-auth/google/nonce', {
      method: 'POST',
      headers: {
        Referer: 'https://evil-attacker.example.com/csrf.html',
        'x-wareshop-test-suite': 'google-referer-csrf',
      },
      body: {},
    });
    assert(
      untrustedRefAuthRes.status === 403,
      `Expected 403 on untrusted Referer origin for auth endpoint, got ${untrustedRefAuthRes.status}`
    );

    // 2. First login issues sessionToken1; second login rotates sessionTokenHash and invalidates sessionToken1
    const issued1 = await requestServerGoogleNonce('google-sess-1');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-new-provider-1001',
      email: 'google.owner@warerent.in',
      email_verified: true,
      name: 'Anita Desai',
      nonce: issued1.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const login1 = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-sess-login-1' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: issued1.nonce,
        attemptToken: issued1.attemptToken,
      },
    });
    const token1 = login1.body?.data?.token;
    assert(token1, 'Expected session token from first login');

    const issued2 = await requestServerGoogleNonce('google-sess-2');
    googleAuthService._verifyWithOAuthClient = async () => ({
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      sub: 'google-sub-new-provider-1001',
      email: 'google.owner@warerent.in',
      email_verified: true,
      name: 'Anita Desai',
      nonce: issued2.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const login2 = await httpRequest('/api/v1/provider-auth/google', {
      method: 'POST',
      headers: { 'x-wareshop-test-suite': 'google-sess-login-2' },
      body: {
        idToken: SAMPLE_JWT_FORMAT_TOKEN,
        nonce: issued2.nonce,
        attemptToken: issued2.attemptToken,
      },
    });
    const token2 = login2.body?.data?.token;
    assert(token2 && token2 !== token1, 'Expected new rotated session token on second login');

    // Old session token (token1) must now be rejected (401)
    const oldTokenMe = await httpRequest('/api/v1/provider-auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(oldTokenMe.status === 401, `Expected 401 when reusing superseded session token, got ${oldTokenMe.status}`);

    // 3. Admin security isolation: provider session token (even if Google email matches admin email) cannot access /api/v1/admin/*
    const adminAccessAttempt = await httpRequest('/api/v1/admin/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(
      adminAccessAttempt.status === 401,
      `Provider session token must be rejected (401) on admin endpoints, got ${adminAccessAttempt.status}`
    );

    // 3b. Cookie-authenticated state-changing request from untrusted Referer origin is rejected (403 CSRF)
    const cookieRefererCsrf = await httpRequest('/api/v1/provider-auth/profile', {
      method: 'PUT',
      headers: {
        Cookie: `wareshop_provider_session=${token2}`,
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://evil-attacker.example.com/exploit',
      },
      body: { name: 'Cross-Site Cookie Mutation' },
    });
    assert(
      cookieRefererCsrf.status === 403,
      `Expected 403 on cookie-authenticated mutation with untrusted Referer origin, got ${cookieRefererCsrf.status}`
    );

    // 4. Logout invalidates token2 immediately
    const logoutRes = await httpRequest('/api/v1/provider-auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {},
    });
    assert(logoutRes.status === 200, `Expected 200 on provider logout, got ${logoutRes.status}`);

    const afterLogoutMe = await httpRequest('/api/v1/provider-auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(afterLogoutMe.status === 401, `Expected 401 after logout invalidates session, got ${afterLogoutMe.status}`);

    // 5. Security headers: Cross-Origin-Opener-Policy must be same-origin-allow-popups (not same-origin) and CSP must permit GIS
    const coopHeader = String(login2.headers['cross-origin-opener-policy'] || '');
    const cspHeader = String(login2.headers['content-security-policy'] || '');
    assert(
      coopHeader === 'same-origin-allow-popups',
      `Expected Cross-Origin-Opener-Policy: same-origin-allow-popups, got "${coopHeader}"`
    );
    assert(
      cspHeader.includes('https://accounts.google.com/gsi/client') &&
        cspHeader.includes('https://accounts.google.com/gsi/'),
      `Expected Content-Security-Policy to permit Google Identity Services, got "${cspHeader}"`
    );

    // 6. Quoted GOOGLE_CLIENT_ID (e.g. pasted with quotes in Render/Vercel dashboard) is normalized cleanly
    process.env.GOOGLE_CLIENT_ID = `"${TEST_GOOGLE_CLIENT_ID}"`;
    const quotedNonce = await requestServerGoogleNonce('google-quoted-client-id');
    assert(Boolean(quotedNonce?.nonce), 'Expected quoted GOOGLE_CLIENT_ID to be normalized and accepted');
  } finally {
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }
});

await new Promise((resolve) => server.close(resolve));
globalThis.fetch = realFetch;

console.log('\n================================================================');
console.log(` SUMMARY: ${passed} passed, ${failed} failed (Total: ${passed + failed})`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
