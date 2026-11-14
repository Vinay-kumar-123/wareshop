import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema(
  {
    providerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProviderAccount',
      default: null,
      index: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: 120,
    },
    providerName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    slug: {
      type: String,
      required: [true, 'Provider slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: 80,
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      index: true,
    },
    customCategoryName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    services: {
      type: [String],
      default: [],
    },
    contactNumber: {
      type: String,
      trim: true,
      match: [/^([6-9]\d{9})?$/, 'Contact number must be a valid 10-digit Indian mobile number'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: 80,
      index: true,
    },
    state: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    pinCode: {
      type: String,
      trim: true,
      maxlength: 10,
      default: '',
    },
    serviceAreas: {
      type: [String],
      default: [],
    },
    website: {
      type: String,
      trim: true,
      maxlength: 250,
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
    },
    sourceReferenceId: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'REJECTED', 'SUSPENDED'],
      default: 'SUBMITTED',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'REVOKED'],
      default: 'UNVERIFIED',
      index: true,
    },
    publicationStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    publicationConsent: {
      type: Boolean,
      default: false,
    },
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
      maxlength: 160,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 320,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Unique sparse index on sourceApplicationId to prevent duplicate listings per application
providerSchema.index({ sourceApplicationId: 1 }, { unique: true, sparse: true });

// Compound indexes for optimized public provider queries
providerSchema.index({ verificationStatus: 1, publicationStatus: 1, publishedAt: -1 });
providerSchema.index({ verificationStatus: 1, publicationStatus: 1, categorySlug: 1 });
providerSchema.index({ verificationStatus: 1, publicationStatus: 1, city: 1 });

export const Provider = mongoose.model('Provider', providerSchema);
export const ProviderListing = Provider;
export default Provider;
