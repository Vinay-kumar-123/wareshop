import authService from '../services/authService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

export const adminAuthController = {
  /**
   * POST /api/v1/admin/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { admin, sessionToken, sessionExpiresAt, durationHours } = await authService.login(
        email,
        password,
        req
      );

      logger.info('Owner authenticated successfully', { email: admin.email, role: admin.role });

      // Cookie options
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('konnevia_admin_session', sessionToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: durationHours * 60 * 60 * 1000,
        path: '/',
      });

      return successResponse(
        res,
        {
          token: sessionToken,
          email: admin.email,
          role: admin.role,
          expiresAt: sessionExpiresAt,
        },
        'Owner authentication successful'
      );
    } catch (err) {
      if (err.statusCode) {
        return errorResponse(res, err.message, err.statusCode);
      }
      logger.error('Login error', { error: err.message });
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/auth/logout
   */
  async logout(req, res, next) {
    try {
      if (req.admin) {
        await authService.logout(req.admin, req);
      }

      res.clearCookie('konnevia_admin_session', { path: '/' });
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
