import authService from '../services/authService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

export const adminAuthController = {
  /**
   * POST /api/v1/admin/auth/login
   * Issues a Bearer session token (never sets cookies or persists in browser storage).
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const { admin, sessionToken, sessionExpiresAt } = await authService.login(
        email,
        password,
        req
      );

      logger.info('Administrator authenticated', { role: admin.role });

      return successResponse(
        res,
        {
          token: sessionToken,
          email: admin.email,
          role: admin.role,
          expiresAt: sessionExpiresAt,
        },
        'Administrator authentication successful'
      );
    } catch (err) {
      if (err.statusCode) {
        return errorResponse(res, err.message, err.statusCode);
      }
      logger.error('Admin login error', { error: err.message });
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/auth/logout
   * Invalidates active Bearer session token on the server.
   */
  async logout(req, res, next) {
    try {
      if (req.admin) {
        await authService.logout(req.admin, req);
      }
      return successResponse(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/auth/me
   */
  async getMe(req, res) {
    return successResponse(res, {
      email: req.admin.email,
      role: req.admin.role,
      lastLoginAt: req.admin.lastLoginAt,
      passwordRotatedAt: req.admin.passwordRotatedAt,
    });
  },
};

export default adminAuthController;
