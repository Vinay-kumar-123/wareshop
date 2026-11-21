import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'Layers',
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    imagePublicId: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    displayOrder: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ status: 1, displayOrder: 1 });

export const Category = mongoose.model('Category', categorySchema);
export default Category;
