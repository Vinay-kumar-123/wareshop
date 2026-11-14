import express from 'express';
import rateLimit from 'express-rate-limit';
import providerController from '../controllers/providerController.js';

const router = express.Router();
const contactRevealLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many contact requests. Please try again later.' } });

router.get('/', providerController.getPublicProviders);
router.get('/:slug/contact', contactRevealLimiter, providerController.revealPublicContact);
router.get('/:slug', providerController.getPublicProviderBySlug);

export default router;
