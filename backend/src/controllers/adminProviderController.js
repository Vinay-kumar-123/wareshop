import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import ActivityLog from '../models/ActivityLog.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { logAdminActivity } from '../services/activityLogger.js';
import logger from '../utils/logger.js';

function createSlug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const adminProviderController = {
  /**
   * GET /api/v1/admin/dashboard
   * Consolidated counts and stats from real MongoDB queries
   */
  async getDashboardStats(req, res, next) {
    try {
      const [
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalProviders,
        publishedProviders,
        recentApplications,
        recentActivityLogs,
      ] = await Promise.all([
        Lead.countDocuments({ type: 'partner' }),
        Lead.countDocuments({ type: 'partner', status: 'new' }),
        Lead.countDocuments({ type: 'partner', status: { $in: ['qualified', 'converted'] } }),
        Lead.countDocuments({ type: 'partner', status: 'rejected' }),
        Provider.countDocuments(),
        Provider.countDocuments({ publicationStatus: 'PUBLISHED', verificationStatus: 'VERIFIED' }),
        Lead.find({ type: 'partner' }).sort({ createdAt: -1 }).limit(5).lean(),
        ActivityLog.find().sort({ createdAt: -1 }).limit(8).lean(),
      ]);

      return successResponse(res, {
        stats: {
          applications: {
            total: totalApplications,
            pending: pendingApplications,
            approved: approvedApplications,
            rejected: rejectedApplications,
          },
          providers: {
            total: totalProviders,
            published: publishedProviders,
            draft: totalProviders - publishedProviders,
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
   */
  async getApplications(req, res, next) {
    try {
      const { status, search } = req.query;
      const query = { type: 'partner' };

      if (status && status !== 'all') {
        if (status === 'pending') query.status = 'new';
        else if (status === 'approved') query.status = { $in: ['qualified', 'converted'] };
        else if (status === 'rejected') query.status = 'rejected';
        else query.status = status;
      }

      if (search) {
        const clean = search.trim();
        query.$or = [
          { businessName: { $regex: clean, $options: 'i' } },
          { contactPerson: { $regex: clean, $options: 'i' } },
          { phone: { $regex: clean, $options: 'i' } },
          { email: { $regex: clean, $options: 'i' } },
          { referenceId: { $regex: clean, $options: 'i' } },
        ];
      }

      const applications = await Lead.find(query).sort({ createdAt: -1 }).lean();
      return successResponse(res, applications);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/applications/:id
   */
  async getApplicationById(req, res, next) {
    try {
      const application = await Lead.findById(req.params.id).lean();
      if (!application || application.type !== 'partner') {
        return errorResponse(res, 'Partner application not found', 404);
      }

      const existingProvider = await Provider.findOne({ sourceApplicationId: application._id }).lean();

      return successResponse(res, {
        application,
        linkedProvider: existingProvider,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/applications/:id/approve
   * Approves application and creates/updates a VERIFIED + DRAFT Provider record.
   */
  async approveApplication(req, res, next) {
    try {
      const application = await Lead.findById(req.params.id);
      if (!application || application.type !== 'partner') {
        return errorResponse(res, 'Partner application not found', 404);
      }

      application.status = 'qualified';
      await application.save();

      let provider = await Provider.findOne({ sourceApplicationId: application._id });

      if (!provider) {
        let baseSlug = createSlug(application.businessName);
        let slug = baseSlug;
        let counter = 1;
        while (await Provider.findOne({ slug })) {
          slug = `${baseSlug}-${counter++}`;
        }

        const catSlug = createSlug(application.category);

        provider = new Provider({
          businessName: application.businessName,
          providerName: application.contactPerson,
          slug,
          description:
            application.businessDescription ||
            `${application.businessName} provides verified services across ${application.city}.`,
          category: application.category,
          categorySlug: catSlug || 'services',
          services: Array.isArray(application.servicesOffered) ? application.servicesOffered : [],
          contactNumber: application.phone,
          email: application.email,
          city: application.city,
          state: application.state || '',
          address: application.address || '',
          pinCode: application.pinCode || '',
          serviceAreas: Array.isArray(application.serviceAreas)
            ? application.serviceAreas
            : [application.city],
          website: application.website || '',
          shopImage: application.shopImage || {},
          sourceApplicationId: application._id,
          sourceReferenceId: application.referenceId,
          verificationStatus: 'VERIFIED',
          publicationStatus: 'DRAFT',
          publicationConsent: application.consentToContact || true,
          consentToDisplayPhone: application.consentToDisplayPhone !== false,
          verifiedAt: new Date(),
        });

        await provider.save();
      } else {
        provider.verificationStatus = 'VERIFIED';
        provider.verifiedAt = new Date();
        if (application.shopImage?.url && !provider.shopImage?.url) {
          provider.shopImage = application.shopImage;
        }
        await provider.save();
      }

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'APPLICATION_APPROVED',
        targetType: 'LEAD',
        targetId: String(application._id),
        details: {
          businessName: application.businessName,
          providerId: String(provider._id),
          slug: provider.slug,
        },
        req,
      });

      return successResponse(
        res,
        { application, provider },
        'Application approved successfully. Provider profile created as DRAFT.'
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
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return errorResponse(res, 'A rejection reason is mandatory', 400);
      }

      const application = await Lead.findById(req.params.id);
      if (!application || application.type !== 'partner') {
        return errorResponse(res, 'Partner application not found', 404);
      }

      application.status = 'rejected';
      if (!application.metadata) application.metadata = new Map();
      application.metadata.set('rejectionReason', reason.trim());
      application.metadata.set('rejectedAt', new Date().toISOString());
      await application.save();

      // Revoke any existing provider record
      await Provider.updateOne(
        { sourceApplicationId: application._id },
        { verificationStatus: 'REVOKED', publicationStatus: 'ARCHIVED' }
      );

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'APPLICATION_REJECTED',
        targetType: 'LEAD',
        targetId: String(application._id),
        details: { businessName: application.businessName, reason: reason.trim() },
        req,
      });

      return successResponse(res, application, 'Application rejected successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/providers
   */
  async getProviders(req, res, next) {
    try {
      const { verificationStatus, publicationStatus, search } = req.query;
      const query = {};

      if (verificationStatus) query.verificationStatus = verificationStatus;
      if (publicationStatus) query.publicationStatus = publicationStatus;

      if (search) {
        const clean = search.trim();
        query.$or = [
          { businessName: { $regex: clean, $options: 'i' } },
          { providerName: { $regex: clean, $options: 'i' } },
          { city: { $regex: clean, $options: 'i' } },
          { contactNumber: { $regex: clean, $options: 'i' } },
        ];
      }

      const providers = await Provider.find(query).sort({ createdAt: -1 }).lean();
      return successResponse(res, providers);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/providers/:id
   */
  async getProviderById(req, res, next) {
    try {
      const provider = await Provider.findById(req.params.id).lean();
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }
      return successResponse(res, provider);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/v1/admin/providers/:id
   */
  async updateProvider(req, res, next) {
    try {
      const provider = await Provider.findById(req.params.id);
      if (!provider) {
        return errorResponse(res, 'Provider not found', 404);
      }

      const allowedUpdates = [
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
        'shopImage',
        'verificationStatus',
        'publicationStatus',
        'publicationConsent',
        'consentToDisplayPhone',
        'metaTitle',
        'metaDescription',
      ];

      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          provider[key] = req.body[key];
        }
      }

      if (req.body.publicationStatus === 'PUBLISHED') {
        if (provider.verificationStatus !== 'VERIFIED') {
          return errorResponse(res, 'Provider must be VERIFIED before publishing', 400);
        }
        if (!provider.publishedAt) {
          provider.publishedAt = new Date();
        }
      }

      await provider.save();

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'PROVIDER_UPDATED',
        targetType: 'PROVIDER',
        targetId: String(provider._id),
        details: {
          slug: provider.slug,
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
   * GET /api/v1/admin/activity-logs
   */
  async getActivityLogs(req, res, next) {
    try {
      const { limit = 50 } = req.query;
      const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

      const logs = await ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .lean();

      return successResponse(res, logs);
    } catch (err) {
      next(err);
    }
  },
};

export default adminProviderController;
