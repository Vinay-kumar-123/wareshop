import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import env from '../config/env.js';
import GoogleAuthNonce from '../models/GoogleAuthNonce.js';
import { sanitizeString } from '../utils/referenceId.js';
import { normalizeEmail, isValidEmail } from '../utils/validation.js';

const VALID_GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const JWT_STRUCTURE_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const NONCE_REGEX = /^[a-f0-9]{64}$/;
const GOOGLE_AUTHORITATIVE_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

// Public OAuth 2.0 Web Client ID format: <project-number>-<id>.apps.googleusercontent.com
export const GOOGLE_CLIENT_ID_REGEX = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i;
export const GOOGLE_NONCE_TTL_MS = 10 * 60_000;

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function getConfiguredClientId() {
  const raw =
    process.env.GOOGLE_CLIENT_ID !== undefined
      ? process.env.GOOGLE_CLIENT_ID
      : env.google?.clientId || '';
  const clientId = String(raw)
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
  return GOOGLE_CLIENT_ID_REGEX.test(clientId) ? clientId : '';
}

// One verifier client per client ID so Google's signing certificates are cached between requests
const oauthClientCache = new Map();
function getOAuthClient(clientId) {
  let client = oauthClientCache.get(clientId);
  if (!client) {
    client = new OAuth2Client({ clientId });
    oauthClientCache.set(clientId, client);
  }
  return client;
}

export const googleAuthService = {
  isConfigured() {
    return Boolean(getConfiguredClientId());
  },

  /**
   * Issues a cryptographically random, short-lived, single-use nonce bound to an attempt token.
   * Only SHA-256 hashes are persisted.
   */
  async issueNonce({ requestIp = '' } = {}) {
    if (!this.isConfigured()) {
      throw httpError('Google Sign-In is not configured on this server.', 503);
    }
    const nonce = crypto.randomBytes(32).toString('hex');
    const attemptToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + GOOGLE_NONCE_TTL_MS);

    await GoogleAuthNonce.create({
      nonceHash: sha256Hex(nonce),
      attemptHash: sha256Hex(attemptToken),
      expiresAt,
      requestIp: String(requestIp || '').slice(0, 64),
    });

    return {
      nonce,
      attemptToken,
      expiresInSeconds: Math.floor(GOOGLE_NONCE_TTL_MS / 1000),
    };
  },

  /**
   * Atomically consumes a nonce. Succeeds at most once per nonce, only before expiry, and only
   * when the matching attempt token is presented.
   */
  async consumeNonce({ nonce, attemptToken }) {
    if (!NONCE_REGEX.test(String(nonce || '')) || !NONCE_REGEX.test(String(attemptToken || ''))) {
      return false;
    }
    const now = new Date();
    const consumed = await GoogleAuthNonce.findOneAndUpdate(
      {
        nonceHash: sha256Hex(nonce),
        attemptHash: sha256Hex(attemptToken),
        consumedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
      { new: true }
    );
    return Boolean(consumed);
  },

  /**
   * Cryptographic verification delegate using Google's official OAuth2Client.
   * Verifies RS256 signature against Google's published certificates, issuer, audience, and expiry.
   */
  async _verifyWithOAuthClient({ idToken, clientId }) {
    const ticket = await getOAuthClient(clientId).verifyIdToken({
      idToken,
      audience: clientId,
    });
    return ticket.getPayload();
  },

  /**
   * Verifies a Google ID token and returns strictly validated identity claims.
   * The nonce is MANDATORY: the token's signed `nonce` claim must equal the supplied nonce.
   * (Single-use consumption of the nonce is performed separately via consumeNonce.)
   *
   * Never logs the token, nonce, or any library error text (library messages embed the raw JWT).
   */
  async verifyIdToken({ idToken, expectedNonce } = {}) {
    const clientId = getConfiguredClientId();
    if (!clientId) {
      throw httpError('Google Sign-In is not configured on this server.', 503);
    }

    const cleanToken = typeof idToken === 'string' ? idToken.trim() : '';
    if (!cleanToken || cleanToken.length > 4096 || !JWT_STRUCTURE_REGEX.test(cleanToken)) {
      throw httpError('A valid Google authentication token is required.', 400);
    }

    const cleanExpectedNonce = typeof expectedNonce === 'string' ? expectedNonce.trim() : '';
    if (!NONCE_REGEX.test(cleanExpectedNonce)) {
      throw httpError('A valid Google sign-in nonce is required. Please retry Google Sign-In.', 400);
    }

    let payload = null;
    try {
      payload = await this._verifyWithOAuthClient({ idToken: cleanToken, clientId });
    } catch (verifyErr) {
      const rawMsg = String(verifyErr?.message || '');
      if (/audience|recipient/i.test(rawMsg)) {
        throw httpError('Google token audience does not match this application.', 401);
      }
      if (/expired|used too late/i.test(rawMsg)) {
        throw httpError('Google authentication token has expired. Please sign in again.', 401);
      }
      if (/issuer/i.test(rawMsg)) {
        throw httpError('Invalid Google token issuer.', 401);
      }
      throw httpError('Invalid or unverifiable Google authentication token.', 401);
    }

    if (!payload || typeof payload !== 'object') {
      throw httpError('Invalid Google token payload.', 401);
    }

    // Defense-in-depth re-validation of claims (library already enforces these)
    if (!VALID_GOOGLE_ISSUERS.includes(payload.iss)) {
      throw httpError('Invalid Google token issuer.', 401);
    }

    if (payload.aud !== clientId) {
      throw httpError('Google token audience does not match this application.', 401);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) {
      throw httpError('Google authentication token has expired. Please sign in again.', 401);
    }

    const googleId = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    if (!googleId || googleId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(googleId)) {
      throw httpError('Invalid Google account identifier.', 401);
    }

    if (payload.email_verified !== true) {
      throw httpError('Google account email address is not verified.', 403);
    }

    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
      throw httpError('Google account does not contain a valid email address.', 400);
    }

    const tokenNonce = typeof payload.nonce === 'string' ? payload.nonce : '';
    const a = Buffer.from(tokenNonce, 'utf8');
    const b = Buffer.from(cleanExpectedNonce, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw httpError('Google authentication nonce validation failed.', 401);
    }

    // Google is authoritative for an email only for Gmail addresses or Workspace accounts whose
    // hosted domain (hd) matches the email domain. Other verified emails may have changed owners.
    const emailDomain = email.split('@')[1] || '';
    const hostedDomain = typeof payload.hd === 'string' ? payload.hd.trim().toLowerCase() : '';
    const emailAuthoritative =
      GOOGLE_AUTHORITATIVE_DOMAINS.has(emailDomain) ||
      (Boolean(hostedDomain) && hostedDomain === emailDomain);

    return {
      googleId,
      email,
      emailVerified: true,
      emailAuthoritative,
      nonce: tokenNonce,
      name: typeof payload.name === 'string' ? sanitizeString(payload.name).slice(0, 100) : '',
    };
  },
};

export async function verifyGoogleIdToken(params) {
  return googleAuthService.verifyIdToken(params);
}

export default googleAuthService;
