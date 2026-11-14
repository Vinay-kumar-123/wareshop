import crypto from 'crypto';
import Admin from '../models/Admin.js';
import env, { isStrongPassword } from '../config/env.js';
import logger from '../utils/logger.js';
import { logAdminActivity } from './activityLogger.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const authService = {
  /**
   * Explicit Admin Provisioning.
   * Automatic production Super Admin creation is disabled.
   * Must be invoked via explicit CLI script (`bootstrapAdmin.js`) with allowInProduction=true.
   */
  async bootstrapAdmin({
    email: overrideEmail,
    password: overridePassword,
    forceRotate = false,
    allowInProduction = false,
  } = {}) {
    if (env.isProduction && !allowInProduction) {
      throw new Error(
        'Automatic Super Admin provisioning is disabled in production. Use the explicit bootstrap:admin CLI command.'
      );
    }

    try {
      const email = String(overrideEmail ?? env.admin.email ?? '')
        .trim()
        .toLowerCase();
      const configuredPassword = String(overridePassword ?? env.admin.password ?? '');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        throw new Error('A valid administrator email is required to bootstrap an account.');
      }

      if (!isStrongPassword(configuredPassword)) {
        throw new Error(
          'A strong administrator password (min 12 chars, upper, lower, digit, symbol) is required to bootstrap an account.'
        );
      }

      let admin = await Admin.findOne({ email });

      if (!admin) {
        const { salt, passwordHash } = Admin.hashPassword(configuredPassword);
        admin = new Admin({
          email,
          passwordHash,
          salt,
          role: 'SUPER_ADMIN',
          sessionTokenHash: null,
          sessionExpiresAt: null,
          failedLoginAttempts: 0,
          lockoutUntil: null,
          passwordRotatedAt: new Date(),
        });
        await admin.save();
        logger.info('Owner SUPER_ADMIN account provisioned successfully');
        await logAdminActivity({
          adminEmail: email,
          action: 'BOOTSTRAP_PROVISIONED',
          targetType: 'AUTH',
          targetId: String(admin._id),
          details: { role: 'SUPER_ADMIN' },
        });
      } else if (forceRotate || env.admin.autoRotate) {
        const { salt, passwordHash } = Admin.hashPassword(configuredPassword);
        admin.passwordHash = passwordHash;
        admin.salt = salt;
        admin.sessionTokenHash = null;
        admin.sessionExpiresAt = null;
        admin.failedLoginAttempts = 0;
        admin.lockoutUntil = null;
        admin.passwordRotatedAt = new Date();
        await admin.save();
        logger.info('Owner SUPER_ADMIN credentials rotated');
        await logAdminActivity({
          adminEmail: email,
          action: 'CREDENTIALS_ROTATED',
          targetType: 'AUTH',
          targetId: String(admin._id),
          details: { rotatedAt: admin.passwordRotatedAt },
        });
      }

      return admin;
    } catch (err) {
      logger.error('Failed to run admin bootstrap check', { error: err.message });
      throw err;
    }
  },

  /**
   * Authenticate admin with credentials.
   * Stores only a SHA-256 hash of the session token in MongoDB and enforces lockout after repeated failures.
   */
  async login(email, password, req = null) {
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !password || typeof password !== 'string') {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const admin = await Admin.findOne({ email: cleanEmail });

    if (admin && admin.lockoutUntil && admin.lockoutUntil > new Date()) {
      const error = new Error(
        'Account temporarily locked due to repeated failed login attempts. Please try again later.'
      );
      error.statusCode = 429;
      throw error;
    }

    if (!admin || !admin.verifyPassword(password)) {
      if (admin) {
        const nextAttempts = (admin.failedLoginAttempts || 0) + 1;
        admin.failedLoginAttempts = nextAttempts;
        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          admin.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        }
        await admin.save();
      }

      await logAdminActivity({
        adminEmail: cleanEmail,
        action: 'LOGIN_FAILED',
        targetType: 'AUTH',
        details: { reason: 'Invalid credentials' },
        req,
      });
      const error = new Error('Invalid administrator credentials');
      error.statusCode = 401;
      throw error;
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = Admin.hashSessionToken(sessionToken);
    const sessionDurationHours = 12;
    const sessionExpiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);

    admin.sessionToken = null;
    admin.sessionTokenHash = sessionTokenHash;
    admin.sessionExpiresAt = sessionExpiresAt;
    admin.failedLoginAttempts = 0;
    admin.lockoutUntil = null;
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
      admin.sessionTokenHash = null;
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
