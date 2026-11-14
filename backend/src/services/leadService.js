import Lead from '../models/Lead.js';
import { generateReferenceId } from '../utils/referenceId.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Custom operational error to signal service unavailability (HTTP 503)
 */
export class ServiceUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServiceUnavailableError';
    this.statusCode = 503;
  }
}

export const leadService = {
  /**
   * Persist partner listing application with collision retry (up to 3 attempts on E11000 referenceId)
   */
  async _persistWithRetry(leadData) {
    let attempts = 0;
    const maxAttempts = 3;
    let currentReferenceId = leadData.referenceId || generateReferenceId('partner');

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const lead = new Lead({
          ...leadData,
          type: 'partner',
          referenceId: currentReferenceId,
        });
        const savedLead = await lead.save();
        logger.info('Partner application persisted to MongoDB', {
          referenceId: savedLead.referenceId,
          attempt: attempts,
        });
        return savedLead;
      } catch (err) {
        const isDuplicateRef =
          err.code === 11000 &&
          (err.keyPattern?.referenceId || (err.message && err.message.includes('referenceId')));

        if (isDuplicateRef && attempts < maxAttempts) {
          currentReferenceId = generateReferenceId('partner');
          continue;
        }

        logger.error('MongoDB application persistence failed', {
          error: err.message,
          code: err.code,
          referenceId: currentReferenceId,
          attempts,
        });
        throw err;
      }
    }
  },

  /**
   * Save partner listing application.
   * Strictly requires active MongoDB connection (no fake in-memory stubs).
   */
  async createPartnerLead(data) {
    if (mongoose.connection.readyState !== 1) {
      throw new ServiceUnavailableError(
        'Partner onboarding service is temporarily unavailable. Please try again shortly.'
      );
    }

    const initialReferenceId = generateReferenceId('partner');
    const leadData = {
      businessName: data.businessName,
      contactPerson: data.contactPerson,
      name: data.contactPerson,
      phone: data.phone,
      email: data.email || '',
      categoryId: data.categoryId || null,
      category: data.category,
      categorySlug: data.categorySlug || '',
      customCategoryName: data.customCategoryName || '',
      businessDescription: data.businessDescription,
      servicesOffered: data.servicesOffered || [],
      serviceAreas: data.serviceAreas || [],
      address: data.address || '',
      city: data.city,
      location: data.location || '',
      state: data.state || '',
      pinCode: data.pinCode || '',
      website: data.website || '',
      providerAccountId: data.providerAccountId,
      shopImage: data.shopImage || {},
      consentToContact: true,
      consentToDisplayPhone: data.consentToDisplayPhone !== false,
      consentPolicyVersion: '2026.1',
      consentTimestamp: new Date(),
      referenceId: initialReferenceId,
      type: 'partner',
      status: 'SUBMITTED',
    };

    return await this._persistWithRetry(leadData);
  },
};

export default leadService;
