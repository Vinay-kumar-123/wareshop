export const validators = {
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required.`;
    }
    return null;
  },

  phone: (value) => {
    if (!value) return 'Mobile number is required.';
    const cleaned = value.replace(/\s|-/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }
    return null;
  },

  email: (value, isRequired = false) => {
    if (!value) {
      return isRequired ? 'Email address is required.' : null;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return 'Enter a valid email address.';
    }
    return null;
  },

  minLength: (min, fieldName = 'Field') => (value) => {
    if (!value || value.trim().length < min) {
      return `${fieldName} must be at least ${min} characters.`;
    }
    return null;
  },

  postalCode: (value) => {
    if (!value) return null;
    if (!/^\d{6}$/.test(value.trim())) {
      return 'Enter a valid 6-digit Indian PIN code.';
    }
    return null;
  },
};

export function validateField(value, rules = []) {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}
