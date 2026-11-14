import express from 'express'; import rateLimit from 'express-rate-limit'; import { requestOtp, verifyOtp, registerProvider } from '../controllers/providerAuthController.js';
const router = express.Router(); const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
router.post('/otp/request', limiter, requestOtp); router.post('/otp/verify', limiter, verifyOtp); router.post('/register', limiter, registerProvider); export default router;
