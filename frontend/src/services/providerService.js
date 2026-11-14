import api, { ApiError } from './api.js';

/**
 * Provider Service Layer
 * Queries backend REST endpoints (/api/v1/providers and /api/v1/categories) for live VERIFIED + PUBLISHED listings.
 * Never falls back to fabricated/demo listings when the database is empty or the API is unavailable.
 */
export const providerService = {
  async getProviders({
    categorySlug = '',
    location = '',
    city = '',
    search = '',
    page = 1,
    limit = 12,
  } = {}) {
    const params = new URLSearchParams();
    if (categorySlug && categorySlug !== 'all') params.set('category', categorySlug);
    if (location) params.set('location', location);
    if (city) params.set('city', city);
    if (search) params.set('search', search);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));

    const queryString = params.toString();
    const endpoint = queryString ? `/providers?${queryString}` : '/providers';
    const res = await api.get(endpoint);

    if (!res || !res.success || !Array.isArray(res.data?.providers)) {
      throw new ApiError(
        res?.message || 'Unable to load commercial listings from the server.',
        502,
        res
      );
    }

    const genuineProviders = res.data.providers.filter(
      (provider) => !provider.isDemo && !provider.isDevSample
    );

    return {
      data: genuineProviders,
      total: typeof res.data.total === 'number' ? res.data.total : genuineProviders.length,
      page: res.data.page || Number(page) || 1,
      limit: res.data.limit || Number(limit) || 12,
      totalPages: res.data.totalPages || 1,
    };
  },

  async getProviderBySlug(slug) {
    const cleanSlug = String(slug || '').toLowerCase().trim();
    if (!cleanSlug) {
      throw new ApiError('A valid business listing slug is required.', 400);
    }

    const res = await api.get(`/providers/${encodeURIComponent(cleanSlug)}`);
    if (!res || !res.success || !res.data || res.data.isDemo || res.data.isDevSample) {
      throw new ApiError(
        res?.message || `Business profile for "${cleanSlug}" was not found.`,
        404
      );
    }

    return res.data;
  },

  async getPublicContact(slug) {
    const cleanSlug = String(slug || '').toLowerCase().trim();
    const res = await api.get(`/providers/${encodeURIComponent(cleanSlug)}/contact`);
    return res.data;
  },

  async getProvidersByCategory(categorySlug, options = {}) {
    const res = await this.getProviders({ categorySlug, ...options });
    return res.data || [];
  },

  async getPublicCategories() {
    const res = await api.get('/categories');
    if (res && res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },
};

export default providerService;
