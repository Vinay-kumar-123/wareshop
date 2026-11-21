import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import env from '../config/env.js';
import {
  requireProvider,
  requireActiveProvider,
  isTrustedRequestOrigin,
} from '../middleware/auth.js';
import { errorResponse } from '../utils/apiResponse.js';
import {
  requestOtp,
  verifyOtp,
  registerProvider,
  issueGoogleNonce,
  googleAuthProvider,
  getProviderMe,
  updateProviderProfile,
  logoutProvider,
} from '../controllers/providerAuthController.js';
import { normalizeEmail, isValidEmail } from '../utils/validation.js';

const router = express.Router();

function normalizeEmailKey(req) {
  return normalizeEmail(req.body?.email);
}

function rateLimitKey(req) {
  const suite = env.isTest
    ? req.get('x-wareshop-test-suite') || req.get('x-konnevia-test-suite')
    : null;
  if (suite && /^[a-z0-9-]{1,64}$/i.test(suite)) return `test:${suite}:${ipKeyGenerator(req.ip)}`;
  return ipKeyGenerator(req.ip);
}

function otpEmailRateLimitKey(req) {
  const email = normalizeEmailKey(req);
  const suite = env.isTest
    ? req.get('x-wareshop-test-suite') || req.get('x-konnevia-test-suite')
    : null;
  const prefix = suite && /^[a-z0-9-]{1,64}$/i.test(suite) ? `test:${suite}:` : '';
  if (email && isValidEmail(email)) {
    return `${prefix}email:${email}`;
  }
  return `${prefix}ip:${ipKeyGenerator(req.ip)}`;
}

const otpRequestIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: rateLimitKey,
  message: {
    success: false,
    message: 'Too many OTP requests from this address. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpRequestEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: otpEmailRateLimitKey,
  message: {
    success: false,
    message: 'Too many OTP requests for this email address. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  keyGenerator: (req) => {
    const email = normalizeEmailKey(req);
    return `${rateLimitKey(req)}:verify:${email || 'unknown'}`;
  },
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const providerSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    const email = normalizeEmailKey(req);
    return `${rateLimitKey(req)}:session:${email || 'unknown'}`;
  },
  message: {
    success: false,
    message: 'Too many authentication requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const googleNonceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `${rateLimitKey(req)}:google-nonce`,
  message: {
    success: false,
    message: 'Too many Google sign-in attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `${rateLimitKey(req)}:google-auth`,
  message: {
    success: false,
    message: 'Too many Google sign-in attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Enforces strict JSON-only Content-Type and trusted Origin/Referer validation on all
 * unauthenticated provider authentication POST endpoints to prevent login/auth CSRF.
 */
function enforceJsonAuthCsrf(req, res, next) {
  if (!isTrustedRequestOrigin(req)) {
    return errorResponse(res, 'CSRF validation failed: untrusted request origin.', 403);
  }
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return errorResponse(
      res,
      'CSRF validation failed: application/json content type is required.',
      403
    );
  }
  return next();
}

router.post(
  ['/otp/request', '/otp/send'],
  enforceJsonAuthCsrf,
  otpRequestIpLimiter,
  otpRequestEmailLimiter,
  requestOtp
);
router.post('/otp/verify', enforceJsonAuthCsrf, otpVerifyLimiter, verifyOtp);
router.post('/register', enforceJsonAuthCsrf, providerSessionLimiter, registerProvider);
router.post('/login', enforceJsonAuthCsrf, providerSessionLimiter, registerProvider);
router.post('/google/nonce', enforceJsonAuthCsrf, googleNonceLimiter, issueGoogleNonce);
router.post('/google', enforceJsonAuthCsrf, googleAuthLimiter, googleAuthProvider);
router.get('/me', requireProvider, getProviderMe);
router.put('/profile', requireProvider, requireActiveProvider, updateProviderProfile);
router.post('/logout', requireProvider, logoutProvider);

export default router;
