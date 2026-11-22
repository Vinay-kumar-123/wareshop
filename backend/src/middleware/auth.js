import Admin from '../models/Admin.js';
import ProviderAccount from '../models/ProviderAccount.js';
import env from '../config/env.js';
import { errorResponse } from '../utils/apiResponse.js';

const HEX_TOKEN_REGEX = /^[a-f0-9]{64}$/i;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getAllowedOriginsList() {
  const raw = (process.env.CORS_ORIGIN || env.corsOrigin || '').trim();
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, '').toLowerCase())
    .filter(Boolean);
}

function extractRefererOrigin(refererHeader) {
  if (!refererHeader || typeof refererHeader !== 'string') return '';
  try {
    const parsed = new URL(refererHeader.trim());
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Validates Origin (or Referer fallback) against the configured CORS_ORIGIN allowlist.
 * In development/test, local loopback origins (localhost / 127.0.0.1) are also permitted,
 * while any external untrusted origin is always rejected.
 */
export function isTrustedRequestOrigin(req) {
  const rawOrigin = String(req.headers.origin || '').trim().replace(/\/$/, '').toLowerCase();
  const refererOrigin = extractRefererOrigin(req.headers.referer);
  const candidateOrigin = rawOrigin || refererOrigin;

  if (!candidateOrigin) {
    // In production, cookie-authenticated state-changing requests must present Origin or Referer
    return true;
  }

  const allowedOrigins = getAllowedOriginsList();
  if (!env.isProduction && allowedOrigins.includes('*')) {
    return true;
  }

  if (allowedOrigins.includes(candidateOrigin)) {
    return true;
  }

  if (
    !env.isProduction &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(candidateOrigin)
  ) {
    return true;
  }

  return false;
}

function isSafeCookieMutation(req) {
  if (!MUTATION_METHODS.has(req.method)) return true;
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  const xRequestedWith = String(req.headers['x-requested-with'] || '');
  const hasOriginOrReferer = Boolean(req.headers.origin || req.headers.referer);

  // 1. Validate Origin / Referer against strict CORS allowlist
  if (!isTrustedRequestOrigin(req)) {
    return false;
  }

  // 2. In production, require Origin or Referer on cookie-authenticated mutations
  if (env.isProduction && !hasOriginOrReferer && xRequestedWith !== 'XMLHttpRequest') {
    return false;
  }

  // 3. Reject HTML form-definable simple content types to prevent cross-site form CSRF
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('text/plain')
  ) {
    return false;
  }

  // 4. Require custom AJAX header or JSON content type
  return xRequestedWith === 'XMLHttpRequest' || contentType.includes('application/json');
}

function extractToken(req, cookieName) {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.slice(7).trim(), source: 'bearer' };
  }

  const cookieToken = req.cookies?.[cookieName];
  if (cookieToken && typeof cookieToken === 'string') {
    return { token: cookieToken.trim(), source: 'cookie' };
  }

  return { token: null, source: null };
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Validates that an incoming request is authenticated as an active Admin.
 * Strictly enforces Bearer-only authentication (rejects cookie-only or x-admin-token requests).
 */
export async function requireAdmin(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return errorResponse(res, 'Authentication required. Please log in as administrator.', 401);
    }

    if (!HEX_TOKEN_REGEX.test(token)) {
      return errorResponse(res, 'Session invalid or expired. Please log in again.', 401);
    }

    const tokenHash = Admin.hashSessionToken(token);
    const admin = await Admin.findOne({
      sessionTokenHash: tokenHash,
      sessionExpiresAt: { $gt: new Date() },
    });

    if (!admin) {
      return errorResponse(res, 'Session invalid or expired. Please log in again.', 401);
    }

    req.admin = admin;
    next();
  } catch {
    return errorResponse(res, 'Authentication failure.', 401);
  }
}

/**
 * RBAC Authorization Middleware for Admin routes.
 * SUPER_ADMIN is always permitted. Otherwise checks if req.admin.role is in allowedRoles.
 */
export function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.admin) {
      return errorResponse(res, 'Authentication required.', 401);
    }

    if (req.admin.role === 'SUPER_ADMIN' || roles.includes(req.admin.role)) {
      return next();
    }

    return errorResponse(
      res,
      `Forbidden: Insufficient privileges for action. Requires role: ${roles.join(' or ')}`,
      403
    );
  };
}

/**
 * Validates that an incoming request is authenticated as a verified ProviderAccount.
 * Never trusts providerAccountId supplied by the client.
 */
export async function requireProvider(req, res, next) {
  try {
    const { token, source } = extractToken(req, 'wareshop_provider_session');

    if (!token) {
      return errorResponse(
        res,
        'Provider authentication required. Please verify your email address via OTP.',
        401
      );
    }

    if (source === 'cookie' && !isSafeCookieMutation(req)) {
      return errorResponse(res, 'CSRF validation failed for state-changing request.', 403);
    }

    if (!HEX_TOKEN_REGEX.test(token)) {
      return errorResponse(res, 'Provider session invalid or expired. Please log in again.', 401);
    }

    const tokenHash = ProviderAccount.hashSessionToken(token);
    const account = await ProviderAccount.findOne({
      sessionTokenHash: tokenHash,
      sessionExpiresAt: { $gt: new Date() },
    });

    if (!account) {
      return errorResponse(res, 'Provider session invalid or expired. Please log in again.', 401);
    }

    req.providerAccount = account;
    next();
  } catch {
    return errorResponse(res, 'Provider authentication failure.', 401);
  }
}

/**
 * Requires an authenticated provider whose account status is ACTIVE (not SUSPENDED).
 */
export function requireActiveProvider(req, res, next) {
  if (!req.providerAccount) {
    return errorResponse(res, 'Provider authentication required.', 401);
  }
  if (req.providerAccount.status === 'SUSPENDED') {
    return errorResponse(
      res,
      'Your provider account is currently unavailable. Please contact support for assistance.',
      403,
      null,
      'PROVIDER_SUSPENDED'
    );
  }
  next();
}

export default {
  requireAdmin,
  requireRole,
  requireProvider,
  requireActiveProvider,
  isTrustedRequestOrigin,
};
