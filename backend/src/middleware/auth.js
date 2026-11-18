import Admin from '../models/Admin.js';
import ProviderAccount from '../models/ProviderAccount.js';
import { errorResponse } from '../utils/apiResponse.js';

const HEX_TOKEN_REGEX = /^[a-f0-9]{64}$/i;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSafeCookieMutation(req) {
  if (!MUTATION_METHODS.has(req.method)) return true;
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  const xRequestedWith = String(req.headers['x-requested-with'] || '');

  // Reject HTML form-definable simple content types to prevent cross-site form CSRF
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('text/plain')
  ) {
    return false;
  }

  // Require custom AJAX header or JSON content type
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
      'Your provider account is currently suspended and cannot submit or modify listings.',
      403
    );
  }
  next();
}

export default { requireAdmin, requireRole, requireProvider, requireActiveProvider };
