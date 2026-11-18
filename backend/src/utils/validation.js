const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalizes an email address by trimming surrounding whitespace and converting to lowercase.
 * Rejects strings containing CR/LF control characters to prevent header injection.
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  if (/[\r\n\0]/.test(value)) return '';
  return value.trim().toLowerCase();
}

/**
 * Validates whether a value is a well-formed email address.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isValidEmail(value) {
  const normalized = normalizeEmail(value);
  if (!normalized || normalized.length > 254) return false;
  if (normalized.includes('..')) return false;
  return EMAIL_REGEX.test(normalized);
}

/**
 * Masks an email address for safe API responses and UI notices.
 *
 * @param {string} value
 * @returns {string}
 */
export function maskEmail(value) {
  const normalized = normalizeEmail(value);
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0) return '';
  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Normalizes Indian mobile numbers by stripping non-digit characters and
 * leading Indian country/trunk prefixes (+91, 91, or leading 0 for 11 digits).
 *
 * @param {string|number} value
 * @returns {string}
 */
export function normalizeIndianPhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const digits = String(value).replace(/\D/g, '').trim();
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Validates whether the normalized mobile number is a valid 10-digit Indian mobile number.
 *
 * @param {string|number} phone
 * @returns {boolean}
 */
export function isValidIndianMobile(phone) {
  const normalized = normalizeIndianPhone(phone);
  return INDIAN_MOBILE_REGEX.test(normalized);
}

export default {
  normalizeEmail,
  isValidEmail,
  maskEmail,
  normalizeIndianPhone,
  isValidIndianMobile,
};
