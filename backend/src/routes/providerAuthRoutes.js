import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import env from '../config/env.js';
import { requireProvider } from '../middleware/auth.js';
import {
  requestOtp,
  verifyOtp,
  registerProvider,
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

router.post(['/otp/request', '/otp/send'], otpRequestIpLimiter, otpRequestEmailLimiter, requestOtp);
router.post('/otp/verify', otpVerifyLimiter, verifyOtp);
router.post('/register', providerSessionLimiter, registerProvider);
router.post('/login', providerSessionLimiter, registerProvider);
router.get('/me', requireProvider, getProviderMe);
router.put('/profile', requireProvider, updateProviderProfile);
router.post('/logout', requireProvider, logoutProvider);

export default router;
