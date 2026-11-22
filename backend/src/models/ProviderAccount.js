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
    googleId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: undefined,
    },
    authProvider: {
      type: String,
      enum: ['EMAIL_OTP', 'GOOGLE', 'BOTH'],
      default: 'EMAIL_OTP',
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

// Unique Google subject identifier index for accounts linked with Google Sign-In
providerAccountSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: 'string', $gt: '' } },
  }
);

providerAccountSchema.statics.hashSessionToken = function (token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

function hasPartialStringGtEmpty(expr, field) {
  const f = expr?.[field];
  return Boolean(f && f.$type === 'string' && f.$gt === '');
}

/**
 * Read-only diagnostic that verifies MongoDB indexes on `provideraccounts` match the
 * partial-unique constraints defined in this schema (notably `phone_1`, which in legacy
 * deployments could be a non-partial unique index causing E11000 on `phone: null`).
 */
export async function inspectProviderAccountIndexes() {
  const indexes = await ProviderAccount.collection.indexes();
  const byName = Object.fromEntries(indexes.map((idx) => [idx.name, idx]));
  const issues = [];

  const phoneIdx = byName.phone_1;
  if (!phoneIdx || !phoneIdx.unique || !hasPartialStringGtEmpty(phoneIdx.partialFilterExpression, 'phone')) {
    issues.push({
      index: 'phone_1',
      reason: phoneIdx
        ? 'Legacy or mismatched phone_1 index lacks partialFilterExpression { phone: { $type: "string", $gt: "" } }'
        : 'Missing phone_1 partial unique index',
      current: phoneIdx || null,
    });
  }

  const emailIdx = byName.email_1;
  if (!emailIdx || !emailIdx.unique || emailIdx.partialFilterExpression?.emailVerified !== true) {
    issues.push({
      index: 'email_1',
      reason: emailIdx
        ? 'Mismatched email_1 index lacks partialFilterExpression { emailVerified: true }'
        : 'Missing email_1 partial unique index',
      current: emailIdx || null,
    });
  }

  const googleIdx = byName.googleId_1;
  if (
    !googleIdx ||
    !googleIdx.unique ||
    !hasPartialStringGtEmpty(googleIdx.partialFilterExpression, 'googleId')
  ) {
    issues.push({
      index: 'googleId_1',
      reason: googleIdx
        ? 'Mismatched googleId_1 index lacks partialFilterExpression { googleId: { $type: "string", $gt: "" } }'
        : 'Missing googleId_1 partial unique index',
      current: googleIdx || null,
    });
  }

  return { ok: issues.length === 0, issues, indexes };
}

export const ProviderAccount = mongoose.model('ProviderAccount', providerAccountSchema);
export default ProviderAccount;
