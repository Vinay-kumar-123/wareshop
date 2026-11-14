import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      unique: true,
      required: true,
    },
    type: {
      type: String,
      enum: ['partner'],
      default: 'partner',
      index: true,
    },
    providerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProviderAccount',
      required: [true, 'Authenticated provider account is required'],
      index: true,
    },
    linkedListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    businessName: {
      type: String,
      required: [true, 'Business or property name is required'],
      trim: true,
      maxlength: 120,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
      maxlength: 100,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Verified mobile number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'A valid 10-digit Indian mobile number is required'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: '',
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
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
      trim: true,
      lowercase: true,
      maxlength: 80,
      default: '',
    },
    customCategoryName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    businessDescription: {
      type: String,
      required: [true, 'Business description is required'],
      trim: true,
      maxlength: 2000,
    },
    servicesOffered: {
      type: [String],
      default: [],
    },
    serviceAreas: {
      type: [String],
      default: [],
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
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
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
    website: {
      type: String,
      trim: true,
      maxlength: 250,
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
    status: {
      type: String,
      enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'new', 'qualified', 'rejected'],
      default: 'SUBMITTED',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      trim: true,
      default: '',
    },
    consentToContact: {
      type: Boolean,
      required: true,
      default: true,
    },
    consentToDisplayPhone: {
      type: Boolean,
      default: true,
    },
    consentTimestamp: {
      type: Date,
      default: Date.now,
    },
    consentPolicyVersion: {
      type: String,
      default: '2026.1',
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ type: 1, status: 1, createdAt: -1 });
leadSchema.index({ providerAccountId: 1, createdAt: -1 });

export const Lead = mongoose.model('Lead', leadSchema);
export const ListingApplication = Lead;
export default Lead;
