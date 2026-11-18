import api, { setProviderToken, clearProviderToken } from './api.js';

/**
 * Provider Portal & Listing Submission Service Layer
 * Handles Email OTP authentication, provider session management, and listing lifecycle for business owners.
 */
export const leadService = {
  async sendOtp(email) {
    return api.post('/provider-auth/otp/send', { email });
  },

  async verifyOtp(email, otp) {
    return api.post('/provider-auth/otp/verify', { email, otp });
  },

  async registerOrLogin({ email, verificationToken, phone, name }) {
    const res = await api.post('/provider-auth/register', {
      email,
      verificationToken,
      phone,
      name,
    });
    const issuedToken = res?.data?.providerToken || res?.data?.token;
    if (res?.success && issuedToken) {
      setProviderToken(issuedToken);
    }
    return res;
  },

  async getProviderMe() {
    return api.get('/provider-auth/me');
  },

  async updateProviderProfile(payload) {
    return api.put('/provider-auth/profile', payload);
  },

  async logoutProvider() {
    try {
      await api.post('/provider-auth/logout', {});
    } finally {
      clearProviderToken();
    }
  },

  async getDashboard() {
    return api.get('/provider-portal/dashboard');
  },

  async getOwnListings() {
    return api.get('/provider-portal/listings');
  },

  async getOwnListingById(id) {
    return api.get(`/provider-portal/listings/${encodeURIComponent(id)}`);
  },

  async submitPartnerEnquiry(payload) {
    return api.post('/leads/partner', payload);
  },

  async submitListing(payload) {
    return api.post('/provider-portal/listings', payload);
  },

  async updateOwnListing(id, payload) {
    return api.put(`/provider-portal/listings/${encodeURIComponent(id)}`, payload);
  },
};

export default leadService;
