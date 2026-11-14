import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Provider from '../models/Provider.js';
import CustomCategoryRequest from '../models/CustomCategoryRequest.js';
import Lead from '../models/Lead.js';
import { ensureDefaultCategories } from '../services/listingLifecycleService.js';
import { logAdminActivity } from '../services/activityLogger.js';
import { escapeRegex } from '../middleware/security.js';
import { sanitizeString } from '../utils/referenceId.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE']);
const VALID_REVIEW_ACTIONS = new Set(['approve', 'map', 'reject']);

/**
 * GET /api/v1/categories
 * Public list of ACTIVE categories sorted by displayOrder.
 */
export async function getPublicCategories(req, res, next) {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find({ status: 'ACTIVE' })
      .sort({ displayOrder: 1, name: 1 })
      .select('name slug description shortDescription icon imageUrl displayOrder status')
      .lean();
    return successResponse(res, categories);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/categories/admin/all
 * Admin list of all categories with aggregated listing counts (single $group query, no N+1).
 */
export async function getCategories(req, res, next) {
  try {
    await ensureDefaultCategories();

    const [items, counts] = await Promise.all([
      Category.find().sort({ displayOrder: 1, name: 1 }).lean(),
      Provider.aggregate([
        {
          $group: {
            _id: '$categorySlug',
            totalCount: { $sum: 1 },
            publishedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$verificationStatus', 'VERIFIED'] },
                      { $eq: ['$publicationStatus', 'PUBLISHED'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const countsMap = new Map(counts.map((c) => [c._id, c]));

    const data = items.map((item) => {
      const stat = countsMap.get(item.slug);
      return {
        ...item,
        businessCount: stat?.totalCount || 0,
        publishedCount: stat?.publishedCount || 0,
      };
    });

    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/categories/admin
 */
export async function createCategory(req, res, next) {
  try {
    await ensureDefaultCategories();

    const rawName = typeof req.body?.name === 'string' ? sanitizeString(req.body.name) : '';
    const name = rawName.slice(0, 80);
    const slug = slugify(req.body?.slug || name);

    if (!name || name.length < 2 || !slug) {
      return errorResponse(res, 'A valid category name (2–80 characters) is required', 400);
    }

    const status = req.body?.status !== undefined ? String(req.body.status).toUpperCase() : 'ACTIVE';
    if (!VALID_STATUSES.has(status)) {
      return errorResponse(res, 'Category status must be ACTIVE or INACTIVE', 400);
    }

    const displayOrder =
      req.body?.displayOrder !== undefined ? Number(req.body.displayOrder) : 0;
    if (Number.isNaN(displayOrder) || displayOrder < 0 || displayOrder > 1000) {
      return errorResponse(res, 'Display order must be a number between 0 and 1000', 400);
    }

    const escapedName = escapeRegex(name);
    const exists = await Category.exists({
      $or: [{ name: new RegExp(`^${escapedName}$`, 'i') }, { slug }],
    });
    if (exists) {
      return errorResponse(res, 'A category with this name or slug already exists', 409);
    }

    const description =
      typeof req.body?.description === 'string'
        ? sanitizeString(req.body.description).slice(0, 300)
        : '';
    const shortDescription =
      typeof req.body?.shortDescription === 'string'
        ? sanitizeString(req.body.shortDescription).slice(0, 120)
        : description.slice(0, 120);
    const icon =
      typeof req.body?.icon === 'string' && req.body.icon.trim()
        ? sanitizeString(req.body.icon).slice(0, 50)
        : 'Layers';
    const imageUrl =
      typeof req.body?.imageUrl === 'string' ? sanitizeString(req.body.imageUrl).slice(0, 500) : '';

    const created = await Category.create({
      name,
      slug,
      description,
      shortDescription,
      icon,
      imageUrl,
      displayOrder,
      status,
    });

    await logAdminActivity({
      adminEmail: req.admin?.email,
      action: 'CATEGORY_CREATED',
      targetType: 'CATEGORY',
      targetId: String(created._id),
      details: { name: created.name, slug: created.slug, status: created.status },
      req,
    });

    return successResponse(res, created, 'Category created successfully', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/categories/admin/:id
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Category not found', 404);
    }

    const category = await Category.findById(id);
    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    const oldName = category.name;
    const oldSlug = category.slug;
    const oldStatus = category.status;

    if (req.body?.name !== undefined) {
      const nextName =
        typeof req.body.name === 'string' ? sanitizeString(req.body.name).slice(0, 80) : '';
      if (!nextName || nextName.length < 2) {
        return errorResponse(res, 'Category name must be 2–80 characters', 400);
      }
      category.name = nextName;
    }

    if (req.body?.slug !== undefined) {
      const nextSlug = slugify(req.body.slug);
      if (!nextSlug) {
        return errorResponse(res, 'Category slug is invalid', 400);
      }
      category.slug = nextSlug;
    }

    // Check uniqueness against other categories
    const escapedName = escapeRegex(category.name);
    const conflict = await Category.exists({
      _id: { $ne: category._id },
      $or: [{ name: new RegExp(`^${escapedName}$`, 'i') }, { slug: category.slug }],
    });
    if (conflict) {
      return errorResponse(res, 'Another category with this name or slug already exists', 409);
    }

    if (req.body?.description !== undefined) {
      category.description =
        typeof req.body.description === 'string'
          ? sanitizeString(req.body.description).slice(0, 300)
          : '';
    }

    if (req.body?.shortDescription !== undefined) {
      category.shortDescription =
        typeof req.body.shortDescription === 'string'
          ? sanitizeString(req.body.shortDescription).slice(0, 120)
          : '';
    }

    if (req.body?.icon !== undefined) {
      category.icon =
        typeof req.body.icon === 'string' && req.body.icon.trim()
          ? sanitizeString(req.body.icon).slice(0, 50)
          : 'Layers';
    }

    if (req.body?.imageUrl !== undefined) {
      category.imageUrl =
        typeof req.body.imageUrl === 'string'
          ? sanitizeString(req.body.imageUrl).slice(0, 500)
          : '';
    }

    if (req.body?.displayOrder !== undefined) {
      const displayOrder = Number(req.body.displayOrder);
      if (Number.isNaN(displayOrder) || displayOrder < 0 || displayOrder > 1000) {
        return errorResponse(res, 'Display order must be between 0 and 1000', 400);
      }
      category.displayOrder = displayOrder;
    }

    if (req.body?.status !== undefined) {
      const nextStatus = String(req.body.status).toUpperCase();
      if (!VALID_STATUSES.has(nextStatus)) {
        return errorResponse(res, 'Status must be ACTIVE or INACTIVE', 400);
      }
      category.status = nextStatus;
    }

    await category.save();

    // Cascade name/slug updates to linked Provider listings and Lead applications so none are orphaned
    if (oldName !== category.name || oldSlug !== category.slug) {
      await Promise.all([
        Provider.updateMany(
          { $or: [{ categoryId: category._id }, { categorySlug: oldSlug }] },
          {
            $set: {
              categoryId: category._id,
              category: category.name,
              categorySlug: category.slug,
            },
          }
        ),
        Lead.updateMany(
          { $or: [{ categoryId: category._id }, { categorySlug: oldSlug }, { category: oldName }] },
          {
            $set: {
              categoryId: category._id,
              category: category.name,
              categorySlug: category.slug,
            },
          }
        ),
      ]);
    }

    const actionType =
      oldStatus !== category.status
        ? category.status === 'ACTIVE'
          ? 'CATEGORY_ACTIVATED'
          : 'CATEGORY_DEACTIVATED'
        : 'CATEGORY_UPDATED';

    await logAdminActivity({
      adminEmail: req.admin?.email,
      action: actionType,
      targetType: 'CATEGORY',
      targetId: String(category._id),
      details: {
        name: category.name,
        slug: category.slug,
        status: category.status,
        displayOrder: category.displayOrder,
      },
      req,
    });

    return successResponse(res, category, 'Category updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/categories/admin/requests
 */
export async function getCategoryRequests(req, res, next) {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && typeof status === 'string' && status !== 'all') {
      query.status = status.toUpperCase();
    }

    if (search !== undefined) {
      if (typeof search !== 'string') {
        return errorResponse(res, 'Invalid search query format', 400);
      }
      const cleanSearch = escapeRegex(search);
      if (cleanSearch) {
        query.requestedName = { $regex: cleanSearch, $options: 'i' };
      }
    }

    const requests = await CustomCategoryRequest.find(query)
      .populate('applicationId', 'businessName contactPerson phone category city status createdAt')
      .populate('approvedCategoryId', 'name slug status')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return successResponse(res, requests);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/categories/admin/requests/:id/review
 * Atomically reviews a PENDING CustomCategoryRequest (approve, map, or reject).
 */
export async function reviewCategoryRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Category request not found', 404);
    }

    const action = typeof req.body?.action === 'string' ? req.body.action.trim().toLowerCase() : '';
    if (!VALID_REVIEW_ACTIONS.has(action)) {
      return errorResponse(
        res,
        'Invalid review action. Allowed values: approve, map, reject.',
        400
      );
    }

    const existing = await CustomCategoryRequest.findById(id).lean();
    if (!existing) {
      return errorResponse(res, 'Custom category request not found', 404);
    }
    if (existing.status !== 'PENDING') {
      return errorResponse(
        res,
        `Custom category request has already been reviewed (${existing.status}).`,
        409
      );
    }

    let targetCategory = null;
    let nextStatus = 'REJECTED';
    let adminNotes = '';

    if (action === 'reject') {
      const reason =
        typeof req.body?.reason === 'string' ? sanitizeString(req.body.reason).slice(0, 500) : '';
      if (!reason) {
        return errorResponse(res, 'A rejection reason is required', 400);
      }
      nextStatus = 'REJECTED';
      adminNotes = reason;
    } else if (action === 'map') {
      const categoryId = req.body?.categoryId;
      if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return errorResponse(res, 'A valid target categoryId is required for mapping', 400);
      }
      targetCategory = await Category.findById(categoryId);
      if (!targetCategory) {
        return errorResponse(res, 'Target category not found', 404);
      }
      nextStatus = 'MAPPED';
      adminNotes =
        typeof req.body?.notes === 'string' ? sanitizeString(req.body.notes).slice(0, 500) : '';
    } else if (action === 'approve') {
      const name = sanitizeString(String(req.body?.name || existing.requestedName)).slice(0, 80);
      const slug = slugify(name);
      if (!name || !slug) {
        return errorResponse(res, 'A valid category name is required to approve', 400);
      }
      const escapedName = escapeRegex(name);
      targetCategory =
        (await Category.findOne({
          $or: [{ slug }, { name: new RegExp(`^${escapedName}$`, 'i') }],
        })) ||
        (await Category.create({
          name,
          slug,
          shortDescription: name,
          description: `Commercial ${name} listings on WARESHOP.`,
          status: 'ACTIVE',
        }));
      nextStatus = 'APPROVED';
      adminNotes =
        typeof req.body?.notes === 'string' ? sanitizeString(req.body.notes).slice(0, 500) : '';
    }

    // Atomically transition from PENDING
    const updatedRequest = await CustomCategoryRequest.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: nextStatus,
          adminNotes,
          approvedCategoryId: targetCategory ? targetCategory._id : null,
          reviewedBy: req.admin?.email || 'admin',
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedRequest) {
      return errorResponse(res, 'Category request was already reviewed concurrently', 409);
    }

    // Cascade approved/mapped category to both the Lead application and any linked Provider listing
    if (targetCategory && updatedRequest.applicationId) {
      await Promise.all([
        Lead.updateOne(
          { _id: updatedRequest.applicationId },
          {
            $set: {
              categoryId: targetCategory._id,
              category: targetCategory.name,
              categorySlug: targetCategory.slug,
              customCategoryName: '',
            },
          }
        ),
        Provider.updateOne(
          { sourceApplicationId: updatedRequest.applicationId },
          {
            $set: {
              categoryId: targetCategory._id,
              category: targetCategory.name,
              categorySlug: targetCategory.slug,
              customCategoryName: '',
            },
          }
        ),
      ]);
    }

    await logAdminActivity({
      adminEmail: req.admin?.email,
      action: `CUSTOM_CATEGORY_${nextStatus}`,
      targetType: 'CUSTOM_CATEGORY_REQUEST',
      targetId: String(updatedRequest._id),
      details: {
        requestedName: updatedRequest.requestedName,
        status: nextStatus,
        targetCategory: targetCategory ? targetCategory.name : null,
      },
      req,
    });

    return successResponse(res, updatedRequest, 'Category request reviewed successfully');
  } catch (err) {
    next(err);
  }
}

export default {
  getPublicCategories,
  getCategories,
  createCategory,
  updateCategory,
  getCategoryRequests,
  reviewCategoryRequest,
};
