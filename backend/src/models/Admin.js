import mongoose from 'mongoose';
import crypto from 'crypto';

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Admin email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'CONTENT_MANAGER', 'SUPPORT_AGENT'],
      default: 'SUPER_ADMIN',
      index: true,
    },
    sessionToken: {
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
    passwordRotatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password using native crypto.scryptSync with constant-time comparison
adminSchema.methods.verifyPassword = function (password) {
  if (!password || !this.passwordHash || !this.salt) return false;
  try {
    const hash = crypto.scryptSync(password, this.salt, 64).toString('hex');
    const storedBuf = Buffer.from(this.passwordHash, 'hex');
    const computedBuf = Buffer.from(hash, 'hex');
    if (storedBuf.length !== computedBuf.length) return false;
    return crypto.timingSafeEqual(storedBuf, computedBuf);
  } catch {
    return false;
  }
};

// Static method to securely hash passwords
adminSchema.statics.hashPassword = function (password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, passwordHash };
};

export const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
