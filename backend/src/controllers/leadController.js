import leadService from '../services/leadService.js';
import storageService from '../services/storageService.js';
import { resolveActiveCategory } from '../services/listingLifecycleService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import Lead from '../models/Lead.js';
import CustomCategoryRequest from '../models/CustomCategoryRequest.js';

const MAX_PENDING_APPLICATIONS_PER_ACCOUNT = 10;

export const leadController = {
  /**
   * POST /api/v1/leads/partner (and POST /api/v1/provider-portal/listings)
   * Requires authenticated active provider session (req.providerAccount).
   * Never trusts providerAccountId from request body.
   */
  async submitPartnerEnquiry(req, res, next) {
    let uploadedImage = null;

    try {
      const account = req.providerAccount;
      if (!account) {
        return errorResponse(
          res,
          'Provider authentication required before submitting a business listing.',
          401
        );
      }

      if (account.status === 'SUSPENDED') {
        return errorResponse(
          res,
          'Your provider account is suspended and cannot submit new listings.',
          403
        );
      }

      const dto = req.validatedPartnerDto || req.body;

      // Enforce verified phone lock only when the account's mobile number was OTP-verified
      if (account.phoneVerified && account.phone && dto.phone && dto.phone !== account.phone) {
        return errorResponse(
          res,
          'Contact number must match your OTP-verified mobile number.',
          400
        );
      }

      const resolvedPhone = account.phoneVerified
        ? account.phone
        : dto.phone || account.phone;

      // Check open pending applications cap per account
      const pendingCount = await Lead.countDocuments({
        providerAccountId: account._id,
        status: { $in: ['SUBMITTED', 'new'] },
      });
      if (pendingCount >= MAX_PENDING_APPLICATIONS_PER_ACCOUNT) {
        return errorResponse(
          res,
          'You have reached the maximum number of pending applications awaiting administrator review.',
          429
        );
      }

      // Validate category against active Categories in database
      const categoryResolution = await resolveActiveCategory(dto.category);
      if (!categoryResolution.valid) {
        return errorResponse(res, categoryResolution.message, 400);
      }

      // Handle image upload if provided
      if (req.file) {
        try {
          uploadedImage = await storageService.uploadImage(req.file);
        } catch (uploadErr) {
          logger.warn('Image upload rejected during listing submission', {
            error: uploadErr.message,
          });
          return errorResponse(
            res,
            uploadErr.message || 'Failed to process business image upload.',
            uploadErr.statusCode || 400
          );
        }
      }

      const leadPayload = {
        ...dto,
        phone: resolvedPhone,
        email: dto.email || account.email || '',
        providerAccountId: account._id,
        categoryId: categoryResolution.categoryDoc?._id || null,
        category: categoryResolution.categoryName,
        categorySlug: categoryResolution.categorySlug,
        customCategoryName: categoryResolution.isOther ? dto.customCategoryName : '',
        shopImage: uploadedImage || {},
      };

      const lead = await leadService.createPartnerLead(leadPayload);

      // Update provider account profile name/email/phone if not yet populated (never sets phoneVerified!)
      let accountModified = false;
      if (!account.name && dto.contactPerson) {
        account.name = dto.contactPerson;
        accountModified = true;
      }
      if (!account.email && dto.email) {
        account.email = dto.email;
        accountModified = true;
      }
      if (!account.phone && resolvedPhone) {
        account.phone = resolvedPhone;
        accountModified = true;
      }
      if (!account.applicationId) {
        account.applicationId = lead._id;
        accountModified = true;
      }
      if (accountModified) {
        await account.save().catch(() => {});
      }

      // Record CustomCategoryRequest when 'Other' is selected
      if (categoryResolution.isOther && dto.customCategoryName) {
        const requestedName = String(dto.customCategoryName).trim();
        const normalizedName = requestedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        await CustomCategoryRequest.updateOne(
          { applicationId: lead._id, normalizedName },
          {
            $setOnInsert: {
              applicationId: lead._id,
              providerAccountId: account._id,
              requestedName,
              normalizedName,
              status: 'PENDING',
            },
          },
          { upsert: true }
        );
      }

      logger.info('Provider listing application submitted', {
        referenceId: lead.referenceId,
        providerAccountId: String(account._id),
        hasShopImage: Boolean(lead.shopImage?.url),
      });

      return successResponse(
        res,
        {
          id: String(lead._id),
          applicationId: String(lead._id),
          referenceId: lead.referenceId,
          status: 'SUBMITTED',
          businessName: lead.businessName,
          category: lead.category,
          city: lead.city,
          createdAt: lead.createdAt || new Date(),
          shopImage: lead.shopImage?.url ? { url: lead.shopImage.url } : null,
        },
        'Your listing application has been submitted and is pending administrator review.',
        201
      );
    } catch (err) {
      if (uploadedImage?.publicId) {
        await storageService.deleteImage(uploadedImage.publicId).catch(() => {});
      }
      logger.error('Listing submission failed in controller', { error: err.message });
      next(err);
    }
  },
};

export default leadController;
