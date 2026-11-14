import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['enquiry', 'partner', 'contact'],
      default: 'enquiry',
      index: true,
    },
    // Customer / Contact Person
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    // Service Scope
    category: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    service: {
      type: String,
      trim: true,
      default: '',
    },
    // Geographic Info
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: '', // locality / area
    },
    address: {
      type: String,
      trim: true,
      default: '',
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
    // Requirements / Scope
    requirements: {
      type: String,
      trim: true,
      default: '',
    },
    estimatedBudget: {
      type: String,
      trim: true,
      default: '',
    },
    expectedTimeline: {
      type: String,
      trim: true,
      default: '',
    },
    // Partner Specific Fields
    businessName: {
      type: String,
      trim: true,
      default: '',
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    servicesOffered: {
      type: [String],
      default: [],
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
    businessDescription: {
      type: String,
      trim: true,
      default: '',
    },
    customCategoryName: { type: String, trim: true, default: '' },
    providerAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderAccount', default: null, index: true },
    // Shop & Business Image Metadata
    shopImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      originalName: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
    // Operational Workflow Status
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'assigned', 'converted', 'closed', 'rejected'],
      default: 'new',
      index: true,
    },
    assignedProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
      index: true,
    },
    // Consents & Legal Governance
    consentToContact: {
      type: Boolean,
      required: true,
      default: false,
    },
    consentProviderSharing: {
      type: Boolean,
      default: false,
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
    // Google Sheets Sync Status & Retry Audit Fields
    googleSheetsSynced: {
      type: Boolean,
      default: false,
      index: true,
    },
    googleSheetsSyncedAt: {
      type: Date,
    },
    googleSheetsError: {
      type: String,
    },
    syncAttempts: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
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

export const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
