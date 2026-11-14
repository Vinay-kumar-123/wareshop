import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import env from '../config/env.js';
import { requireProvider, requireActiveProvider } from '../middleware/auth.js';
import { handleShopImageUpload } from '../middleware/upload.js';
import { validatePartner } from '../middleware/validate.js';
import providerPortalController from '../controllers/providerPortalController.js';

const router = express.Router();

function requestRateLimitKey(req) {
  const suite = env.isTest
    ? req.get('x-wareshop-test-suite') || req.get('x-konnevia-test-suite')
    : null;
  if (suite && /^[a-z0-9-]{1,64}$/i.test(suite)) return `test:${suite}`;
  return ipKeyGenerator(req.ip);
}

const portalMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: requestRateLimitKey,
  message: {
    success: false,
    message: 'Too many listing updates. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/dashboard', requireProvider, providerPortalController.getDashboard);
router.get('/listings', requireProvider, providerPortalController.getOwnListings);
router.get('/listings/:id', requireProvider, providerPortalController.getOwnListingById);

router.post(
  '/listings',
  portalMutationLimiter,
  requireProvider,
  requireActiveProvider,
  handleShopImageUpload,
  validatePartner,
  providerPortalController.submitListing
);

router.put(
  '/listings/:id',
  portalMutationLimiter,
  requireProvider,
  requireActiveProvider,
  handleShopImageUpload,
  validatePartner,
  providerPortalController.updateOwnListing
);

export default router;
