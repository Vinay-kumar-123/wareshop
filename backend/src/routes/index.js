import express from 'express';
import leadRoutes from './leadRoutes.js';
import providerRoutes from './providerRoutes.js';
import adminRoutes from './adminRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import providerAuthRoutes from './providerAuthRoutes.js';
import providerPortalRoutes from './providerPortalRoutes.js';
import healthController from '../controllers/healthController.js';
import { requireDatabaseReady } from '../config/db.js';

const router = express.Router();

router.get('/health/live', healthController.getLiveness);
router.get('/health/ready', healthController.getReadiness);
router.get('/health', healthController.getHealth);

// All database-dependent API routes fail fast with HTTP 503 if MongoDB is unavailable
router.use(requireDatabaseReady);

router.use('/leads', leadRoutes);
router.use('/providers', providerRoutes);
router.use('/categories', categoryRoutes);
router.use('/provider-auth', providerAuthRoutes);
router.use('/provider-portal', providerPortalRoutes);
router.use('/admin', adminRoutes);

export default router;
