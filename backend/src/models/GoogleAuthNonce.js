import mongoose from 'mongoose';

/**
 * Server-issued, short-lived, single-use nonce for Google Sign-In replay protection.
 *
 * Only SHA-256 hashes are stored. The raw nonce is embedded by Google into the signed ID token
 * (`nonce` claim); the raw attempt token is held in browser memory and binds the nonce to the
 * authentication attempt that requested it. A nonce is valid only once, only before expiresAt,
 * and only when presented together with its matching attempt token.
 */
const googleAuthNonceSchema = new mongoose.Schema(
  {
    nonceHash: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-f0-9]{64}$/,
    },
    attemptHash: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    requestIp: {
      type: String,
      trim: true,
      maxlength: 64,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Automatically purge nonce records one hour after expiry (consumed or not)
googleAuthNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const GoogleAuthNonce = mongoose.model('GoogleAuthNonce', googleAuthNonceSchema);
export default GoogleAuthNonce;
