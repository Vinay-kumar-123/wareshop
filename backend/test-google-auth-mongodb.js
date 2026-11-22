import 'dotenv/config';
import http from 'http';
import crypto from 'crypto';
import mongoose from 'mongoose';
import app from './src/app.js';
import ProviderAccount, { inspectProviderAccountIndexes } from './src/models/ProviderAccount.js';
import GoogleAuthNonce from './src/models/GoogleAuthNonce.js';
import googleAuthService from './src/services/googleAuthService.js';

const TEST_GOOGLE_CLIENT_ID = '999888777666-testclient123.apps.googleusercontent.com';
const SAMPLE_JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.sig';
const ISOLATED_DB_NAME = `ws_gtest_${Date.now().toString(36)}`;

let server;
let baseUrl;
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

async function httpRequest(path, { method = 'GET', headers = {}, body = undefined } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Origin: 'http://localhost:5173',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, headers: res.headers, body: json };
}

async function issueNonce(suite) {
  const res = await httpRequest('/api/v1/provider-auth/google/nonce', {
    method: 'POST',
    headers: { 'x-wareshop-test-suite': suite },
    body: {},
  });
  assert(res.status === 200 && res.body?.data?.nonce && res.body?.data?.attemptToken, 'Failed to issue nonce');
  return res.body.data;
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required to run isolated MongoDB integration tests.');
    process.exit(1);
  }

  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedVerifyDelegate = googleAuthService._verifyWithOAuthClient;
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: ISOLATED_DB_NAME,
    serverSelectionTimeoutMS: 5000,
  });

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;

  console.log(`\nRunning isolated MongoDB Google Auth integration tests on DB: ${ISOLATED_DB_NAME}\n`);

  try {
    // Ensure fresh partial indexes
    await ProviderAccount.syncIndexes();
    await GoogleAuthNonce.syncIndexes();

    await test('1. Legacy non-partial phone_1 index is detected by inspectProviderAccountIndexes and causes E11000 before reconciliation', async () => {
      // Simulate legacy non-partial phone_1 index
      await ProviderAccount.collection.dropIndex('phone_1');
      await ProviderAccount.collection.createIndex({ phone: 1 }, { unique: true, name: 'phone_1' });

      const reportBefore = await inspectProviderAccountIndexes();
      assert(!reportBefore.ok && reportBefore.issues.some((i) => i.index === 'phone_1'), 'Expected phone_1 mismatch to be detected');

      // First Google user without phone succeeds
      const n1 = await issueNonce('legacy-idx-1');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-legacy-1',
        email: 'legacy1@gmail.com',
        email_verified: true,
        name: 'Legacy One',
        nonce: n1.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const r1 = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'legacy-idx-1' },
        body: { idToken: SAMPLE_JWT, nonce: n1.nonce, attemptToken: n1.attemptToken },
      });
      assert(r1.status === 201, `Expected 201 for first user, got ${r1.status}`);

      // Second Google user without phone hits legacy phone_1: null -> safely returns 503 DB_INDEX_CONFLICT instead of misleading 409 Account Conflict
      const n2 = await issueNonce('legacy-idx-2');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-legacy-2',
        email: 'legacy2@gmail.com',
        email_verified: true,
        name: 'Legacy Two',
        nonce: n2.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const r2 = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'legacy-idx-2' },
        body: { idToken: SAMPLE_JWT, nonce: n2.nonce, attemptToken: n2.attemptToken },
      });
      assert(
        r2.status === 503 && r2.body?.code === 'GOOGLE_AUTH_TEMPORARILY_UNAVAILABLE',
        `Expected 503 GOOGLE_AUTH_TEMPORARILY_UNAVAILABLE on legacy index, got ${r2.status} ${JSON.stringify(r2.body)}`
      );

      // Reconcile index
      await ProviderAccount.collection.dropIndex('phone_1');
      await ProviderAccount.syncIndexes();
      const reportAfter = await inspectProviderAccountIndexes();
      assert(reportAfter.ok, 'Expected inspectProviderAccountIndexes to pass after reconciliation');

      // Now second Google user without phone succeeds!
      const n3 = await issueNonce('legacy-idx-3');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-legacy-2',
        email: 'legacy2@gmail.com',
        email_verified: true,
        name: 'Legacy Two',
        nonce: n3.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const r3 = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'legacy-idx-3' },
        body: { idToken: SAMPLE_JWT, nonce: n3.nonce, attemptToken: n3.attemptToken },
      });
      assert(r3.status === 201, `Expected 201 after index reconciliation, got ${r3.status}`);
    });

    await test('2. Returning Google provider resolves to exact same account without duplicates', async () => {
      const n = await issueNonce('returning-google');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-legacy-1',
        email: 'legacy1@gmail.com',
        email_verified: true,
        name: 'Legacy One',
        nonce: n.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const res = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'returning-google' },
        body: { idToken: SAMPLE_JWT, nonce: n.nonce, attemptToken: n.attemptToken },
      });
      assert(res.status === 200 && res.body?.data?.isNewAccount === false, 'Expected 200 returning user');
      assert((await ProviderAccount.countDocuments({ googleId: 'sub-legacy-1' })) === 1, 'No duplicate allowed');
    });

    await test('3. Concurrent Google sign-in requests for the same new user resolve idempotently without E11000 or duplicates', async () => {
      const [nA, nB] = await Promise.all([issueNonce('conc-a'), issueNonce('conc-b')]);
      googleAuthService._verifyWithOAuthClient = async ({ idToken }) => {
        const nonce = idToken.endsWith('A') ? nA.nonce : nB.nonce;
        return {
          iss: 'https://accounts.google.com',
          aud: TEST_GOOGLE_CLIENT_ID,
          sub: 'sub-concurrent-user',
          email: 'concurrent@gmail.com',
          email_verified: true,
          name: 'Concurrent User',
          nonce,
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
      };

      const [resA, resB] = await Promise.all([
        httpRequest('/api/v1/provider-auth/google', {
          method: 'POST',
          headers: { 'x-wareshop-test-suite': 'conc-a' },
          body: { idToken: `${SAMPLE_JWT}A`, nonce: nA.nonce, attemptToken: nA.attemptToken },
        }),
        httpRequest('/api/v1/provider-auth/google', {
          method: 'POST',
          headers: { 'x-wareshop-test-suite': 'conc-b' },
          body: { idToken: `${SAMPLE_JWT}B`, nonce: nB.nonce, attemptToken: nB.attemptToken },
        }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      assert(
        (statuses[0] === 200 && statuses[1] === 201) || (statuses[0] === 200 && statuses[1] === 200),
        `Expected concurrent requests to succeed cleanly (200/201), got ${statuses.join(',')}`
      );
      const count = await ProviderAccount.countDocuments({ googleId: 'sub-concurrent-user' });
      assert(count === 1, `Expected exactly 1 account after concurrent requests, got ${count}`);
    });

    await test('4. Existing Email-OTP account links Google sub atomically; conflicting sub is rejected with 409', async () => {
      const existing = await ProviderAccount.create({
        email: 'otp.user@gmail.com',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        phone: '9876500001',
        phoneVerified: false,
        authProvider: 'EMAIL_OTP',
        name: 'OTP User',
        status: 'ACTIVE',
      });

      const n1 = await issueNonce('link-otp-1');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-otp-linked',
        email: 'otp.user@gmail.com',
        email_verified: true,
        name: 'Google Name',
        nonce: n1.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const linkRes = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'link-otp-1' },
        body: { idToken: SAMPLE_JWT, nonce: n1.nonce, attemptToken: n1.attemptToken },
      });
      assert(
        linkRes.status === 200 &&
          linkRes.body?.data?.id === String(existing._id) &&
          linkRes.body?.data?.accountLinked === true &&
          linkRes.body?.data?.authProvider === 'BOTH' &&
          linkRes.body?.data?.phoneVerified === false,
        `Unexpected link response: ${JSON.stringify(linkRes.body)}`
      );

      // Conflicting sub for same email
      const n2 = await issueNonce('link-otp-conflict');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-impostor',
        email: 'otp.user@gmail.com',
        email_verified: true,
        name: 'Impostor',
        nonce: n2.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const conflictRes = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'link-otp-conflict' },
        body: { idToken: SAMPLE_JWT, nonce: n2.nonce, attemptToken: n2.attemptToken },
      });
      assert(
        conflictRes.status === 409 && conflictRes.body?.code === 'GOOGLE_EMAIL_LINKED_TO_OTHER',
        `Expected 409 GOOGLE_EMAIL_LINKED_TO_OTHER, got ${conflictRes.status} ${JSON.stringify(conflictRes.body)}`
      );
    });

    await test('5. Phone conflict returns 409 PHONE_CONFLICT without creating duplicate account', async () => {
      const n = await issueNonce('phone-conflict');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-phone-conflict',
        email: 'phoneconflict@gmail.com',
        email_verified: true,
        name: 'Phone Conflict',
        nonce: n.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const res = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'phone-conflict' },
        body: { idToken: SAMPLE_JWT, nonce: n.nonce, attemptToken: n.attemptToken, phone: '9876500001' },
      });
      assert(
        res.status === 409 && res.body?.code === 'PHONE_CONFLICT',
        `Expected 409 PHONE_CONFLICT, got ${res.status} ${JSON.stringify(res.body)}`
      );
      assert((await ProviderAccount.countDocuments({ googleId: 'sub-phone-conflict' })) === 0, 'Must not create account on phone conflict');
    });

    await test('6. Legacy unverified-email account is NOT hijacked by Google sign-in', async () => {
      const legacyUnverified = await ProviderAccount.create({
        email: 'target.owner@gmail.com',
        emailVerified: false,
        phone: '9876500002',
        phoneVerified: true,
        name: 'Unverified Email Holder',
        status: 'ACTIVE',
      });

      const n = await issueNonce('unverified-legacy');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-real-owner',
        email: 'target.owner@gmail.com',
        email_verified: true,
        name: 'Real Owner',
        nonce: n.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const res = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'unverified-legacy' },
        body: { idToken: SAMPLE_JWT, nonce: n.nonce, attemptToken: n.attemptToken },
      });
      assert(
        res.status === 201 && res.body?.data?.id !== String(legacyUnverified._id),
        'Must create separate verified account instead of linking to unverified email record'
      );
    });

    await test('7. Suspended Google provider preserves SUSPENDED status and returns 403 PROVIDER_SUSPENDED on protected mutations', async () => {
      const suspendedAcc = await ProviderAccount.create({
        email: 'suspended.google@gmail.com',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        googleId: 'sub-suspended-google',
        authProvider: 'GOOGLE',
        status: 'SUSPENDED',
        suspensionReason: 'Policy hold',
      });

      const n = await issueNonce('suspended-google-login');
      googleAuthService._verifyWithOAuthClient = async () => ({
        iss: 'https://accounts.google.com',
        aud: TEST_GOOGLE_CLIENT_ID,
        sub: 'sub-suspended-google',
        email: 'suspended.google@gmail.com',
        email_verified: true,
        name: 'Suspended User',
        nonce: n.nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const loginRes = await httpRequest('/api/v1/provider-auth/google', {
        method: 'POST',
        headers: { 'x-wareshop-test-suite': 'suspended-google-login' },
        body: { idToken: SAMPLE_JWT, nonce: n.nonce, attemptToken: n.attemptToken },
      });
      assert(
        loginRes.status === 200 &&
          loginRes.body?.data?.id === String(suspendedAcc._id) &&
          loginRes.body?.data?.status === 'SUSPENDED',
        `Expected 200 with SUSPENDED status, got ${loginRes.status} ${JSON.stringify(loginRes.body)}`
      );

      const token = loginRes.body?.data?.token;
      const profilePutRes = await httpRequest('/api/v1/provider-auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Bypass Attempt' },
      });
      assert(
        profilePutRes.status === 403 && profilePutRes.body?.code === 'PROVIDER_SUSPENDED',
        `Expected 403 PROVIDER_SUSPENDED on suspended mutation, got ${profilePutRes.status} ${JSON.stringify(profilePutRes.body)}`
      );
    });
  } finally {
    googleAuthService._verifyWithOAuthClient = savedVerifyDelegate;
    if (savedClientId !== undefined) process.env.GOOGLE_CLIENT_ID = savedClientId;
    else delete process.env.GOOGLE_CLIENT_ID;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed (Total: ${passed + failed})\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
