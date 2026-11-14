import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    providerName: {
      type: String,
      trim: true,
      default: '',
    },
    slug: {
      type: String,
      required: [true, 'Provider slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    services: {
      type: [String],
      default: [],
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    pinCode: {
      type: String,
      trim: true,
      default: '',
    },
    serviceAreas: {
      type: [String],
      default: [],
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    shopImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      originalName: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
    gallery: {
      type: [String],
      default: [],
    },
    sourceApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    sourceReferenceId: {
      type: String,
      default: '',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'REVOKED'],
      default: 'VERIFIED',
      index: true,
    },
    publicationStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    publicationConsent: {
      type: Boolean,
      default: false,
    },
    // Explicit guardrail for development fixtures. Production queries can exclude these records.
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    consentToDisplayPhone: {
      type: Boolean,
      default: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    metaTitle: {
      type: String,
      trim: true,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for optimized public provider queries
providerSchema.index({ verificationStatus: 1, publicationStatus: 1, categorySlug: 1 });
providerSchema.index({ verificationStatus: 1, publicationStatus: 1, city: 1 });

export const Provider = mongoose.model('Provider', providerSchema);
export default Provider;
