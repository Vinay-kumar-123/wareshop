import crypto from 'crypto';
import Category from '../models/Category.js';

export const LISTING_STATES = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
});

export const ALLOWED_TRANSITIONS = Object.freeze({
  SUBMITTED: new Set(['APPROVED', 'REJECTED', 'SUSPENDED']),
  APPROVED: new Set(['PUBLISHED', 'UNPUBLISHED', 'REJECTED', 'SUSPENDED', 'SUBMITTED']),
  PUBLISHED: new Set(['UNPUBLISHED', 'SUSPENDED', 'REJECTED', 'SUBMITTED']),
  UNPUBLISHED: new Set(['PUBLISHED', 'APPROVED', 'SUSPENDED', 'REJECTED', 'SUBMITTED']),
  REJECTED: new Set(['SUBMITTED', 'SUSPENDED']),
  SUSPENDED: new Set(['APPROVED', 'UNPUBLISHED', 'REJECTED']),
});

export const DEFAULT_CATEGORIES = [
  {
    name: 'Shop',
    slug: 'shop',
    shortDescription: 'Retail & Showrooms',
    description: 'Retail shops, commercial showrooms and high-street storefronts across India.',
    icon: 'Store',
    imageUrl: '/images/categories/shop.jpg',
    displayOrder: 0,
    status: 'ACTIVE',
  },
  {
    name: 'Office',
    slug: 'office',
    shortDescription: 'Commercial & Co-work',
    description: 'Commercial office spaces, corporate suites and managed coworking hubs.',
    icon: 'Building2',
    imageUrl: '/images/categories/office.jpg',
    displayOrder: 1,
    status: 'ACTIVE',
  },
  {
    name: 'Warehouse',
    slug: 'warehouse',
    shortDescription: 'Logistics & Large Hubs',
    description: 'Large-scale distribution hubs, fulfilment centres and industrial warehousing.',
    icon: 'Warehouse',
    imageUrl: '/images/categories/warehouse.jpg',
    displayOrder: 2,
    status: 'ACTIVE',
  },
  {
    name: 'Godown',
    slug: 'godown',
    shortDescription: 'Storage & Small Depot',
    description: 'Small and medium storage facilities, local depots and inventory godowns.',
    icon: 'Package',
    imageUrl: '/images/categories/godown.jpg',
    displayOrder: 3,
    status: 'ACTIVE',
  },
];

let defaultCategoriesEnsured = false;

export async function ensureDefaultCategories() {
  if (defaultCategoriesEnsured) return;
  const count = await Category.estimatedDocumentCount();
  if (count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await Category.updateOne(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true }
      ).catch(() => {});
    }
  }
  defaultCategoriesEnsured = true;
}

export function resetDefaultCategoriesCache() {
  defaultCategoriesEnsured = false;
}

export function createSlug(text) {
  const base = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

  return base || `listing-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Resolves and validates a category input against the Category collection.
 * Returns { isOther, categoryDoc, categoryName, categorySlug }.
 */
export async function resolveActiveCategory(categoryInput) {
  await ensureDefaultCategories();

  const raw = String(categoryInput || '').trim();
  if (!raw) {
    return { valid: false, message: 'Category is required' };
  }

  if (raw.toLowerCase() === 'other') {
    return {
      valid: true,
      isOther: true,
      categoryDoc: null,
      categoryName: 'Other',
      categorySlug: 'other',
    };
  }

  const slugCandidate = createSlug(raw);
  const escapedName = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const categoryDoc = await Category.findOne({
    $or: [
      { slug: raw.toLowerCase() },
      { slug: slugCandidate },
      { name: new RegExp(`^${escapedName}$`, 'i') },
    ],
  }).lean();

  if (!categoryDoc) {
    return {
      valid: false,
      message: `Category "${raw}" is not a recognized WARESHOP category.`,
    };
  }

  if (categoryDoc.status !== 'ACTIVE') {
    return {
      valid: false,
      message: `Category "${categoryDoc.name}" is currently inactive and not accepting submissions.`,
    };
  }

  return {
    valid: true,
    isOther: false,
    categoryDoc,
    categoryName: categoryDoc.name,
    categorySlug: categoryDoc.slug,
  };
}

/**
 * Derives canonical status from legacy or current provider document fields.
 */
export function normalizeListingStatus(provider) {
  if (!provider) return LISTING_STATES.SUBMITTED;
  if (
    provider.status &&
    Object.values(LISTING_STATES).includes(provider.status)
  ) {
    // Keep in sync if verification/publication status was updated directly
    if (provider.publicationStatus === 'PUBLISHED' && provider.verificationStatus === 'VERIFIED') {
      return LISTING_STATES.PUBLISHED;
    }
    return provider.status;
  }

  if (provider.verificationStatus === 'REVOKED') {
    return provider.suspensionReason ? LISTING_STATES.SUSPENDED : LISTING_STATES.REJECTED;
  }
  if (provider.verificationStatus === 'VERIFIED') {
    return provider.publicationStatus === 'PUBLISHED'
      ? LISTING_STATES.PUBLISHED
      : LISTING_STATES.APPROVED;
  }
  return LISTING_STATES.SUBMITTED;
}

/**
 * Validates and applies a state transition on a Provider listing document.
 */
export function canTransitionListing(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.has(toStatus));
}

export function applyListingState(provider, targetState, options = {}) {
  const currentState = normalizeListingStatus(provider);
  if (currentState !== targetState && !options.force && !canTransitionListing(currentState, targetState)) {
    const err = new Error(
      `Invalid listing status transition from ${currentState} to ${targetState}.`
    );
    err.statusCode = 409;
    throw err;
  }

  provider.status = targetState;

  switch (targetState) {
    case LISTING_STATES.SUBMITTED:
      provider.verificationStatus = 'UNVERIFIED';
      provider.publicationStatus = 'DRAFT';
      provider.rejectionReason = '';
      break;

    case LISTING_STATES.APPROVED:
      provider.verificationStatus = 'VERIFIED';
      provider.publicationStatus = 'DRAFT';
      provider.verifiedAt = provider.verifiedAt || new Date();
      provider.rejectionReason = '';
      provider.suspensionReason = '';
      break;

    case LISTING_STATES.PUBLISHED:
      if (provider.verificationStatus !== 'VERIFIED' && currentState !== LISTING_STATES.APPROVED && currentState !== LISTING_STATES.UNPUBLISHED) {
        const err = new Error('Only approved and verified listings can be published.');
        err.statusCode = 400;
        throw err;
      }
      provider.verificationStatus = 'VERIFIED';
      provider.publicationStatus = 'PUBLISHED';
      provider.publishedAt = provider.publishedAt || new Date();
      break;

    case LISTING_STATES.UNPUBLISHED:
      provider.verificationStatus = 'VERIFIED';
      provider.publicationStatus = 'DRAFT';
      break;

    case LISTING_STATES.REJECTED:
      provider.verificationStatus = 'REVOKED';
      provider.publicationStatus = 'ARCHIVED';
      if (options.reason) {
        provider.rejectionReason = String(options.reason).trim().slice(0, 500);
      }
      break;

    case LISTING_STATES.SUSPENDED:
      provider.verificationStatus = 'REVOKED';
      provider.publicationStatus = 'ARCHIVED';
      if (options.reason) {
        provider.suspensionReason = String(options.reason).trim().slice(0, 500);
      }
      break;

    default:
      break;
  }

  return provider;
}

export default {
  LISTING_STATES,
  ALLOWED_TRANSITIONS,
  DEFAULT_CATEGORIES,
  ensureDefaultCategories,
  resetDefaultCategoriesCache,
  createSlug,
  resolveActiveCategory,
  normalizeListingStatus,
  canTransitionListing,
  applyListingState,
};
