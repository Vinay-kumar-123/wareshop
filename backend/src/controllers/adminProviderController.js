import crypto from 'crypto';
import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import ProviderAccount from '../models/ProviderAccount.js';
import Category from '../models/Category.js';
import CustomCategoryRequest from '../models/CustomCategoryRequest.js';
import ActivityLog from '../models/ActivityLog.js';
import {
  LISTING_STATES,
  createSlug,
  ensureDefaultCategories,
  resolveActiveCategory,
  normalizeListingStatus,
  applyListingState,
} from '../services/listingLifecycleService.js';
import { escapeRegex } from '../middleware/security.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { logAdminActivity } from '../services/activityLogger.js';

async function generateUniqueProviderSlug(businessName) {
  const baseSlug = createSlug(businessName);
  let slug = baseSlug;
  let counter = 1;
  while (await Provider.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

async function verifyPublishPreconditions(provider) {
  await ensureDefaultCategories();

  if (provider.verificationStatus !== 'VERIFIED') {
    return {
      ok: false,
      statusCode: 400,
      message: 'Listing must be approved and verified before it can be published.',
    };
  }

  if (!provider.contactNumber || !/^[6-9]\d{9}$/.test(provider.contactNumber)) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Listing must have a valid verified 10-digit Indian mobile number before publishing.',
    };
  }

  if (!provider.categorySlug || provider.categorySlug === 'other') {
    return {
      ok: false,
      statusCode: 400,
      message:
        'Listing has an unmapped custom category ("Other"). Approve or map the category before publishing.',
    };
  }

  const categoryDoc = await Category.findOne({
    slug: provider.categorySlug.toLowerCase(),
  }).lean();

  if (!categoryDoc) {
    return {
      ok: false,
      statusCode: 400,
      message: `Category "${provider.category}" does not exist in WARESHOP categories.`,
    };
  }

  if (categoryDoc.status !== 'ACTIVE') {
    return {
      ok: false,
      statusCode: 400,
      message: `Category "${categoryDoc.name}" is currently inactive. Activate the category before publishing.`,
    };
  }

  if (provider.providerAccountId) {
    const account = await ProviderAccount.findById(provider.providerAccountId).lean();
    if (account && account.status === 'SUSPENDED') {
      return {
        ok: false,
        statusCode: 400,
        message: 'Cannot publish listing while the provider account is suspended.',
      };
    }
  }

  return { ok: true, categoryDoc };
}

export const adminProviderController = {
  /**
   * GET /api/v1/admin/dashboard
   * Consolidated counts and stats from real MongoDB queries.
   */
  async getDashboardStats(req, res, next) {
    try {
      await ensureDefaultCategories();

      const [
        totalProviderAccounts,
        suspendedProviders,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalListings,
        approvedListings,
        publishedListings,
        suspendedListings,
        pendingCategoryRequests,
        recentApplications,
        recentActivityLogs,
      ] = await Promise.all([
        ProviderAccount.countDocuments(),
        ProviderAccount.countDocuments({ status: 'SUSPENDED' }),
        Lead.countDocuments({ type: 'partner' }),
        Lead.countDocuments({
          type: 'partner',
          status: { $in: ['SUBMITTED', 'new'] },
        }),
        Lead.countDocuments({
          type: 'partner',
          status: {
            $in: ['APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'qualified', 'converted'],
          },
        }),
        Lead.countDocuments({
          type: 'partner',
          status: { $in: ['REJECTED', 'rejected'] },
        }),
        Provider.countDocuments(),
        Provider.countDocuments({
          verificationStatus: 'VERIFIED',
          publicationStatus: 'DRAFT',
        }),
        Provider.countDocuments({
          verificationStatus: 'VERIFIED',
          publicationStatus: 'PUBLISHED',
        }),
        Provider.countDocuments({
          $or: [
            { status: 'SUSPENDED' },
            { verificationStatus: 'REVOKED', suspensionReason: { $ne: '' } },
          ],
        }),
        CustomCategoryRequest.countDocuments({ status: 'PENDING' }),
        Lead.find({ type: 'partner' }).sort({ createdAt: -1 }).limit(6).lean(),
        ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean(),
      ]);

      return successResponse(res, {
        stats: {
          totalProviders: totalProviderAccounts,
          suspendedProviders,
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          totalListings,
          approvedListings,
          publishedListings,
          suspendedListings,
          pendingCategoryRequests,
          applications: {
            total: totalApplications,
            pending: pendingApplications,
            approved: approvedApplications,
            rejected: rejectedApplications,
          },
          providers: {
            total: totalListings,
            totalAccounts: totalProviderAccounts,
            approved: approvedListings,
            published: publishedListings,
            draft: approvedListings,
            suspended: suspendedProviders,
            suspendedListings,
          },
        },
        recentApplications,
        recentActivityLogs,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/applications
   * Supports status, category, city, search, and pagination.
   */
  async getApplications(req, res, next) {
    try {
      const { status, category, city, search, page = '1', limit = '50' } = req.query || {};

      if (
        (status !== undefined && typeof status !== 'string') ||
        (category !== undefined && typeof category !== 'string') ||
        (city !== undefined && typeof city !== 'string') ||
        (search !== undefined && typeof search !== 'string')
      ) {
        return errorResponse(res, 'Query filter parameters must be strings.', 400);
      }

      const query = { type: 'partner' };

      if (status && status !== 'all') {
        const normalized = status.trim().toUpperCase();
        if (normalized === 'PENDING' || normalized === 'SUBMITTED' || normalized === 'NEW') {
          query.status = { $in: ['SUBMITTED', 'new'] };
        } else if (normalized === 'APPROVED' || normalized === 'QUALIFIED') {
          query.status = { $in: ['APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'qualified', 'converted'] };
        } else if (normalized === 'PUBLISHED') {
          query.status = 'PUBLISHED';
        } else if (normalized === 'REJECTED') {
          query.status = { $in: ['REJECTED', 'rejected'] };
        } else if (normalized === 'SUSPENDED') {
          query.status = 'SUSPENDED';
        } else {
          query.status = status.trim();
        }
      }

      if (category && category !== 'all' && category.trim()) {
        const cleanCat = escapeRegex(category.trim().slice(0, 80));
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { categorySlug: category.trim().toLowerCase() },
            { category: { $regex: `^${cleanCat}$`, $options: 'i' } },
          ],
        });
      }

      if (city && city !== 'all' && city.trim()) {
        const cleanCity = escapeRegex(city.trim().slice(0, 80));
        query.city = { $regex: cleanCity, $options: 'i' };
      }

      if (search && search.trim()) {
        const cleanSearch = escapeRegex(search.trim().slice(0, 100));
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { businessName: { $regex: cleanSearch, $options: 'i' } },
            { contactPerson: { $regex: cleanSearch, $options: 'i' } },
            { phone: { $regex: cleanSearch, $options: 'i' } },
            { email: { $regex: cleanSearch, $options: 'i' } },
            { city: { $regex: cleanSearch, $options: 'i' } },
            { referenceId: { $regex: cleanSearch, $options: 'i' } },
          ],
        });
      }

      const parsedPage = Math.max(parseInt(String(page), 10) || 1, 1);
      const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
      const skip = (parsedPage - 1) * parsedLimit;

      const [applications, total] = await Promise.all([
        Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean(),
        Lead.countDocuments(query),
      ]);

      return successResponse(res, applications, 'Success', 200, {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.max(Math.ceil(total / parsedLimit), 1),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/applications/:id
   */
  async getApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Partner application not found', 404);
      }

      const application = await Lead.findById(id).lean();
      if (!application || application.type !== 'partner') {
        return errorResponse(res, 'Partner application not found', 404);
      }

      const [existingProvider, customCategoryRequest, providerAccount] = await Promise.all([
        Provider.findOne({ sourceApplicationId: application._id }).lean(),
        CustomCategoryRequest.findOne({ applicationId: application._id }).lean(),
        application.providerAccountId
          ? ProviderAccount.findById(application.providerAccountId)
              .select('phone name email status suspensionReason verifiedAt lastLoginAt')
              .lean()
          : null,
      ]);

      return successResponse(res, {
        application,
        linkedProvider: existingProvider,
        customCategoryRequest,
        providerAccount,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/applications/:id/approve
   * Atomically transitions a pending application to APPROVED and creates/updates
   * a VERIFIED + DRAFT Provider listing linked to the provider's account.
   */
  async approveApplication(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Partner application not found', 404);
      }

      const existingApp = await Lead.findById(id);
      if (!existingApp || existingApp.type !== 'partner') {
        return errorResponse(res, 'Partner application not found', 404);
      }

      // Resolve category before locking approval
      const categoryInput = req.body?.category || existingApp.category;
      const categoryResolution = await resolveActiveCategory(categoryInput);
      if (!categoryResolution.valid) {
        return errorResponse(res, categoryResolution.message, 400);
      }

      if (categoryResolution.isOther) {
        return errorResponse(
          res,
          'This application requested a custom category ("Other"). Please approve or map the custom category request before approving the application.',
          400
        );
      }

      // Atomic state transition from pending ('SUBMITTED' or legacy 'new') to 'APPROVED'
      const application = await Lead.findOneAndUpdate(
        {
          _id: id,
          type: 'partner',
          status: { $in: ['SUBMITTED', 'new'] },
        },
        {
          $set: {
            status: 'APPROVED',
            categoryId: categoryResolution.categoryDoc?._id || null,
            category: categoryResolution.categoryName,
            categorySlug: categoryResolution.categorySlug,
            approvedAt: new Date(),
            reviewedBy: req.admin?.email || 'admin',
            rejectionReason: '',
          },
        },
        { new: true }
      );

      if (!application) {
        return errorResponse(
          res,
          `Application cannot be approved because its current status is "${existingApp.status}".`,
          409
        );
      }

      let provider = await Provider.findOne({ sourceApplicationId: application._id });

      if (!provider) {
        let saved = false;
        let attempts = 0;

        while (!saved && attempts < 5) {
          attempts += 1;
          const slug =
            attempts === 1
              ? await generateUniqueProviderSlug(application.businessName)
              : `${createSlug(application.businessName)}-${crypto.randomBytes(3).toString('hex')}`;

          provider = new Provider({
            providerAccountId: application.providerAccountId || null,
            businessName: application.businessName,
            providerName: application.contactPerson || application.name || '',
            slug,
            description:
              application.businessDescription ||
              `${application.businessName} provides commercial space and business services in ${application.city}.`,
            categoryId: categoryResolution.categoryDoc?._id || null,
            category: categoryResolution.categoryName,
            categorySlug: categoryResolution.categorySlug,
            customCategoryName: application.customCategoryName || '',
            services: Array.isArray(application.servicesOffered)
              ? application.servicesOffered
              : [],
            contactNumber: application.phone,
            email: application.email || '',
            city: application.city,
            state: application.state || '',
            address: application.address || '',
            pinCode: application.pinCode || '',
            serviceAreas:
              Array.isArray(application.serviceAreas) && application.serviceAreas.length > 0
                ? application.serviceAreas
                : [application.city],
            website: application.website || '',
            shopImage: application.shopImage || {},
            sourceApplicationId: application._id,
            sourceReferenceId: application.referenceId,
            status: LISTING_STATES.APPROVED,
            verificationStatus: 'VERIFIED',
            publicationStatus: 'DRAFT',
            publicationConsent: application.consentToContact !== false,
            consentToDisplayPhone: application.consentToDisplayPhone !== false,
            verifiedAt: new Date(),
          });

          try {
            await provider.save();
            saved = true;
          } catch (saveErr) {
            if (saveErr && saveErr.code === 11000) {
              // If concurrent insert created the provider by sourceApplicationId, load it
              const concurrentProvider = await Provider.findOne({
                sourceApplicationId: application._id,
              });
              if (concurrentProvider) {
                provider = concurrentProvider;
                saved = true;
              } else if (attempts >= 5) {
                throw saveErr;
              }
            } else {
              throw saveErr;
            }
          }
        }
      } else {
        provider.providerAccountId =
          provider.providerAccountId || application.providerAccountId || null;
        provider.businessName = application.businessName;
        provider.providerName = application.contactPerson || provider.providerName;
        provider.description = application.businessDescription || provider.description;
        provider.categoryId = categoryResolution.categoryDoc?._id || provider.categoryId;
        provider.category = categoryResolution.categoryName;
        provider.categorySlug = categoryResolution.categorySlug;
        provider.services = Array.isArray(application.servicesOffered)
          ? application.servicesOffered
          : provider.services;
        provider.contactNumber = application.phone || provider.contactNumber;
        provider.email = application.email || provider.email;
        provider.city = application.city || provider.city;
        provider.state = application.state || provider.state;
        provider.address = application.address || provider.address;
        provider.pinCode = application.pinCode || provider.pinCode;
        provider.website = application.website || provider.website;
        provider.consentToDisplayPhone = application.consentToDisplayPhone !== false;
        if (application.shopImage?.url) {
          provider.shopImage = application.shopImage;
        }
        applyListingState(provider, LISTING_STATES.APPROVED, { force: true });
        await provider.save();
      }

      if (provider && String(application.linkedListingId || '') !== String(provider._id)) {
        application.linkedListingId = provider._id;
        await application.save();
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'APPLICATION_APPROVED',
        targetType: 'APPLICATION',
        targetId: String(application._id),
        details: {
          businessName: application.businessName,
          providerId: String(provider._id),
          slug: provider.slug,
          category: provider.category,
        },
        req,
      });

      return successResponse(
        res,
        { application, provider },
        'Application approved successfully. Listing is now APPROVED and ready to be published.'
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/applications/:id/reject
   */
  async rejectApplication(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Partner application not found', 404);
      }

      const rawReason = req.body?.reason;
      if (typeof rawReason !== 'string' || !rawReason.trim()) {
        return errorResponse(res, 'A rejection reason is mandatory', 400);
      }
      const cleanReason = rawReason.trim().slice(0, 500);

      const existingApp = await Lead.findById(id);
      if (!existingApp || existingApp.type !== 'partner') {
        return errorResponse(res, 'Partner application not found', 404);
      }

      if (existingApp.status === 'REJECTED' || existingApp.status === 'rejected') {
        return errorResponse(res, 'Application has already been rejected.', 409);
      }

      const now = new Date();
      existingApp.status = 'REJECTED';
      existingApp.rejectionReason = cleanReason;
      existingApp.rejectedAt = now;
      existingApp.reviewedBy = req.admin?.email || 'admin';
      if (!existingApp.metadata) existingApp.metadata = new Map();
      existingApp.metadata.set('rejectionReason', cleanReason);
      existingApp.metadata.set('rejectedAt', now.toISOString());
      await existingApp.save();

      // Transition any linked Provider record to REJECTED
      const linkedProvider = await Provider.findOne({ sourceApplicationId: existingApp._id });
      if (linkedProvider) {
        applyListingState(linkedProvider, LISTING_STATES.REJECTED, {
          reason: cleanReason,
          force: true,
        });
        await linkedProvider.save();
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'APPLICATION_REJECTED',
        targetType: 'APPLICATION',
        targetId: String(existingApp._id),
        details: { businessName: existingApp.businessName, reason: cleanReason },
        req,
      });

      return successResponse(res, existingApp, 'Application rejected successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/providers
   */
  async getProviders(req, res, next) {
    try {
      const {
        status,
        verificationStatus,
        publicationStatus,
        category,
        city,
        search,
        page = '1',
        limit = '50',
      } = req.query || {};

      if (
        (status !== undefined && typeof status !== 'string') ||
        (verificationStatus !== undefined && typeof verificationStatus !== 'string') ||
        (publicationStatus !== undefined && typeof publicationStatus !== 'string') ||
        (category !== undefined && typeof category !== 'string') ||
        (city !== undefined && typeof city !== 'string') ||
        (search !== undefined && typeof search !== 'string')
      ) {
        return errorResponse(res, 'Query filter parameters must be strings.', 400);
      }

      const query = {};

      if (status && status !== 'all') {
        const normalized = status.trim().toUpperCase();
        if (Object.values(LISTING_STATES).includes(normalized)) {
          query.status = normalized;
        }
      }
      if (verificationStatus && verificationStatus !== 'all') {
        query.verificationStatus = verificationStatus.trim().toUpperCase();
      }
      if (publicationStatus && publicationStatus !== 'all') {
        query.publicationStatus = publicationStatus.trim().toUpperCase();
      }
      if (category && category !== 'all' && category.trim()) {
        query.categorySlug = category.trim().toLowerCase();
      }
      if (city && city !== 'all' && city.trim()) {
        const cleanCity = escapeRegex(city.trim().slice(0, 80));
        query.city = { $regex: cleanCity, $options: 'i' };
      }

      if (search && search.trim()) {
        const cleanSearch = escapeRegex(search.trim().slice(0, 100));
        query.$or = [
          { businessName: { $regex: cleanSearch, $options: 'i' } },
          { providerName: { $regex: cleanSearch, $options: 'i' } },
          { city: { $regex: cleanSearch, $options: 'i' } },
          { contactNumber: { $regex: cleanSearch, $options: 'i' } },
          { slug: { $regex: cleanSearch, $options: 'i' } },
        ];
      }

      const parsedPage = Math.max(parseInt(String(page), 10) || 1, 1);
      const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
      const skip = (parsedPage - 1) * parsedLimit;

      const [providers, total] = await Promise.all([
        Provider.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean(),
        Provider.countDocuments(query),
      ]);

      // Enrich with providerAccount status
      const accountIds = [
        ...new Set(
          providers
            .map((p) => (p.providerAccountId ? String(p.providerAccountId) : null))
            .filter(Boolean)
        ),
      ];

      const accounts = accountIds.length
        ? await ProviderAccount.find({ _id: { $in: accountIds } })
            .select('phone name status suspensionReason')
            .lean()
        : [];
      const accountMap = new Map(accounts.map((a) => [String(a._id), a]));

      const enriched = providers.map((p) => {
        const acc = p.providerAccountId ? accountMap.get(String(p.providerAccountId)) : null;
        return {
          ...p,
          status: normalizeListingStatus(p),
          accountStatus: acc?.status || 'ACTIVE',
          accountSuspensionReason: acc?.suspensionReason || '',
        };
      });

      return successResponse(res, enriched, 'Success', 200, {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.max(Math.ceil(total / parsedLimit), 1),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/providers/:id
   */
  async getProviderById(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const provider = await Provider.findById(id).lean();
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const [account, application] = await Promise.all([
        provider.providerAccountId
          ? ProviderAccount.findById(provider.providerAccountId)
              .select('phone name email status suspensionReason verifiedAt lastLoginAt')
              .lean()
          : null,
        provider.sourceApplicationId
          ? Lead.findById(provider.sourceApplicationId).lean()
          : null,
      ]);

      return successResponse(res, {
        ...provider,
        status: normalizeListingStatus(provider),
        providerAccount: account,
        sourceApplication: application,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/v1/admin/providers/:id
   * Explicit allow-listed DTO with type, format, category, and lifecycle validation.
   */
  async updateProvider(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Provider not found', 404);
      }

      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return errorResponse(res, 'Invalid request payload', 400);
      }

      const forbiddenFields = new Set([
        '_id',
        '__v',
        'id',
        'slug',
        'sourceApplicationId',
        'sourceReferenceId',
        'providerAccountId',
        'shopImage',
        'isDemo',
        'verifiedAt',
        'publishedAt',
        'createdAt',
        'updatedAt',
        'role',
      ]);

      const allowedFields = new Set([
        'businessName',
        'providerName',
        'description',
        'category',
        'categorySlug',
        'services',
        'contactNumber',
        'email',
        'address',
        'city',
        'state',
        'pinCode',
        'serviceAreas',
        'website',
        'status',
        'verificationStatus',
        'publicationStatus',
        'rejectionReason',
        'suspensionReason',
        'publicationConsent',
        'consentToDisplayPhone',
        'metaTitle',
        'metaDescription',
      ]);

      for (const key of Object.keys(req.body)) {
        if (forbiddenFields.has(key) || !allowedFields.has(key)) {
          return errorResponse(
            res,
            `Field "${key}" is not allowed or is exclusively server-controlled.`,
            400
          );
        }
      }

      const provider = await Provider.findById(id);
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const body = req.body;
      if (body.businessName !== undefined) {
        if (
          typeof body.businessName !== 'string' ||
          body.businessName.trim().length < 2 ||
          body.businessName.trim().length > 120
        ) {
          return errorResponse(res, 'businessName must be between 2 and 120 characters', 400);
        }
        provider.businessName = body.businessName.trim();
      }
      if (body.providerName !== undefined) {
        if (typeof body.providerName !== 'string' || body.providerName.trim().length > 100) {
          return errorResponse(res, 'providerName must be at most 100 characters', 400);
        }
        provider.providerName = body.providerName.trim();
      }
      if (body.description !== undefined) {
        if (
          typeof body.description !== 'string' ||
          body.description.trim().length < 10 ||
          body.description.trim().length > 2000
        ) {
          return errorResponse(res, 'description must be between 10 and 2000 characters', 400);
        }
        provider.description = body.description.trim();
      }

      // Validate category against Category collection if category or categorySlug is updated
      if (body.category !== undefined || body.categorySlug !== undefined) {
        const catCandidate = body.category !== undefined ? body.category : body.categorySlug;
        const catRes = await resolveActiveCategory(catCandidate);
        if (!catRes.valid || catRes.isOther) {
          return errorResponse(
            res,
            catRes.message || 'Listing must be assigned to an active WARESHOP category.',
            400
          );
        }
        provider.categoryId = catRes.categoryDoc?._id || provider.categoryId;
        provider.category = catRes.categoryName;
        provider.categorySlug = catRes.categorySlug;
      }

      if (body.services !== undefined) {
        if (!Array.isArray(body.services) || body.services.length > 25) {
          return errorResponse(res, 'services must be an array of at most 25 items', 400);
        }
        provider.services = body.services
          .filter((s) => typeof s === 'string')
          .map((s) => s.trim().slice(0, 100))
          .filter(Boolean);
      }

      if (body.contactNumber !== undefined) {
        const cleanPhone = String(body.contactNumber || '').replace(/\D/g, '');
        if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
          return errorResponse(
            res,
            'contactNumber must be a valid 10-digit Indian mobile number',
            400
          );
        }
        if (provider.providerAccountId) {
          const ownerAccount = await ProviderAccount.findById(provider.providerAccountId).lean();
          if (ownerAccount && ownerAccount.phone !== cleanPhone) {
            return errorResponse(
              res,
              'contactNumber is locked to the provider account’s OTP-verified mobile number.',
              400
            );
          }
        }
        provider.contactNumber = cleanPhone;
      }

      if (body.email !== undefined) {
        const cleanEmail = String(body.email || '').trim().toLowerCase();
        if (
          cleanEmail &&
          (cleanEmail.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
        ) {
          return errorResponse(res, 'email must be a valid email address', 400);
        }
        provider.email = cleanEmail;
      }
      if (body.address !== undefined) {
        if (typeof body.address !== 'string' || body.address.trim().length > 300) {
          return errorResponse(res, 'address must be at most 300 characters', 400);
        }
        provider.address = body.address.trim();
      }
      if (body.city !== undefined) {
        if (
          typeof body.city !== 'string' ||
          body.city.trim().length < 2 ||
          body.city.trim().length > 80
        ) {
          return errorResponse(res, 'city must be between 2 and 80 characters', 400);
        }
        provider.city = body.city.trim();
      }
      if (body.state !== undefined) {
        if (typeof body.state !== 'string' || body.state.trim().length > 80) {
          return errorResponse(res, 'state must be at most 80 characters', 400);
        }
        provider.state = body.state.trim();
      }
      if (body.pinCode !== undefined) {
        const cleanPin = String(body.pinCode || '').trim();
        if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
          return errorResponse(res, 'pinCode must be 6 digits', 400);
        }
        provider.pinCode = cleanPin;
      }
      if (body.serviceAreas !== undefined) {
        if (!Array.isArray(body.serviceAreas) || body.serviceAreas.length > 25) {
          return errorResponse(res, 'serviceAreas must be an array of at most 25 locations', 400);
        }
        provider.serviceAreas = body.serviceAreas
          .filter((a) => typeof a === 'string')
          .map((a) => a.trim().slice(0, 80))
          .filter(Boolean);
      }
      if (body.website !== undefined) {
        const cleanWeb = String(body.website || '').trim();
        if (cleanWeb && (cleanWeb.length > 255 || !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(cleanWeb))) {
          return errorResponse(res, 'website must be a valid HTTP/HTTPS URL', 400);
        }
        provider.website = cleanWeb;
      }
      if (body.publicationConsent !== undefined) {
        provider.publicationConsent = Boolean(body.publicationConsent);
      }
      if (body.consentToDisplayPhone !== undefined) {
        provider.consentToDisplayPhone = Boolean(body.consentToDisplayPhone);
      }
      if (body.metaTitle !== undefined) {
        if (typeof body.metaTitle !== 'string' || body.metaTitle.trim().length > 160) {
          return errorResponse(res, 'metaTitle must be at most 160 characters', 400);
        }
        provider.metaTitle = body.metaTitle.trim();
      }
      if (body.metaDescription !== undefined) {
        if (typeof body.metaDescription !== 'string' || body.metaDescription.trim().length > 320) {
          return errorResponse(res, 'metaDescription must be at most 320 characters', 400);
        }
        provider.metaDescription = body.metaDescription.trim();
      }

      // Handle explicit status or legacy verificationStatus/publicationStatus updates
      if (body.status !== undefined) {
        if (!Object.values(LISTING_STATES).includes(body.status)) {
          return errorResponse(res, 'Invalid listing status value', 400);
        }
        applyListingState(provider, body.status, {
          reason: body.rejectionReason || body.suspensionReason,
          force: true,
        });
      } else {
        if (body.verificationStatus !== undefined) {
          if (!['UNVERIFIED', 'VERIFIED', 'REVOKED'].includes(body.verificationStatus)) {
            return errorResponse(res, 'Invalid verificationStatus value', 400);
          }
          provider.verificationStatus = body.verificationStatus;
        }
        if (body.publicationStatus !== undefined) {
          if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(body.publicationStatus)) {
            return errorResponse(res, 'Invalid publicationStatus value', 400);
          }
          provider.publicationStatus = body.publicationStatus;
        }

        // Sync canonical status from verificationStatus + publicationStatus
        if (provider.verificationStatus === 'REVOKED') {
          provider.status = provider.suspensionReason
            ? LISTING_STATES.SUSPENDED
            : LISTING_STATES.REJECTED;
        } else if (provider.verificationStatus === 'VERIFIED') {
          provider.status =
            provider.publicationStatus === 'PUBLISHED'
              ? LISTING_STATES.PUBLISHED
              : LISTING_STATES.APPROVED;
        } else {
          provider.status = LISTING_STATES.SUBMITTED;
        }
      }

      // Enforce all publish preconditions whenever the resulting state is PUBLISHED
      if (
        provider.publicationStatus === 'PUBLISHED' ||
        provider.status === LISTING_STATES.PUBLISHED
      ) {
        const check = await verifyPublishPreconditions(provider);
        if (!check.ok) {
          return errorResponse(res, check.message, check.statusCode);
        }
        provider.status = LISTING_STATES.PUBLISHED;
        provider.verificationStatus = 'VERIFIED';
        provider.publicationStatus = 'PUBLISHED';
        if (!provider.publishedAt) {
          provider.publishedAt = new Date();
        }
      }

      await provider.save();

      // Sync status with linked application if present
      if (provider.sourceApplicationId) {
        await Lead.updateOne(
          { _id: provider.sourceApplicationId },
          {
            $set: {
              businessName: provider.businessName,
              category: provider.category,
              categorySlug: provider.categorySlug,
              city: provider.city,
              status: provider.status,
            },
          }
        ).catch(() => {});
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'PROVIDER_UPDATED',
        targetType: 'PROVIDER',
        targetId: String(provider._id),
        details: {
          slug: provider.slug,
          status: provider.status,
          verificationStatus: provider.verificationStatus,
          publicationStatus: provider.publicationStatus,
        },
        req,
      });

      return successResponse(res, provider, 'Provider profile updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/providers/:id/publish
   */
  async publishProvider(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const provider = await Provider.findById(id);
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const check = await verifyPublishPreconditions(provider);
      if (!check.ok) {
        return errorResponse(res, check.message, check.statusCode);
      }

      applyListingState(provider, LISTING_STATES.PUBLISHED, { force: true });
      await provider.save();

      if (provider.sourceApplicationId) {
        await Lead.updateOne(
          { _id: provider.sourceApplicationId },
          { $set: { status: LISTING_STATES.PUBLISHED } }
        ).catch(() => {});
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'PROVIDER_PUBLISHED',
        targetType: 'PROVIDER',
        targetId: String(provider._id),
        details: { businessName: provider.businessName, slug: provider.slug },
        req,
      });

      return successResponse(res, provider, 'Listing published to the public marketplace.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/providers/:id/unpublish
   */
  async unpublishProvider(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const provider = await Provider.findById(id);
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }

      applyListingState(provider, LISTING_STATES.UNPUBLISHED, { force: true });
      await provider.save();

      if (provider.sourceApplicationId) {
        await Lead.updateOne(
          { _id: provider.sourceApplicationId },
          { $set: { status: LISTING_STATES.UNPUBLISHED } }
        ).catch(() => {});
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'PROVIDER_UNPUBLISHED',
        targetType: 'PROVIDER',
        targetId: String(provider._id),
        details: { businessName: provider.businessName, slug: provider.slug },
        req,
      });

      return successResponse(res, provider, 'Listing unpublished and removed from public search.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/providers/:id/suspend
   * Suspends the listing and, if linked to a ProviderAccount, suspends the account
   * and all of its listings so none of a suspended provider's listings appear publicly.
   */
  async suspendProvider(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const reason =
        typeof req.body?.reason === 'string' && req.body.reason.trim()
          ? req.body.reason.trim().slice(0, 500)
          : 'Suspended by administrator due to policy violation.';

      const provider = await Provider.findById(id);
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }

      applyListingState(provider, LISTING_STATES.SUSPENDED, { reason, force: true });
      await provider.save();

      if (provider.sourceApplicationId) {
        await Lead.updateOne(
          { _id: provider.sourceApplicationId },
          { $set: { status: LISTING_STATES.SUSPENDED } }
        ).catch(() => {});
      }

      if (provider.providerAccountId) {
        await Promise.all([
          ProviderAccount.updateOne(
            { _id: provider.providerAccountId },
            {
              $set: {
                status: 'SUSPENDED',
                suspensionReason: reason,
                suspendedAt: new Date(),
                sessionTokenHash: null,
                sessionExpiresAt: null,
              },
            }
          ),
          Provider.updateMany(
            { providerAccountId: provider.providerAccountId },
            {
              $set: {
                status: LISTING_STATES.SUSPENDED,
                verificationStatus: 'REVOKED',
                publicationStatus: 'ARCHIVED',
                suspensionReason: reason,
              },
            }
          ),
          Lead.updateMany(
            { providerAccountId: provider.providerAccountId, type: 'partner' },
            { $set: { status: LISTING_STATES.SUSPENDED } }
          ),
        ]);
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'PROVIDER_SUSPENDED',
        targetType: 'PROVIDER',
        targetId: String(provider._id),
        details: {
          businessName: provider.businessName,
          slug: provider.slug,
          providerAccountId: provider.providerAccountId
            ? String(provider.providerAccountId)
            : null,
          reason,
        },
        req,
      });

      return successResponse(res, provider, 'Provider and associated listings have been suspended.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/providers/:id/reactivate
   * Reactivates a suspended provider account and transitions the listing back to APPROVED (DRAFT).
   */
  async reactivateProvider(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const provider = await Provider.findById(id);
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }

      applyListingState(provider, LISTING_STATES.APPROVED, { force: true });
      await provider.save();

      if (provider.sourceApplicationId) {
        await Lead.updateOne(
          { _id: provider.sourceApplicationId },
          { $set: { status: LISTING_STATES.APPROVED } }
        ).catch(() => {});
      }

      if (provider.providerAccountId) {
        await ProviderAccount.updateOne(
          { _id: provider.providerAccountId },
          {
            $set: {
              status: 'ACTIVE',
              suspensionReason: '',
              suspendedAt: null,
            },
          }
        );
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'PROVIDER_REACTIVATED',
        targetType: 'PROVIDER',
        targetId: String(provider._id),
        details: {
          businessName: provider.businessName,
          slug: provider.slug,
          providerAccountId: provider.providerAccountId
            ? String(provider.providerAccountId)
            : null,
        },
        req,
      });

      return successResponse(
        res,
        provider,
        'Provider reactivated and listing set to APPROVED (Draft).'
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/provider-accounts
   */
  async getProviderAccounts(req, res, next) {
    try {
      const { status, search } = req.query || {};
      const query = {};
      if (status && status !== 'all' && typeof status === 'string') {
        query.status = status.trim().toUpperCase();
      }
      if (search && typeof search === 'string' && search.trim()) {
        const cleanSearch = escapeRegex(search.trim().slice(0, 80));
        query.$or = [
          { phone: { $regex: cleanSearch, $options: 'i' } },
          { name: { $regex: cleanSearch, $options: 'i' } },
          { email: { $regex: cleanSearch, $options: 'i' } },
        ];
      }

      const accounts = await ProviderAccount.find(query)
        .select('phone name email status suspensionReason suspendedAt verifiedAt lastLoginAt createdAt')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return successResponse(res, accounts);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/activity-logs
   */
  async getActivityLogs(req, res, next) {
    try {
      const { limit = '50' } = req.query || {};
      const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);

      const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(parsedLimit).lean();

      return successResponse(res, logs);
    } catch (err) {
      next(err);
    }
  },
};

export default adminProviderController;
