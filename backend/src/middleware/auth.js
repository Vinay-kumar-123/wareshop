import Admin from '../models/Admin.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Validates that an incoming request is authenticated as an active Admin.
 * Extracts token from either:
 * 1. Authorization header: Bearer <token>
 * 2. Custom header: x-admin-token
 * 3. Cookie: req.cookies.konnevia_admin_session
 * 4. Fallback raw Cookie header regex
 */
export async function requireAdmin(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim();
    } else if (req.headers['x-admin-token']) {
      token = String(req.headers['x-admin-token']).trim();
    } else if (req.cookies && req.cookies.konnevia_admin_session) {
      token = req.cookies.konnevia_admin_session;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/konnevia_admin_session=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return errorResponse(res, 'Authentication required. Please log in as owner.', 401);
    }

    const admin = await Admin.findOne({
      sessionToken: token,
      sessionExpiresAt: { $gt: new Date() },
    });

    if (!admin) {
      return errorResponse(res, 'Session invalid or expired. Please log in again.', 401);
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (err) {
    return errorResponse(res, 'Authentication failure.', 401);
  }
}

/**
 * RBAC Authorization Middleware.
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

export default { requireAdmin, requireRole };
