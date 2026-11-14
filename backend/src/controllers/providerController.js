import Provider from '../models/Provider.js';
import ProviderAccount from '../models/ProviderAccount.js';
import Category from '../models/Category.js';
import { ensureDefaultCategories } from '../services/listingLifecycleService.js';
import { escapeRegex } from '../middleware/security.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Formats a Provider document into a strictly allow-listed public marketplace DTO.
 * Never exposes contactNumber, email, providerName, internal IDs, or storage publicIds.
 */
function toPublicListingDto(doc) {
  return {
    _id: String(doc._id),
    id: String(doc._id),
    businessName: doc.businessName,
    slug: doc.slug,
    description: doc.description,
    category: doc.category,
    categorySlug: doc.categorySlug,
    services: Array.isArray(doc.services) ? doc.services : [],
    city: doc.city,
    state: doc.state || '',
    address: doc.address || '',
    pinCode: doc.pinCode || '',
    serviceAreas: Array.isArray(doc.serviceAreas) ? doc.serviceAreas : [],
    website: doc.website || '',
    shopImage: doc.shopImage?.url ? { url: doc.shopImage.url } : null,
    gallery: Array.isArray(doc.gallery)
      ? doc.gallery.filter((g) => g?.url).map((g) => ({ url: g.url }))
      : [],
    consentToDisplayPhone: doc.consentToDisplayPhone !== false,
    isDemo: Boolean(doc.isDemo),
    publishedAt: doc.publishedAt || doc.createdAt,
  };
}

async function getPublicVisibilityFilters() {
  await ensureDefaultCategories();

  const [activeCategories, suspendedAccounts] = await Promise.all([
    Category.find({ status: 'ACTIVE' }).select('slug').lean(),
    ProviderAccount.find({ status: 'SUSPENDED' }).select('_id').lean(),
  ]);

  const activeCategorySlugs = activeCategories.map((c) => c.slug.toLowerCase());
  const suspendedAccountIds = suspendedAccounts.map((a) => a._id);

  return { activeCategorySlugs, suspendedAccountIds };
}

export const providerController = {
  /**
   * GET /api/v1/providers
   * Public list of strictly VERIFIED, PUBLISHED, active-category, non-suspended listings.
   */
  async getPublicProviders(req, res, next) {
    try {
      const { category, city, location, search, page = '1', limit = '12' } = req.query || {};

      if (
        (category !== undefined && typeof category !== 'string') ||
        (city !== undefined && typeof city !== 'string') ||
        (location !== undefined && typeof location !== 'string') ||
        (search !== undefined && typeof search !== 'string') ||
        (page !== undefined && typeof page !== 'string') ||
        (limit !== undefined && typeof limit !== 'string')
      ) {
        return errorResponse(res, 'Query filter parameters must be valid strings.', 400);
      }

      const { activeCategorySlugs, suspendedAccountIds } = await getPublicVisibilityFilters();

      const query = {
        verificationStatus: 'VERIFIED',
        publicationStatus: 'PUBLISHED',
        status: { $nin: ['REJECTED', 'SUSPENDED', 'UNPUBLISHED', 'SUBMITTED'] },
        isDemo: { $ne: true },
        categorySlug: { $in: activeCategorySlugs },
      };

      if (suspendedAccountIds.length > 0) {
        query.providerAccountId = { $nin: suspendedAccountIds };
      }

      const andClauses = [];

      if (category && category.trim() && category.trim().toLowerCase() !== 'all') {
        const requestedSlug = category.toLowerCase().trim().slice(0, 80);
        if (!activeCategorySlugs.includes(requestedSlug)) {
          return successResponse(res, {
            providers: [],
            total: 0,
            page: 1,
            limit: 12,
            totalPages: 1,
          });
        }
        query.categorySlug = requestedSlug;
      }

      const locationFilter = (location || city || '').trim();
      if (locationFilter) {
        const cleanLoc = escapeRegex(locationFilter.slice(0, 80));
        andClauses.push({
          $or: [
            { city: { $regex: cleanLoc, $options: 'i' } },
            { state: { $regex: cleanLoc, $options: 'i' } },
            { address: { $regex: cleanLoc, $options: 'i' } },
            { serviceAreas: { $regex: cleanLoc, $options: 'i' } },
          ],
        });
      }

      if (search && search.trim()) {
        const cleanSearch = escapeRegex(search.trim().slice(0, 100));
        andClauses.push({
          $or: [
            { businessName: { $regex: cleanSearch, $options: 'i' } },
            { description: { $regex: cleanSearch, $options: 'i' } },
            { category: { $regex: cleanSearch, $options: 'i' } },
            { city: { $regex: cleanSearch, $options: 'i' } },
            { services: { $regex: cleanSearch, $options: 'i' } },
          ],
        });
      }

      if (andClauses.length > 0) {
        query.$and = andClauses;
      }

      const parsedPage = Math.max(parseInt(String(page), 10) || 1, 1);
      const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 12, 1), 50);
      const skip = (parsedPage - 1) * parsedLimit;

      const [docs, total] = await Promise.all([
        Provider.find(query)
          .sort({ publishedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        Provider.countDocuments(query),
      ]);

      const providers = docs.map(toPublicListingDto);

      return successResponse(res, {
        providers,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.max(Math.ceil(total / parsedLimit), 1),
      });
    } catch (err) {
      logger.error('Public provider fetch error', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /api/v1/providers/:slug
   * Public single business detail page with related businesses.
   */
  async getPublicProviderBySlug(req, res, next) {
    try {
      const cleanSlug = String(req.params.slug || '').toLowerCase().trim();
      if (!cleanSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
        return errorResponse(res, 'Invalid business listing URL.', 404);
      }

      const { activeCategorySlugs, suspendedAccountIds } = await getPublicVisibilityFilters();

      const query = {
        slug: cleanSlug,
        verificationStatus: 'VERIFIED',
        publicationStatus: 'PUBLISHED',
        status: { $nin: ['REJECTED', 'SUSPENDED', 'UNPUBLISHED', 'SUBMITTED'] },
        isDemo: { $ne: true },
        categorySlug: { $in: activeCategorySlugs },
      };

      if (suspendedAccountIds.length > 0) {
        query.providerAccountId = { $nin: suspendedAccountIds };
      }

      const providerDoc = await Provider.findOne(query).lean();

      if (!providerDoc) {
        return errorResponse(
          res,
          `Business listing "${cleanSlug}" was not found or is currently unavailable.`,
          404
        );
      }

      // Fetch up to 3 related published listings in the same category or city
      const relatedQuery = {
        _id: { $ne: providerDoc._id },
        verificationStatus: 'VERIFIED',
        publicationStatus: 'PUBLISHED',
        status: { $nin: ['REJECTED', 'SUSPENDED', 'UNPUBLISHED', 'SUBMITTED'] },
        isDemo: { $ne: true },
        categorySlug: { $in: activeCategorySlugs },
        $or: [{ categorySlug: providerDoc.categorySlug }, { city: providerDoc.city }],
      };
      if (suspendedAccountIds.length > 0) {
        relatedQuery.providerAccountId = { $nin: suspendedAccountIds };
      }

      const relatedDocs = await Provider.find(relatedQuery)
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean();

      const dto = toPublicListingDto(providerDoc);
      dto.relatedProviders = relatedDocs.map(toPublicListingDto);

      return successResponse(res, dto);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/providers/:slug/contact
   * Protected direct owner contact reveal endpoint.
   * Checks published eligibility, active category, active owner account, and display consent.
   * Never creates an admin enquiry record.
   */
  async revealPublicContact(req, res, next) {
    try {
      const slug = String(req.params.slug || '').toLowerCase().trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return errorResponse(res, 'Invalid business listing.', 400);
      }

      const { activeCategorySlugs, suspendedAccountIds } = await getPublicVisibilityFilters();

      const query = {
        slug,
        verificationStatus: 'VERIFIED',
        publicationStatus: 'PUBLISHED',
        status: { $nin: ['REJECTED', 'SUSPENDED', 'UNPUBLISHED', 'SUBMITTED'] },
        isDemo: { $ne: true },
        consentToDisplayPhone: true,
        categorySlug: { $in: activeCategorySlugs },
      };

      if (suspendedAccountIds.length > 0) {
        query.providerAccountId = { $nin: suspendedAccountIds };
      }

      const provider = await Provider.findOne(query)
        .select('businessName contactNumber city state')
        .lean();

      if (!provider || !provider.contactNumber || !/^[6-9]\d{9}$/.test(provider.contactNumber)) {
        return errorResponse(
          res,
          'Direct phone contact is not available for this business listing.',
          404
        );
      }

      return successResponse(res, {
        businessName: provider.businessName,
        contactNumber: provider.contactNumber,
        telUri: `tel:+91${provider.contactNumber}`,
        location: [provider.city, provider.state].filter(Boolean).join(', '),
      });
    } catch (err) {
      next(err);
    }
  },
};

export default providerController;
