import { errorResponse } from '../utils/apiResponse.js';
import { sanitizeString } from '../utils/referenceId.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PIN_REGEX = /^\d{6}$/;
const CUSTOM_CATEGORY_REGEX = /^[a-zA-Z0-9 &/-]{3,80}$/;

export const FORBIDDEN_SERVER_FIELDS = new Set([
  '_id',
  '__v',
  'id',
  'type',
  'status',
  'referenceId',
  'shopImage',
  'gallery',
  'assignedProviderId',
  'linkedListingId',
  'verificationStatus',
  'publicationStatus',
  'rejectionReason',
  'suspensionReason',
  'rejectedAt',
  'approvedAt',
  'publishedAt',
  'reviewedBy',
  'verifiedAt',
  'googleSheetsSynced',
  'googleSheetsSyncedAt',
  'metadata',
  'isDemo',
  'role',
  'createdAt',
  'updatedAt',
  'consentTimestamp',
  'consentPolicyVersion',
]);

export const PARTNER_ALLOWED_FIELDS = new Set([
  'businessName',
  'contactPerson',
  'providerName',
  'name',
  'phone',
  'email',
  'category',
  'customCategoryName',
  'servicesOffered',
  'services',
  'city',
  'location',
  'serviceAreas',
  'address',
  'state',
  'pinCode',
  'website',
  'businessDescription',
  'description',
  'consentToContact',
  'consentToDisplayPhone',
  'providerAccountId',
]);

function parseStringList(input, maxItems = 20, maxItemLength = 80) {
  let items = [];
  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === 'string') {
    items = input.split(',');
  }
  return items
    .map((item) => sanitizeString(String(item || '')).slice(0, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeWebsite(rawWebsite) {
  if (!rawWebsite || typeof rawWebsite !== 'string') return '';
  const trimmed = sanitizeString(rawWebsite).slice(0, 250);
  if (!trimmed) return '';
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

export function buildPartnerLeadDto(raw = {}, authenticatedPhone = '') {
  const businessName = typeof raw.businessName === 'string' ? sanitizeString(raw.businessName).slice(0, 120) : '';
  const contactPerson =
    typeof raw.contactPerson === 'string'
      ? sanitizeString(raw.contactPerson).slice(0, 100)
      : typeof raw.providerName === 'string'
      ? sanitizeString(raw.providerName).slice(0, 100)
      : '';
  const rawPhone = raw.phone !== undefined ? String(raw.phone).replace(/\D/g, '') : authenticatedPhone;
  const email = typeof raw.email === 'string' ? sanitizeString(raw.email).toLowerCase().slice(0, 120) : '';
  const category = typeof raw.category === 'string' ? sanitizeString(raw.category).slice(0, 80) : '';
  const isOtherCategory = category.toLowerCase() === 'other';
  const customCategoryName =
    typeof raw.customCategoryName === 'string' ? sanitizeString(raw.customCategoryName).slice(0, 80) : '';
  const cleanServices = parseStringList(raw.servicesOffered ?? raw.services, 20, 80);
  const city = typeof raw.city === 'string' ? sanitizeString(raw.city).slice(0, 80) : '';
  const descriptionRaw =
    typeof raw.businessDescription === 'string'
      ? raw.businessDescription
      : typeof raw.description === 'string'
      ? raw.description
      : '';
  const businessDescription = sanitizeString(descriptionRaw).slice(0, 2000);
  const pinCode =
    typeof raw.pinCode === 'string' || typeof raw.pinCode === 'number'
      ? String(raw.pinCode).trim()
      : '';
  const website = sanitizeWebsite(raw.website);
  const cleanAreas = parseStringList(raw.serviceAreas, 20, 80);
  const address = typeof raw.address === 'string' ? sanitizeString(raw.address).slice(0, 300) : '';
  const state = typeof raw.state === 'string' ? sanitizeString(raw.state).slice(0, 80) : '';
  const location = typeof raw.location === 'string' ? sanitizeString(raw.location).slice(0, 120) : '';
  const consentToDisplayPhone =
    raw.consentToDisplayPhone === false || raw.consentToDisplayPhone === 'false' ? false : true;

  return {
    businessName,
    contactPerson,
    name: contactPerson,
    phone: authenticatedPhone || rawPhone,
    email,
    category,
    customCategoryName: isOtherCategory ? customCategoryName : '',
    servicesOffered: cleanServices,
    city,
    location,
    serviceAreas: cleanAreas.length > 0 ? cleanAreas : city ? [city] : [],
    address,
    state,
    pinCode,
    website,
    businessDescription,
    consentToContact: true,
    consentToDisplayPhone,
    consentPolicyVersion: '2026.1',
    consentTimestamp: new Date(),
  };
}

/**
 * Validates and constructs an explicit allow-listed DTO for provider listing submissions/updates.
 * Prevents mass assignment (SEC-04) by rejecting forbidden/unexpected body properties.
 */
export const validatePartner = (req, res, next) => {
  const raw = req.body || {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return errorResponse(res, 'Invalid request payload.', 400);
  }

  for (const key of Object.keys(raw)) {
    const baseKey = key.split('[')[0].split('.')[0];
    if (FORBIDDEN_SERVER_FIELDS.has(key) || FORBIDDEN_SERVER_FIELDS.has(baseKey)) {
      return errorResponse(
        res,
        `Field "${baseKey}" is server-controlled and cannot be supplied by the client.`,
        400,
        [{ field: baseKey, message: `Field "${baseKey}" is not permitted.` }]
      );
    }
    if (!PARTNER_ALLOWED_FIELDS.has(key) && !PARTNER_ALLOWED_FIELDS.has(baseKey)) {
      return errorResponse(
        res,
        `Unknown field "${baseKey}" is not permitted.`,
        400,
        [{ field: baseKey, message: `Unknown field "${baseKey}" is not permitted.` }]
      );
    }
  }

  const errors = [];

  const businessName = typeof raw.businessName === 'string' ? sanitizeString(raw.businessName) : '';
  if (!businessName || businessName.length < 2 || businessName.length > 120) {
    errors.push({
      field: 'businessName',
      message: 'Business or property name is required (2–120 characters)',
    });
  }

  const contactPerson =
    typeof raw.contactPerson === 'string'
      ? sanitizeString(raw.contactPerson)
      : typeof raw.providerName === 'string'
      ? sanitizeString(raw.providerName)
      : '';
  if (!contactPerson || contactPerson.length < 2 || contactPerson.length > 100) {
    errors.push({
      field: 'contactPerson',
      message: 'Contact person name is required (2–100 characters)',
    });
  }

  // Business mobile number: locked when phoneVerified on account, otherwise validated as 10-digit Indian mobile
  const authenticatedPhone = req.providerAccount?.phone || '';
  const isPhoneVerified = Boolean(req.providerAccount?.phoneVerified);
  const rawPhone = raw.phone !== undefined ? String(raw.phone).replace(/\D/g, '') : authenticatedPhone;

  if (!rawPhone || !PHONE_REGEX.test(rawPhone)) {
    errors.push({
      field: 'phone',
      message: 'A valid 10-digit Indian mobile number is required',
    });
  } else if (isPhoneVerified && authenticatedPhone && rawPhone !== authenticatedPhone) {
    errors.push({
      field: 'phone',
      message: 'Contact number must match your OTP-verified mobile number',
    });
  }

  // Email defaults to authenticated provider's verified email when omitted, validated when provided
  const rawEmail =
    raw.email !== undefined
      ? sanitizeString(String(raw.email || '')).toLowerCase()
      : (req.providerAccount?.email || '').toLowerCase();
  const email = rawEmail;
  if (email && (!EMAIL_REGEX.test(email) || email.length > 254)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address or leave blank',
    });
  }

  const category = typeof raw.category === 'string' ? sanitizeString(raw.category).slice(0, 80) : '';
  if (!category) {
    errors.push({
      field: 'category',
      message: 'Primary commercial category is required',
    });
  }

  const isOtherCategory = category.toLowerCase() === 'other';
  const customCategoryName =
    typeof raw.customCategoryName === 'string' ? sanitizeString(raw.customCategoryName) : '';
  if (isOtherCategory && (!customCategoryName || !CUSTOM_CATEGORY_REGEX.test(customCategoryName))) {
    errors.push({
      field: 'customCategoryName',
      message: 'Enter a valid custom category name (3–80 characters)',
    });
  }

  const cleanServices = parseStringList(raw.servicesOffered ?? raw.services, 20, 80);
  if (cleanServices.length === 0) {
    errors.push({
      field: 'servicesOffered',
      message: 'Please specify at least one service or facility feature',
    });
  }

  const city = typeof raw.city === 'string' ? sanitizeString(raw.city).slice(0, 80) : '';
  if (!city || city.length < 2) {
    errors.push({
      field: 'city',
      message: 'City is required',
    });
  }

  const descriptionRaw =
    typeof raw.businessDescription === 'string'
      ? raw.businessDescription
      : typeof raw.description === 'string'
      ? raw.description
      : '';
  const businessDescription = sanitizeString(descriptionRaw).slice(0, 2000);
  if (!businessDescription || businessDescription.length < 15) {
    errors.push({
      field: 'businessDescription',
      message: 'Please provide a description of at least 15 characters',
    });
  }

  const pinCode = typeof raw.pinCode === 'string' || typeof raw.pinCode === 'number'
    ? String(raw.pinCode).trim()
    : '';
  if (pinCode && !PIN_REGEX.test(pinCode)) {
    errors.push({
      field: 'pinCode',
      message: 'PIN code must be a valid 6-digit Indian postal code',
    });
  }

  const website = sanitizeWebsite(raw.website);
  if (raw.website && typeof raw.website === 'string' && raw.website.trim() && !website) {
    errors.push({
      field: 'website',
      message: 'Invalid website URL format',
    });
  }

  if (raw.consentToContact === false || raw.consentToContact === 'false') {
    errors.push({
      field: 'consentToContact',
      message: 'Consent for listing verification is required',
    });
  }

  if (errors.length > 0) {
    return errorResponse(
      res,
      errors[0].message || 'Validation failed. Please verify listing fields.',
      400,
      errors
    );
  }

  const cleanAreas = parseStringList(raw.serviceAreas, 20, 80);
  const address = typeof raw.address === 'string' ? sanitizeString(raw.address).slice(0, 300) : '';
  const state = typeof raw.state === 'string' ? sanitizeString(raw.state).slice(0, 80) : '';
  const location = typeof raw.location === 'string' ? sanitizeString(raw.location).slice(0, 120) : '';

  const consentToDisplayPhone =
    raw.consentToDisplayPhone === false || raw.consentToDisplayPhone === 'false' ? false : true;

  // Replace req.body with explicit allow-listed DTO (zero spread of raw req.body!)
  const dto = {
    businessName,
    contactPerson,
    name: contactPerson,
    phone: isPhoneVerified ? authenticatedPhone : rawPhone || authenticatedPhone,
    email,
    category,
    customCategoryName: isOtherCategory ? customCategoryName : '',
    servicesOffered: cleanServices,
    city,
    location,
    serviceAreas: cleanAreas.length > 0 ? cleanAreas : [city],
    address,
    state,
    pinCode,
    website,
    businessDescription,
    consentToContact: true,
    consentToDisplayPhone,
    consentPolicyVersion: '2026.1',
    consentTimestamp: new Date(),
  };

  req.validatedPartnerDto = dto;
  req.body = dto;
  next();
};

export default { validatePartner };
