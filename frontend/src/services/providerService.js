import api from './api.js';
import { providers as seedProviders, getProviderBySlug as getSeedProviderBySlug } from '../data/providers.js';

/**
 * Provider Service Layer
 * Queries backend REST endpoints (/api/v1/providers) for live published providers.
 * Seamlessly integrates fallback to development seed providers when database is empty or offline.
 */
export const providerService = {
  async getProviders({ categorySlug = '', location = '', search = '' } = {}) {
    try {
      const params = new URLSearchParams();
      if (categorySlug) params.set('category', categorySlug);
      if (location) params.set('location', location);
      if (search) params.set('search', search);

      const res = await api.get(`/providers?${params.toString()}`);
      if (res && res.success && res.data && res.data.providers && res.data.providers.length > 0) {
        return {
          data: res.data.providers,
          total: res.data.total || res.data.providers.length,
        };
      }
    } catch (err) {
      // Fall through to seed providers if backend is unavailable or returns 0
    }

    // Fallback: Query in-memory seed providers for development preview
    let list = [...seedProviders];

    if (categorySlug) {
      list = list.filter((p) => p.categorySlug === categorySlug);
    }

    if (location) {
      const locLower = location.toLowerCase();
      list = list.filter(
        (p) =>
          p.location.toLowerCase().includes(locLower) ||
          (Array.isArray(p.serviceAreas) && p.serviceAreas.some((area) => area.toLowerCase().includes(locLower)))
      );
    }

    if (search) {
      const qLower = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.businessName.toLowerCase().includes(qLower) ||
          (p.mainService && p.mainService.toLowerCase().includes(qLower)) ||
          (Array.isArray(p.servicesOffered) && p.servicesOffered.some((s) => s.toLowerCase().includes(qLower))) ||
          (Array.isArray(p.services) && p.services.some((s) => s.toLowerCase().includes(qLower)))
      );
    }

    return {
      data: list,
      total: list.length,
    };
  },

  async getProviderBySlug(slug) {
    const cleanSlug = String(slug || '').toLowerCase().trim();

    try {
      const res = await api.get(`/providers/${cleanSlug}`);
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      // Fall through to seed data if not found in MongoDB
    }

    const seed = getSeedProviderBySlug(cleanSlug);
    if (seed) return seed;

    throw new Error(`Provider profile for slug "${cleanSlug}" not found.`);
  },

  async getPublicContact(slug) {
    const cleanSlug = String(slug || '').toLowerCase().trim();
    const res = await api.get(`/providers/${cleanSlug}/contact`);
    return res.data;
  },

  async getProvidersByCategory(categorySlug) {
    const res = await this.getProviders({ categorySlug });
    return res.data || [];
  },
};

export default providerService;
