import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import CustomCategoryRequest from '../models/CustomCategoryRequest.js';
import storageService from '../services/storageService.js';
import {
  LISTING_STATES,
  resolveActiveCategory,
  normalizeListingStatus,
  applyListingState,
} from '../services/listingLifecycleService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import leadController from './leadController.js';

function normalizeApplicationStatus(appDoc, linkedProvider) {
  if (linkedProvider) {
    return normalizeListingStatus(linkedProvider);
  }
  const raw = String(appDoc.status || '').toUpperCase();
  if (raw === 'NEW' || raw === 'SUBMITTED') return LISTING_STATES.SUBMITTED;
  if (raw === 'QUALIFIED' || raw === 'CONVERTED' || raw === 'APPROVED') return LISTING_STATES.APPROVED;
  if (raw === 'REJECTED') return LISTING_STATES.REJECTED;
  return LISTING_STATES.SUBMITTED;
}

function formatPortalItem(appDoc, linkedProvider, customReq) {
  const effectiveStatus = normalizeApplicationStatus(appDoc, linkedProvider);
  const rejectionReason =
    appDoc.rejectionReason ||
    (appDoc.metadata instanceof Map
      ? appDoc.metadata.get('rejectionReason')
      : appDoc.metadata?.rejectionReason) ||
    linkedProvider?.rejectionReason ||
    '';

  return {
    id: String(linkedProvider?._id || appDoc._id),
    applicationId: String(appDoc._id),
    listingId: linkedProvider ? String(linkedProvider._id) : null,
    referenceId: appDoc.referenceId,
    slug: linkedProvider?.slug || null,
    businessName: linkedProvider?.businessName || appDoc.businessName,
    contactPerson: linkedProvider?.providerName || appDoc.contactPerson,
    phone: appDoc.phone,
    email: linkedProvider?.email ?? appDoc.email ?? '',
    category: linkedProvider?.category || appDoc.category,
    categorySlug: linkedProvider?.categorySlug || appDoc.categorySlug || '',
    customCategoryName: appDoc.customCategoryName || '',
    customCategoryRequest: customReq
      ? {
          id: String(customReq._id),
          requestedName: customReq.requestedName,
          status: customReq.status,
          adminNotes: customReq.adminNotes || '',
        }
      : null,
    description: linkedProvider?.description || appDoc.businessDescription || '',
    businessDescription: linkedProvider?.description || appDoc.businessDescription || '',
    servicesOffered: linkedProvider?.services?.length
      ? linkedProvider.services
      : appDoc.servicesOffered || [],
    serviceAreas: linkedProvider?.serviceAreas?.length
      ? linkedProvider.serviceAreas
      : appDoc.serviceAreas || [],
    address: linkedProvider?.address ?? appDoc.address ?? '',
    city: linkedProvider?.city || appDoc.city,
    state: linkedProvider?.state ?? appDoc.state ?? '',
    pinCode: linkedProvider?.pinCode ?? appDoc.pinCode ?? '',
    website: linkedProvider?.website ?? appDoc.website ?? '',
    shopImage: linkedProvider?.shopImage?.url
      ? { url: linkedProvider.shopImage.url }
      : appDoc.shopImage?.url
      ? { url: appDoc.shopImage.url }
      : null,
    consentToDisplayPhone:
      linkedProvider !== undefined && linkedProvider !== null
        ? linkedProvider.consentToDisplayPhone !== false
        : appDoc.consentToDisplayPhone !== false,
    status: effectiveStatus,
    applicationStatus:
      appDoc.status === 'new'
        ? 'SUBMITTED'
        : appDoc.status === 'qualified'
        ? 'APPROVED'
        : appDoc.status === 'rejected'
        ? 'REJECTED'
        : appDoc.status,
    verificationStatus: linkedProvider?.verificationStatus || 'UNVERIFIED',
    publicationStatus: linkedProvider?.publicationStatus || 'DRAFT',
    rejectionReason: effectiveStatus === LISTING_STATES.REJECTED ? rejectionReason : '',
    suspensionReason:
      effectiveStatus === LISTING_STATES.SUSPENDED
        ? linkedProvider?.suspensionReason || ''
        : '',
    createdAt: appDoc.createdAt,
    updatedAt: linkedProvider?.updatedAt || appDoc.updatedAt,
    publishedAt: linkedProvider?.publishedAt || null,
  };
}

export const providerPortalController = {
  /**
   * GET /api/v1/provider-portal/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const account = req.providerAccount;
      const [applications, listings, customRequests] = await Promise.all([
        Lead.find({ providerAccountId: account._id, type: 'partner' })
          .sort({ createdAt: -1 })
          .lean(),
        Provider.find({ providerAccountId: account._id }).sort({ updatedAt: -1 }).lean(),
        CustomCategoryRequest.find({ providerAccountId: account._id }).lean(),
      ]);

      const providerByAppId = new Map();
      for (const p of listings) {
        if (p.sourceApplicationId) {
          providerByAppId.set(String(p.sourceApplicationId), p);
        }
      }

      const customReqByAppId = new Map();
      for (const cr of customRequests) {
        if (cr.applicationId) {
          customReqByAppId.set(String(cr.applicationId), cr);
        }
      }

      const items = applications.map((appDoc) =>
        formatPortalItem(
          appDoc,
          providerByAppId.get(String(appDoc._id)) || null,
          customReqByAppId.get(String(appDoc._id)) || null
        )
      );

      const stats = {
        total: items.length,
        submitted: items.filter((i) => i.status === LISTING_STATES.SUBMITTED).length,
        approved: items.filter((i) => i.status === LISTING_STATES.APPROVED).length,
        published: items.filter((i) => i.status === LISTING_STATES.PUBLISHED).length,
        unpublished: items.filter((i) => i.status === LISTING_STATES.UNPUBLISHED).length,
        rejected: items.filter((i) => i.status === LISTING_STATES.REJECTED).length,
        suspended: items.filter((i) => i.status === LISTING_STATES.SUSPENDED).length,
      };

      const accountPhone = account.phone || '';
      const accountEmail = account.email || '';

      return successResponse(res, {
        account: {
          id: String(account._id),
          phone: accountPhone,
          phoneMasked: accountPhone ? `******${accountPhone.slice(-4)}` : '',
          phoneVerified: Boolean(account.phoneVerified),
          name: account.name || '',
          email: accountEmail,
          emailVerified: Boolean(account.emailVerified),
          emailVerifiedAt: account.emailVerifiedAt || null,
          status: account.status || 'ACTIVE',
          suspensionReason: account.status === 'SUSPENDED' ? account.suspensionReason || '' : '',
          verifiedAt: account.verifiedAt,
          lastLoginAt: account.lastLoginAt,
        },
        stats,
        listings: items,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/provider-portal/listings
   */
  async getOwnListings(req, res, next) {
    try {
      const account = req.providerAccount;
      const [applications, listings, customRequests] = await Promise.all([
        Lead.find({ providerAccountId: account._id, type: 'partner' })
          .sort({ createdAt: -1 })
          .lean(),
        Provider.find({ providerAccountId: account._id }).sort({ updatedAt: -1 }).lean(),
        CustomCategoryRequest.find({ providerAccountId: account._id }).lean(),
      ]);

      const providerByAppId = new Map();
      for (const p of listings) {
        if (p.sourceApplicationId) {
          providerByAppId.set(String(p.sourceApplicationId), p);
        }
      }

      const customReqByAppId = new Map();
      for (const cr of customRequests) {
        if (cr.applicationId) {
          customReqByAppId.set(String(cr.applicationId), cr);
        }
      }

      const items = applications.map((appDoc) =>
        formatPortalItem(
          appDoc,
          providerByAppId.get(String(appDoc._id)) || null,
          customReqByAppId.get(String(appDoc._id)) || null
        )
      );

      return successResponse(res, items);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/provider-portal/listings/:id
   * Enforces strict ownership check to prevent IDOR.
   */
  async getOwnListingById(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Listing not found', 404);
      }

      const accountIdStr = String(req.providerAccount._id);

      // Try finding by application ID or provider listing ID
      let application = await Lead.findById(id).lean();
      let linkedProvider = null;

      if (application) {
        if (String(application.providerAccountId) !== accountIdStr) {
          return errorResponse(res, 'Forbidden: You do not own this listing.', 403);
        }
        linkedProvider = await Provider.findOne({ sourceApplicationId: application._id }).lean();
      } else {
        linkedProvider = await Provider.findById(id).lean();
        if (!linkedProvider) {
          return errorResponse(res, 'Listing not found', 404);
        }
        if (String(linkedProvider.providerAccountId) !== accountIdStr) {
          return errorResponse(res, 'Forbidden: You do not own this listing.', 403);
        }
        if (linkedProvider.sourceApplicationId) {
          application = await Lead.findById(linkedProvider.sourceApplicationId).lean();
        }
      }

      if (!application && linkedProvider) {
        // Fallback if listing had no application doc
        application = {
          _id: linkedProvider._id,
          referenceId: linkedProvider.sourceReferenceId || '',
          businessName: linkedProvider.businessName,
          contactPerson: linkedProvider.providerName,
          phone: linkedProvider.contactNumber,
          email: linkedProvider.email,
          category: linkedProvider.category,
          categorySlug: linkedProvider.categorySlug,
          businessDescription: linkedProvider.description,
          servicesOffered: linkedProvider.services,
          serviceAreas: linkedProvider.serviceAreas,
          address: linkedProvider.address,
          city: linkedProvider.city,
          state: linkedProvider.state,
          pinCode: linkedProvider.pinCode,
          website: linkedProvider.website,
          shopImage: linkedProvider.shopImage,
          consentToDisplayPhone: linkedProvider.consentToDisplayPhone,
          status: linkedProvider.status,
          createdAt: linkedProvider.createdAt,
          updatedAt: linkedProvider.updatedAt,
        };
      }

      const customReq = application?._id
        ? await CustomCategoryRequest.findOne({ applicationId: application._id }).lean()
        : null;

      return successResponse(res, formatPortalItem(application, linkedProvider, customReq));
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/provider-portal/listings
   */
  submitListing: leadController.submitPartnerEnquiry,

  /**
   * PUT /api/v1/provider-portal/listings/:id
   * Allows a provider to edit their own listing.
   * Rules:
   * - Strict ownership check (IDOR protection).
   * - Contact number remains locked to authenticated phone.
   * - Edits to published/approved/rejected listings re-enter SUBMITTED review state.
   */
  async updateOwnListing(req, res, next) {
    let uploadedImage = null;

    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Listing not found', 404);
      }

      const account = req.providerAccount;
      const accountIdStr = String(account._id);
      const dto = req.validatedPartnerDto || req.body;

      // Locate application and/or linked provider listing
      let application = await Lead.findById(id);
      let linkedProvider = null;

      if (application) {
        if (String(application.providerAccountId) !== accountIdStr) {
          return errorResponse(res, 'Forbidden: You cannot modify another provider’s listing.', 403);
        }
        linkedProvider = await Provider.findOne({ sourceApplicationId: application._id });
      } else {
        linkedProvider = await Provider.findById(id);
        if (!linkedProvider) {
          return errorResponse(res, 'Listing not found', 404);
        }
        if (String(linkedProvider.providerAccountId) !== accountIdStr) {
          return errorResponse(res, 'Forbidden: You cannot modify another provider’s listing.', 403);
        }
        if (linkedProvider.sourceApplicationId) {
          application = await Lead.findById(linkedProvider.sourceApplicationId);
        }
      }

      if (
        linkedProvider &&
        normalizeListingStatus(linkedProvider) === LISTING_STATES.SUSPENDED
      ) {
        return errorResponse(
          res,
          'This listing is currently suspended by administration and cannot be modified.',
          403
        );
      }

      // Validate category
      const categoryResolution = await resolveActiveCategory(dto.category);
      if (!categoryResolution.valid) {
        return errorResponse(res, categoryResolution.message, 400);
      }

      if (req.file) {
        uploadedImage = await storageService.uploadImage(req.file);
      }

      const resolvedPhone = account.phoneVerified
        ? account.phone
        : dto.phone || account.phone || '';

      // Update application record and re-enter SUBMITTED state for admin review
      if (application) {
        application.businessName = dto.businessName;
        application.contactPerson = dto.contactPerson;
        application.name = dto.contactPerson;
        application.phone = resolvedPhone;
        application.email = dto.email || account.email || '';
        application.categoryId = categoryResolution.categoryDoc?._id || null;
        application.category = categoryResolution.categoryName;
        application.categorySlug = categoryResolution.categorySlug;
        application.customCategoryName = categoryResolution.isOther ? dto.customCategoryName : '';
        application.businessDescription = dto.businessDescription;
        application.servicesOffered = dto.servicesOffered;
        application.serviceAreas = dto.serviceAreas;
        application.address = dto.address || '';
        application.city = dto.city;
        application.state = dto.state || '';
        application.pinCode = dto.pinCode || '';
        application.website = dto.website || '';
        application.consentToDisplayPhone = dto.consentToDisplayPhone !== false;
        if (uploadedImage) {
          application.shopImage = uploadedImage;
        }
        application.status = 'SUBMITTED';
        application.rejectionReason = '';
        await application.save();
      }

      // If a linked Provider listing exists, update its fields and transition to SUBMITTED (re-entering review)
      if (linkedProvider) {
        linkedProvider.businessName = dto.businessName;
        linkedProvider.providerName = dto.contactPerson;
        linkedProvider.description = dto.businessDescription;
        linkedProvider.categoryId = categoryResolution.categoryDoc?._id || null;
        linkedProvider.category = categoryResolution.categoryName;
        linkedProvider.categorySlug = categoryResolution.categorySlug;
        linkedProvider.customCategoryName = categoryResolution.isOther ? dto.customCategoryName : '';
        linkedProvider.services = dto.servicesOffered;
        linkedProvider.serviceAreas = dto.serviceAreas;
        linkedProvider.contactNumber = resolvedPhone;
        linkedProvider.email = dto.email || account.email || '';
        linkedProvider.address = dto.address || '';
        linkedProvider.city = dto.city;
        linkedProvider.state = dto.state || '';
        linkedProvider.pinCode = dto.pinCode || '';
        linkedProvider.website = dto.website || '';
        linkedProvider.consentToDisplayPhone = dto.consentToDisplayPhone !== false;
        if (uploadedImage) {
          linkedProvider.shopImage = uploadedImage;
        }

        // Transition back to SUBMITTED so changes must be reviewed by admin before going live
        applyListingState(linkedProvider, LISTING_STATES.SUBMITTED);
        await linkedProvider.save();
      }

      // Handle CustomCategoryRequest if 'Other' was chosen
      let customReq = null;
      if (categoryResolution.isOther && dto.customCategoryName && application) {
        const requestedName = String(dto.customCategoryName).trim();
        const normalizedName = requestedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        await CustomCategoryRequest.updateOne(
          { applicationId: application._id, normalizedName },
          {
            $set: {
              requestedName,
              normalizedName,
              status: 'PENDING',
            },
            $setOnInsert: {
              applicationId: application._id,
              providerAccountId: account._id,
            },
          },
          { upsert: true }
        );
        customReq = await CustomCategoryRequest.findOne({
          applicationId: application._id,
          normalizedName,
        }).lean();
      }

      return successResponse(
        res,
        formatPortalItem(
          application ? application.toObject() : null,
          linkedProvider ? linkedProvider.toObject() : null,
          customReq
        ),
        'Listing updated and submitted for administrator review.'
      );
    } catch (err) {
      if (uploadedImage?.publicId) {
        await storageService.deleteImage(uploadedImage.publicId).catch(() => {});
      }
      next(err);
    }
  },
};

export default providerPortalController;
