import mongoose from 'mongoose';

const otpChallengeSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      match: /^[6-9]\d{9}$/,
    },
    otpHash: {
      type: String,
      required: true,
    },
    providerSessionId: {
      type: String,
      default: '',
    },
    deliveryStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    recordExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60_000),
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    authorizationHash: {
      type: String,
      default: null,
      index: true,
    },
    authorizationExpiresAt: {
      type: Date,
      default: null,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    requestIp: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

otpChallengeSchema.index({ phone: 1, createdAt: -1 });
otpChallengeSchema.index({ sentAt: -1 });

export const OtpChallenge = mongoose.model('OtpChallenge', otpChallengeSchema);
export default OtpChallenge;
