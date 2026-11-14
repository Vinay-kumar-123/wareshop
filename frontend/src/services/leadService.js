import api from './api.js';

/**
 * Lead Service Layer
 * Captures customer enquiries and partner onboarding submissions via backend Express API.
 * Managed directly through the KONNEVIA operational Admin Panel.
 */
export const leadService = {
  async submitEnquiry(payload) {
    return api.post('/leads/enquiry', payload);
  },

  async submitPartnerEnquiry(payload) {
    return api.post('/leads/partner', payload);
  },

  async submitContactMessage(payload) {
    return api.post('/leads/contact', payload);
  },
};

export default leadService;
