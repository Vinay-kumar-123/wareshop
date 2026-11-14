import mongoose from 'mongoose';
const schema = new mongoose.Schema({ phone: { type: String, required: true, index: true }, otpHash: { type: String, required: true }, providerSessionId: { type: String, default: '' }, expiresAt: { type: Date, required: true, index: { expires: 0 } }, attempts: { type: Number, default: 0 }, sentAt: { type: Date, default: Date.now }, verifiedAt: Date, authorizationHash: String, authorizationExpiresAt: Date, consumedAt: Date }, { timestamps: true });
schema.index({ phone: 1, createdAt: -1 });
export default mongoose.model('OtpChallenge', schema);
