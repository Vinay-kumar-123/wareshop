import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { handleCategoryImageUpload } from '../middleware/upload.js';
import {
  getPublicCategories,
  getCategories,
  createCategory,
  updateCategory,
  getCategoryRequests,
  reviewCategoryRequest,
} from '../controllers/categoryController.js';

const router = express.Router();

router.get('/', getPublicCategories);
router.get('/admin/all', requireAdmin, getCategories);
router.post('/admin', requireAdmin, handleCategoryImageUpload, createCategory);
router.put('/admin/:id', requireAdmin, handleCategoryImageUpload, updateCategory);
router.get('/admin/requests', requireAdmin, getCategoryRequests);
router.post('/admin/requests/:id/review', requireAdmin, reviewCategoryRequest);

export default router;
