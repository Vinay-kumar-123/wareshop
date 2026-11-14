import { errorResponse } from '../utils/apiResponse.js';
import { sanitizeString } from '../utils/referenceId.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/; // Standard 10-digit Indian mobile number

export const validateEnquiry = (req, res, next) => {
  const {
    name,
    phone,
    email,
    category,
    service,
    city,
    location,
    address,
    state,
    pinCode,
    requirements,
    estimatedBudget,
    expectedTimeline,
    consentToContact,
    consentProviderSharing,
  } = req.body;

  const errors = [];

  // Required: Name
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push({ field: 'name', message: 'Full name is required' });
  }

  // Required: Phone (10 digits Indian format)
  const phoneDigits = phone ? String(phone).replace(/\D/g, '') : '';
  if (!phone || !phoneRegex.test(phoneDigits)) {
    errors.push({ field: 'phone', message: 'A valid 10-digit Indian mobile number is required' });
  }

  // Optional: Email
  if (email && !emailRegex.test(String(email).trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address or leave blank' });
  }

  // Required: Category
  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.push({ field: 'category', message: 'Please select a service category' });
  }

  // Required: Service
  if (!service || typeof service !== 'string' || !service.trim()) {
    errors.push({ field: 'service', message: 'Please select or specify a service' });
  }

  // Required: City
  if (!city || typeof city !== 'string' || !city.trim()) {
    errors.push({ field: 'city', message: 'City is required' });
  }

  // Required: Requirements description
  if (!requirements || typeof requirements !== 'string' || requirements.trim().length < 10) {
    errors.push({
      field: 'requirements',
      message: 'Please describe your project requirements (at least 10 characters)',
    });
  }

  // Optional: PIN Code (6 digits)
  if (pinCode) {
    const cleanPin = String(pinCode).trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      errors.push({ field: 'pinCode', message: 'PIN code must be exactly 6 digits' });
    }
  }

  // Mandatory: Explicit Consent to be contacted (support boolean or string 'true')
  const isConsentContact = consentToContact === true || consentToContact === 'true';
  if (!isConsentContact) {
    errors.push({
      field: 'consentToContact',
      message: 'Explicit consent to be contacted regarding this enquiry is required',
    });
  }
  // Mandatory: Explicit Consent for Provider Sharing
  const isConsentSharing = consentProviderSharing === true || consentProviderSharing === 'true';
  if (!isConsentSharing) {
    errors.push({
      field: 'consentProviderSharing',
      message: 'Consent to share project scope with relevant vetted providers is required',
    });
  }

  if (errors.length > 0) {
    return errorResponse(res, 'Validation failed. Please verify required fields.', 400, errors);
  }

  // Sanitize and normalize inputs
  req.body = {
    name: sanitizeString(name),
    phone: phoneDigits,
    email: email ? sanitizeString(email).toLowerCase() : '',
    category: sanitizeString(category),
    service: sanitizeString(service),
    city: sanitizeString(city),
    location: sanitizeString(location),
    address: sanitizeString(address),
    state: sanitizeString(state),
    pinCode: sanitizeString(pinCode),
    requirements: sanitizeString(requirements),
    estimatedBudget: sanitizeString(estimatedBudget),
    expectedTimeline: sanitizeString(expectedTimeline),
    consentToContact: true,
    consentProviderSharing: true,
    consentPolicyVersion: '2026.1',
    consentTimestamp: new Date(),
  };

  next();
};

export const validatePartner = (req, res, next) => {
  const {
    businessName,
    contactPerson,
    phone,
    email,
    category,
    servicesOffered,
    city,
    serviceAreas,
    address,
    state,
    pinCode,
    website,
    businessDescription,
    consentToContact,
    consentToDisplayPhone,
  } = req.body;

  const errors = [];

  // Required: Business Name
  if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
    errors.push({ field: 'businessName', message: 'Business or trade name is required' });
  }

  // Required: Contact Person
  if (!contactPerson || typeof contactPerson !== 'string' || !contactPerson.trim()) {
    errors.push({ field: 'contactPerson', message: 'Contact person name is required' });
  }

  // Required: Phone
  const phoneDigits = phone ? String(phone).replace(/\D/g, '') : '';
  if (!phone || !phoneRegex.test(phoneDigits)) {
    errors.push({ field: 'phone', message: 'A valid 10-digit Indian mobile number is required' });
  }

  // Required: Email
  if (!email || !emailRegex.test(String(email).trim())) {
    errors.push({
      field: 'email',
      message: 'A valid email address is required for partner correspondence',
    });
  }

  // Required: Primary Category
  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.push({ field: 'category', message: 'Primary category vertical is required' });
  }
  if (String(category || '').toLowerCase() === 'other' && (!req.body.customCategoryName || !/^[a-zA-Z0-9 &-]{3,80}$/.test(String(req.body.customCategoryName).trim()))) {
    errors.push({ field: 'customCategoryName', message: 'Enter a valid custom category name (3–80 characters)' });
  }

  // Required: Services Offered (array or comma string)
  let cleanServices = [];
  if (Array.isArray(servicesOffered)) {
    cleanServices = servicesOffered.map((s) => sanitizeString(s)).filter(Boolean);
  } else if (typeof servicesOffered === 'string') {
    cleanServices = servicesOffered.split(',').map((s) => sanitizeString(s)).filter(Boolean);
  }
  if (cleanServices.length === 0) {
    errors.push({
      field: 'servicesOffered',
      message: 'Please specify at least one service offered',
    });
  }

  // Required: City
  if (!city || typeof city !== 'string' || !city.trim()) {
    errors.push({ field: 'city', message: 'Operating city is required' });
  }

  // Required: Business Description
  if (
    !businessDescription ||
    typeof businessDescription !== 'string' ||
    businessDescription.trim().length < 15
  ) {
    errors.push({
      field: 'businessDescription',
      message: 'Please provide a business description (at least 15 characters)',
    });
  }

  // Required: Consent to be contacted (support boolean or 'true')
  const isConsentContact = consentToContact === true || consentToContact === 'true';
  if (!isConsentContact) {
    errors.push({
      field: 'consentToContact',
      message: 'Consent to be contacted for verification is required',
    });
  }

  if (errors.length > 0) {
    return errorResponse(
      res,
      'Validation failed. Please verify partner application fields.',
      400,
      errors
    );
  }

  // Parse serviceAreas
  let cleanAreas = [];
  if (Array.isArray(serviceAreas)) {
    cleanAreas = serviceAreas.map((a) => sanitizeString(a)).filter(Boolean);
  } else if (typeof serviceAreas === 'string') {
    cleanAreas = serviceAreas.split(',').map((a) => sanitizeString(a)).filter(Boolean);
  }

  req.body = {
    ...req.body,
    businessName: sanitizeString(businessName),
    contactPerson: sanitizeString(contactPerson),
    name: sanitizeString(contactPerson),
    phone: phoneDigits,
    email: sanitizeString(email).toLowerCase(),
    category: sanitizeString(category),
    servicesOffered: cleanServices,
    city: sanitizeString(city),
    serviceAreas: cleanAreas,
    address: sanitizeString(address),
    state: sanitizeString(state),
    pinCode: sanitizeString(pinCode),
    website: website ? sanitizeString(website) : '',
    businessDescription: sanitizeString(businessDescription),
    consentToContact: true,
    consentToDisplayPhone: consentToDisplayPhone === false || consentToDisplayPhone === 'false' ? false : true,
    consentPolicyVersion: '2026.1',
    consentTimestamp: new Date(),
  };

  next();
};

export const validateContact = (req, res, next) => {
  const { name, phone, email, subject, message, consentToContact } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  const phoneDigits = phone ? String(phone).replace(/\D/g, '') : '';
  if (!phone || !phoneRegex.test(phoneDigits)) {
    errors.push({ field: 'phone', message: 'A valid 10-digit Indian mobile number is required' });
  }

  if (!email || !emailRegex.test(String(email).trim())) {
    errors.push({ field: 'email', message: 'A valid email is required' });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.push({ field: 'message', message: 'Message must be at least 10 characters long' });
  }

  const isConsent = consentToContact === true || consentToContact === 'true';
  if (!isConsent) {
    errors.push({ field: 'consentToContact', message: 'Consent to contact is required' });
  }

  if (errors.length > 0) {
    return errorResponse(res, 'Validation failed. Please verify contact fields.', 400, errors);
  }

  req.body = {
    name: sanitizeString(name),
    phone: phoneDigits,
    email: sanitizeString(email).toLowerCase(),
    category: sanitizeString(subject || 'General Inquiry'),
    requirements: sanitizeString(message),
    city: 'Direct Desk',
    consentToContact: true,
    consentPolicyVersion: '2026.1',
    consentTimestamp: new Date(),
  };

  next();
};

export default { validateEnquiry, validatePartner, validateContact };
