import crypto from 'crypto';
import Admin from '../models/Admin.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { logAdminActivity } from './activityLogger.js';

export const authService = {
  /**
   * Safe Admin Provisioning & Startup Check.
   * Only provisions initial SUPER_ADMIN if no admin exists in the database.
   * If an account exists, it does NOT overwrite credentials unless explicitly forced.
   */
  async bootstrapAdmin({ forceRotate = false } = {}) {
    try {
      const email = env.admin.email;
      const configuredPassword = env.admin.password;

      let admin = await Admin.findOne({ email });

      if (!admin) {
        // First-time provisioning
        const { salt, passwordHash } = Admin.hashPassword(configuredPassword);
        admin = new Admin({
          email,
          passwordHash,
          salt,
          role: 'SUPER_ADMIN',
          passwordRotatedAt: new Date(),
        });
        await admin.save();
        logger.info(`Owner SUPER_ADMIN account provisioned successfully: ${email}`);
        await logAdminActivity({
          adminEmail: email,
          action: 'BOOTSTRAP_PROVISIONED',
          targetType: 'AUTH',
          targetId: String(admin._id),
          details: { email, role: 'SUPER_ADMIN' },
        });
      } else if (forceRotate || env.admin.autoRotate) {
        // Controlled credential rotation
        const { salt, passwordHash } = Admin.hashPassword(configuredPassword);
        admin.passwordHash = passwordHash;
        admin.salt = salt;
        admin.sessionToken = null;
        admin.sessionExpiresAt = null;
        admin.passwordRotatedAt = new Date();
        await admin.save();
        logger.info(`Owner SUPER_ADMIN credentials rotated from environment: ${email}`);
        await logAdminActivity({
          adminEmail: email,
          action: 'CREDENTIALS_ROTATED',
          targetType: 'AUTH',
          targetId: String(admin._id),
          details: { email, rotatedAt: admin.passwordRotatedAt },
        });
      } else {
        logger.debug(`Owner account verified: ${email} (no password overwrite performed)`);
      }

      return admin;
    } catch (err) {
      logger.error('Failed to run admin bootstrap check', { error: err.message });
      throw err;
    }
  },

  /**
   * Authenticate admin with credentials
   */
  async login(email, password, req = null) {
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const admin = await Admin.findOne({ email: cleanEmail });

    if (!admin || !admin.verifyPassword(password)) {
      await logAdminActivity({
        adminEmail: cleanEmail,
        action: 'LOGIN_FAILED',
        targetType: 'AUTH',
        details: { reason: 'Invalid credentials' },
        req,
      });
      const error = new Error('Invalid owner credentials');
      error.statusCode = 401;
      throw error;
    }

    // Generate cryptographic 32-byte session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionDurationHours = 12;
    const sessionExpiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);

    admin.sessionToken = sessionToken;
    admin.sessionExpiresAt = sessionExpiresAt;
    admin.lastLoginAt = new Date();
    await admin.save();

    await logAdminActivity({
      adminEmail: cleanEmail,
      action: 'LOGIN',
      targetType: 'AUTH',
      targetId: String(admin._id),
      details: { role: admin.role, expiresAt: sessionExpiresAt },
      req,
    });

    return {
      admin,
      sessionToken,
      sessionExpiresAt,
      durationHours: sessionDurationHours,
    };
  },

  /**
   * Invalidate active admin session
   */
  async logout(admin, req = null) {
    if (admin) {
      admin.sessionToken = null;
      admin.sessionExpiresAt = null;
      await admin.save();

      await logAdminActivity({
        adminEmail: admin.email,
        action: 'LOGOUT',
        targetType: 'AUTH',
        targetId: String(admin._id),
        req,
      });
    }
  },
};

export default authService;
