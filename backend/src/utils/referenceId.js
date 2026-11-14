import crypto from 'crypto';

/**
 * Generates an uppercase collision-resistant alphanumeric reference ID
 * Uses 4 random bytes = 8 hexadecimal characters.
 * E.g., KNV-ENQ-A7C92F10, KNV-PTR-4B8Y1F22
 * Note: While 8 hex characters (32 bits = ~4.29 billion combinations) dramatically reduce collisions,
 * absolute uniqueness at database level is guaranteed by unique indexing and application-level retry handling.
 */
export function generateReferenceId(type = 'enquiry') {
  let prefix = 'KNV-ENQ';
  if (type === 'partner') prefix = 'KNV-PTR';
  if (type === 'contact') prefix = 'KNV-CNT';
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
}

/**
 * Basic string sanitization to prevent XSS / malicious inputs
 */
export function sanitizeString(val) {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/[<>]/g, '') // remove HTML tags
    .slice(0, 2000); // safety length cap
}
