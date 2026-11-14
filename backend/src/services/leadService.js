import Lead from '../models/Lead.js';
import { generateReferenceId } from '../utils/referenceId.js';
import env from '../config/env.js';
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
   * Helper to persist lead with MongoDB collision retry (up to 3 total attempts for E11000 duplicate key error)
   */
  async _persistWithRetry(leadData, type) {
    let attempts = 0;
    const maxAttempts = 3;
    let currentReferenceId = leadData.referenceId || generateReferenceId(type);

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const lead = new Lead({
          ...leadData,
          referenceId: currentReferenceId,
        });
        const savedLead = await lead.save();
        logger.info(`${type === 'partner' ? 'Partner' : 'Enquiry'} persisted to MongoDB`, {
          referenceId: savedLead.referenceId,
          attempt: attempts,
        });
        return savedLead;
      } catch (err) {
        // Check specifically for MongoDB duplicate key error code 11000 on referenceId
        const isDuplicateKey =
          err.code === 11000 &&
          (err.keyPattern?.referenceId || (err.message && err.message.includes('referenceId')));

        if (isDuplicateKey && attempts < maxAttempts) {
          logger.warn(`Reference ID collision detected for ${currentReferenceId}. Retrying with fresh ID (attempt ${attempts + 1}/${maxAttempts})...`);
          currentReferenceId = generateReferenceId(type);
          continue;
        }

        // For all other errors, or if attempts exhausted, rethrow
        logger.error(`MongoDB persistence failed permanently`, {
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
   * Save customer quote enquiry
   */
  async createEnquiry(data) {
    const isDbConnected = mongoose.connection.readyState === 1;

    // P0 — 1. Eliminate Production In-Memory Fallback
    // In production, MongoDB is the sole source of truth. If down, fail-closed with 503.
    if (!isDbConnected) {
      if (env.isProduction) {
        logger.error('CRITICAL: Primary MongoDB unavailable during production enquiry request. Refusing in-memory fallback.');
        throw new ServiceUnavailableError('Our booking services are temporarily undergoing maintenance. Please try again in a few moments.');
      }

      // Explicit development/test in-memory fallback only
      if (env.isDevelopment || env.isTest) {
        const devRefId = generateReferenceId('enquiry');
        logger.warn('Running in development mode without active MongoDB. Using dev in-memory stub.', { referenceId: devRefId });
        return {
          ...data,
          referenceId: devRefId,
          type: 'enquiry',
          status: 'new',
          _id: 'dev-inmem-' + Date.now(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Ambiguous environment: fail closed
      logger.error('CRITICAL: MongoDB disconnected and environment is ambiguous. Refusing request.');
      throw new ServiceUnavailableError('Service temporarily unavailable.');
    }

    // P0 — 3. Persist with 3-attempt duplicate-key retry
    const initialReferenceId = generateReferenceId('enquiry');
    const leadData = {
      ...data,
      referenceId: initialReferenceId,
      type: 'enquiry',
      status: 'new',
    };

    let savedLead;
    try {
      savedLead = await this._persistWithRetry(leadData, 'enquiry');
    } catch (saveError) {
      throw new Error('Database persistence failed. Please try again.');
    }

    return savedLead;
  },

  /**
   * Save partner registration lead
   */
  async createPartnerLead(data) {
    const isDbConnected = mongoose.connection.readyState === 1;

    // P0 — 1. Eliminate Production In-Memory Fallback
    if (!isDbConnected) {
      if (env.isProduction) {
        logger.error('CRITICAL: Primary MongoDB unavailable during production partner application. Refusing in-memory fallback.');
        throw new ServiceUnavailableError('Partner onboarding service is temporarily unavailable. Please try again shortly.');
      }

      if (env.isDevelopment || env.isTest) {
        const devRefId = generateReferenceId('partner');
        logger.warn('Running in development mode without active MongoDB. Using dev in-memory stub.', { referenceId: devRefId });
        return {
          ...data,
          referenceId: devRefId,
          type: 'partner',
          status: 'new',
          _id: 'dev-inmem-' + Date.now(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      logger.error('CRITICAL: MongoDB disconnected and environment is ambiguous. Refusing request.');
      throw new ServiceUnavailableError('Service temporarily unavailable.');
    }

    // P0 — 3. Persist with 3-attempt duplicate-key retry
    const initialReferenceId = generateReferenceId('partner');
    const leadData = {
      ...data,
      referenceId: initialReferenceId,
      type: 'partner',
      status: 'new',
    };

    let savedLead;
    try {
      savedLead = await this._persistWithRetry(leadData, 'partner');
    } catch (saveError) {
      throw new Error('Database persistence failed. Please try again.');
    }

    return savedLead;
  },
  /**
   * Save general contact desk message
   */
  async createContactLead(data) {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      if (env.isProduction) {
        logger.error('CRITICAL: Primary MongoDB unavailable during production contact message. Refusing in-memory fallback.');
        throw new ServiceUnavailableError('Our communication desk is temporarily undergoing maintenance. Please reach out via email or try again shortly.');
      }

      if (env.isDevelopment || env.isTest) {
        const devRefId = generateReferenceId('contact');
        logger.warn('Running in development mode without active MongoDB. Using dev in-memory stub.', { referenceId: devRefId });
        return {
          ...data,
          referenceId: devRefId,
          type: 'contact',
          status: 'new',
          _id: 'dev-inmem-' + Date.now(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      logger.error('CRITICAL: MongoDB disconnected and environment is ambiguous. Refusing request.');
      throw new ServiceUnavailableError('Service temporarily unavailable.');
    }

    const initialReferenceId = generateReferenceId('contact');
    const leadData = {
      ...data,
      referenceId: initialReferenceId,
      type: 'contact',
      status: 'new',
    };

    let savedLead;
    try {
      savedLead = await this._persistWithRetry(leadData, 'contact');
    } catch (saveError) {
      throw new Error('Database persistence failed. Please try again.');
    }

    return savedLead;
  },
};

export default leadService;
