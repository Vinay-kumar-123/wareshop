import express from 'express';
import leadRoutes from './leadRoutes.js';
import providerRoutes from './providerRoutes.js';
import adminRoutes from './adminRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import providerAuthRoutes from './providerAuthRoutes.js';
import healthController from '../controllers/healthController.js';

const router = express.Router();

router.get('/health', healthController.getHealth);
router.use('/leads', leadRoutes);
router.use('/providers', providerRoutes);
router.use('/categories', categoryRoutes);
router.use('/provider-auth', providerAuthRoutes);
router.use('/admin', adminRoutes);

export default router;
