import leadService from '../services/leadService.js';
import storageService from '../services/storageService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import ProviderAccount from '../models/ProviderAccount.js';
import CustomCategoryRequest from '../models/CustomCategoryRequest.js';

export const leadController = {
  async submitPartnerEnquiry(req, res, next) {
    try {
      const account = await ProviderAccount.findOne({ _id: req.body.providerAccountId, phone: String(req.body.phone || '').replace(/\D/g, '') });
      if (!account) return errorResponse(res, 'Verified provider account is required before submitting a business application.', 403);
      // If a shop image was uploaded via multipart/form-data
      if (req.file) {
        try {
          const imageMeta = await storageService.uploadImage(req.file);
          req.body.shopImage = imageMeta;
        } catch (uploadErr) {
          logger.error('Shop image upload failure during partner onboarding', {
            error: uploadErr.message,
          });
          return errorResponse(
            res,
            uploadErr.message || 'Failed to process shop image upload.',
            uploadErr.statusCode || 400
          );
        }
      }

      const lead = await leadService.createPartnerLead(req.body);
      if (String(req.body.category || '').toLowerCase() === 'other' && req.body.customCategoryName) {
        const requestedName = String(req.body.customCategoryName).trim();
        const normalizedName = requestedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await CustomCategoryRequest.updateOne({ applicationId: lead._id, normalizedName }, { $setOnInsert: { applicationId: lead._id, providerAccountId: account._id, requestedName, normalizedName } }, { upsert: true });
      }
      logger.info('Partner application successfully processed', {
        referenceId: lead.referenceId,
        business: lead.businessName,
        hasShopImage: !!lead.shopImage?.url,
      });

      return successResponse(
        res,
        {
          referenceId: lead.referenceId,
          status: 'received',
          createdAt: lead.createdAt || new Date(),
          shopImage: lead.shopImage?.url ? { url: lead.shopImage.url } : null,
        },
        'Your partner application has been received. Our partnerships desk will review your business credentials and shop details.',
        201
      );
    } catch (err) {
      logger.error('Partner submission failed in controller', { error: err.message });
      next(err);
    }
  },

};

export default leadController;
