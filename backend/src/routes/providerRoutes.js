import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import env from '../config/env.js';
import providerController from '../controllers/providerController.js';

const router = express.Router();

function requestRateLimitKey(req) {
  const suite = env.isTest
    ? req.get('x-wareshop-test-suite') || req.get('x-konnevia-test-suite')
    : null;
  if (suite && /^[a-z0-9-]{1,64}$/i.test(suite)) return `test:${suite}`;
  return ipKeyGenerator(req.ip);
}

const publicSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => `public-search:${requestRateLimitKey(req)}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search requests. Please wait a moment and try again.',
  },
});

const contactRevealLimiter = rateLimit({
  windowMs: env.contactRevealWindowMs,
  max: env.contactRevealMaxRequests,
  keyGenerator: (req) => `contact-reveal:${requestRateLimitKey(req)}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact requests. Please try again later.',
  },
});

router.get('/', publicSearchLimiter, providerController.getPublicProviders);
router.get('/:slug/contact', contactRevealLimiter, providerController.revealPublicContact);
router.get('/:slug', publicSearchLimiter, providerController.getPublicProviderBySlug);

export default router;
