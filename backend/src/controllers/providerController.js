import Provider from '../models/Provider.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

export const providerController = {
  /**
   * GET /api/v1/providers
   * Public list of strictly VERIFIED and PUBLISHED providers
   */
  async getPublicProviders(req, res, next) {
    try {
      const { category, location, search } = req.query;

      // Strict public visibility gate
      const query = {
        verificationStatus: 'VERIFIED',
        publicationStatus: 'PUBLISHED',
      };

      if (category) {
        query.categorySlug = category.toLowerCase().trim();
      }

      if (location) {
        const cleanLoc = location.trim();
        query.$or = [
          { city: { $regex: cleanLoc, $options: 'i' } },
          { state: { $regex: cleanLoc, $options: 'i' } },
          { serviceAreas: { $regex: cleanLoc, $options: 'i' } },
        ];
      }

      if (search) {
        const cleanSearch = search.trim();
        query.$or = [
          { businessName: { $regex: cleanSearch, $options: 'i' } },
          { description: { $regex: cleanSearch, $options: 'i' } },
          { services: { $regex: cleanSearch, $options: 'i' } },
        ];
      }

      const providers = await Provider.find(query).select('-contactNumber -email -sourceApplicationId -sourceReferenceId -shopImage.publicId').sort({ publishedAt: -1 }).lean();

      return successResponse(res, {
        providers,
        total: providers.length,
      });
    } catch (err) {
      logger.error('Public provider fetch error', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /api/v1/providers/:slug
   * Public single provider profile
   */
  async getPublicProviderBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const cleanSlug = String(slug || '').toLowerCase().trim();

      const provider = await Provider.findOne({
        slug: cleanSlug,
        verificationStatus: 'VERIFIED',
        publicationStatus: 'PUBLISHED',
      }).lean();

      if (!provider) {
        return errorResponse(res, `Provider profile with slug "${cleanSlug}" was not found or is unpublished.`, 404);
      }

      delete provider.contactNumber;
      delete provider.email;
      delete provider.sourceApplicationId;
      delete provider.sourceReferenceId;
      return successResponse(res, provider);
    } catch (err) {
      next(err);
    }
  },
  async revealPublicContact(req, res, next) {
    try {
      const slug = String(req.params.slug || '').toLowerCase().trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return errorResponse(res, 'Invalid business listing.', 400);
      const provider = await Provider.findOne({ slug, verificationStatus: 'VERIFIED', publicationStatus: 'PUBLISHED', consentToDisplayPhone: true }).select('businessName contactNumber city state').lean();
      if (!provider?.contactNumber) return errorResponse(res, 'Contact information is not available for this listing.', 404);
      return successResponse(res, { businessName: provider.businessName, contactNumber: provider.contactNumber, location: [provider.city, provider.state].filter(Boolean).join(', ') });
    } catch (err) { next(err); }
  },
};

export default providerController;
