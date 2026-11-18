import mongoose from 'mongoose';
import crypto from 'crypto';

const providerAccountSchema = new mongoose.Schema(
  {
    // Business mobile number (10-digit Indian mobile). Optional at registration so Email OTP
    // accounts can exist before a phone is provided; never populated with an email address.
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'],
      default: undefined,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: '',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ['PROVIDER'],
      default: 'PROVIDER',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    // Preserved for backward compatibility with existing records
    verifiedAt: {
      type: Date,
      default: null,
    },
    sessionTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    sessionExpiresAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique phone index for non-empty phones without breaking accounts created without a phone yet
providerAccountSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $type: 'string', $gt: '' } },
  }
);

// Unique email index scoped to email-verified provider accounts for safe backward compatibility
providerAccountSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { emailVerified: true },
  }
);

providerAccountSchema.statics.hashSessionToken = function (token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const ProviderAccount = mongoose.model('ProviderAccount', providerAccountSchema);
export default ProviderAccount;
