import mongoose from 'mongoose';
import crypto from 'crypto';

const providerAccountSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Verified mobile number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'],
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
      maxlength: 120,
      default: '',
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
    verifiedAt: {
      type: Date,
      required: true,
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

providerAccountSchema.statics.hashSessionToken = function (token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const ProviderAccount = mongoose.model('ProviderAccount', providerAccountSchema);
export default ProviderAccount;
