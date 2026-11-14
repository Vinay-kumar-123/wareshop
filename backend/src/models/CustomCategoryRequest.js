import mongoose from 'mongoose';

const customCategoryRequestSchema = new mongoose.Schema(
  {
    providerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProviderAccount',
      default: null,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    requestedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'MAPPED'],
      default: 'PENDING',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    approvedCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    reviewedBy: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

customCategoryRequestSchema.index({ applicationId: 1, normalizedName: 1 }, { unique: true, sparse: true });

export const CustomCategoryRequest = mongoose.model(
  'CustomCategoryRequest',
  customCategoryRequestSchema
);
export default CustomCategoryRequest;
