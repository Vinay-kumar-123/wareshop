import mongoose from 'mongoose';
const schema = new mongoose.Schema({ phone: { type: String, required: true, unique: true, index: true }, role: { type: String, enum: ['PROVIDER'], default: 'PROVIDER' }, verifiedAt: { type: Date, required: true }, applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null } }, { timestamps: true });
export default mongoose.model('ProviderAccount', schema);
