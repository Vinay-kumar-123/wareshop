import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  icon: { type: String, trim: true, maxlength: 50, default: 'Layers' },
  displayOrder: { type: Number, min: 0, default: 0, index: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
}, { timestamps: true });
categorySchema.index({ status: 1, displayOrder: 1 });
export default mongoose.model('Category', categorySchema);
