import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Alert from '../../components/common/Alert.jsx';
import leadService from '../../services/leadService.js';
import api from '../../services/api.js';
import { categories as fallbackCategories } from '../../data/categories.js';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Building,
  Lock,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Upload,
  Image as ImageIcon,
  X,
  PhoneCall,
} from 'lucide-react';

export default function BecomePartnerPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: '',
    customCategoryName: '',
    servicesOffered: '',
    city: '',
    state: '',
    address: '',
    pinCode: '',
    serviceAreas: '',
    website: '',
    businessDescription: '',
    consentToContact: false,
    consentToDisplayPhone: true,
  });

  const [shopImageFile, setShopImageFile] = useState(null);
  const [shopImagePreview, setShopImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [providerAccountId, setProviderAccountId] = useState('');
  const [availableCategories, setAvailableCategories] = useState(fallbackCategories);
  useEffect(() => { api.get('/categories').then((result) => { if (result.data?.length) setAvailableCategories(result.data); }).catch(() => {}); }, []);

  usePageMeta({
    title: 'Partner Onboarding — Become a Verified Provider — KONNEVIA',
    description:
      'Apply to join KONNEVIA as a verified service partner. High-intent customer enquiries with transparent commission terms.',
    canonical: 'https://konnevia.com/become-a-partner',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        shopImage: 'Please upload a valid image file (JPEG, PNG, or WebP).',
      }));
      return;
    }

    // Validate 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        shopImage: 'Image size exceeds 5MB. Please choose a smaller photo.',
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.shopImage;
      return next;
    });

    setShopImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setShopImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setShopImageFile(null);
    setShopImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const errs = {};

    if (!formData.businessName.trim()) {
      errs.businessName = 'Business or enterprise name is required';
    }

    if (!formData.contactPerson.trim()) {
      errs.contactPerson = 'Contact person name is required';
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Valid 10-digit Indian mobile number is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errs.email = 'Valid business email is required';
    }

    if (!formData.category.trim()) {
      errs.category = 'Please choose your primary category vertical';
    }

    if (!formData.servicesOffered.trim()) {
      errs.servicesOffered = 'Please list at least one service you provide';
    }

    if (!formData.city.trim()) {
      errs.city = 'Operating headquarters city is required';
    }

    if (!formData.businessDescription.trim() || formData.businessDescription.trim().length < 15) {
      errs.businessDescription = 'Please provide a business overview (at least 15 characters)';
    }

    if (formData.pinCode && !/^\d{6}$/.test(formData.pinCode.trim())) {
      errs.pinCode = 'PIN code must be exactly 6 digits';
    }

    if (!formData.consentToContact) {
      errs.consentToContact = 'You must authorize our onboarding team to contact you';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!verificationToken || !providerAccountId) {
      setSubmitError('Verify your mobile number before submitting the application.');
      return;
    }
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('businessName', formData.businessName.trim());
      payload.append('contactPerson', formData.contactPerson.trim());
      payload.append('phone', formData.phone.replace(/\D/g, ''));
      payload.append('email', formData.email.trim());
      payload.append('category', formData.category.trim());
      payload.append('customCategoryName', formData.customCategoryName.trim());
      payload.append('providerAccountId', providerAccountId);
      payload.append('servicesOffered', formData.servicesOffered.trim());
      payload.append('city', formData.city.trim());
      payload.append('state', formData.state.trim());
      payload.append('address', formData.address.trim());
      payload.append('pinCode', formData.pinCode.trim());
      payload.append('serviceAreas', formData.serviceAreas.trim());
      payload.append('website', formData.website.trim());
      payload.append('businessDescription', formData.businessDescription.trim());
      payload.append('consentToContact', formData.consentToContact ? 'true' : 'false');
      payload.append('consentToDisplayPhone', formData.consentToDisplayPhone ? 'true' : 'false');

      if (shopImageFile) {
        payload.append('shopImage', shopImageFile);
      }

      const response = await leadService.submitPartnerEnquiry(payload);

      if (response && response.success) {
        setSubmissionSuccess({
          referenceId: response.data?.referenceId || 'KNV-PTR-CONFIRMED',
          message:
            response.message ||
            'Your partner onboarding application and shop profile have been received.',
          businessName: formData.businessName,
          category: formData.category,
          city: formData.city,
        });
      } else {
        setSubmitError(
          response?.message || 'We could not submit your partner application. Please try again.'
        );
      }
    } catch (err) {
      console.error('Partner submission error:', err);
      setSubmitError(
        err.message || 'Unable to connect to the onboarding service. Please verify your connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestOtp = async () => {
    const phone = formData.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phone)) { setOtpMessage('Enter a valid 10-digit Indian mobile number first.'); return; }
    try { await api.post('/provider-auth/otp/request', { phone }); setOtpSent(true); setOtp(''); setOtpMessage('OTP sent to your mobile number. Enter the six-digit code to continue.'); } catch (err) { setOtpSent(false); setOtpMessage(err.message); }
  };
  const verifyMobile = async () => {
    try { const phone = formData.phone.replace(/\D/g, ''); const verified = await api.post('/provider-auth/otp/verify', { phone, otp }); const token = verified.data.verificationToken; const account = await api.post('/provider-auth/register', { phone, verificationToken: token }); setVerificationToken(token); setProviderAccountId(account.data.providerAccountId); setOtpMessage('Mobile verified successfully.'); } catch (err) { setOtpMessage(err.message); }
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Partner With Us', href: null },
  ];

  return (
    <div className="bg-background min-h-screen pb-16">
      {/* Header Banner */}
      <section className="bg-primary text-white py-12 md:py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={breadcrumbItems} className="mb-6 text-slate-300" />
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent mb-4 border border-accent/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pan-India Verified Provider Network</span>
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
              Scale Your Service Enterprise on KONNEVIA
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Connect with high-intent clients looking for vetted professionals. Transparent
              performance-based commissions upon verified deal completion.
            </p>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Area */}
          <div className="lg:col-span-8">
            {submissionSuccess ? (
              <div className="bg-white rounded-2xl p-8 sm:p-10 border border-border shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-accent mb-1 block">
                  Application Received
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-3">
                  Welcome to KONNEVIA Onboarding
                </h2>
                <p className="text-sm text-text-muted max-w-xl mx-auto leading-relaxed mb-6">
                  {submissionSuccess.message}
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-md mx-auto text-left mb-6 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted font-medium">Tracking Reference:</span>
                    <span className="font-mono font-bold text-accent">
                      {submissionSuccess.referenceId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted font-medium">Enterprise Name:</span>
                    <span className="font-semibold text-primary">
                      {submissionSuccess.businessName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted font-medium">Headquarters:</span>
                    <span className="font-semibold text-primary">{submissionSuccess.city}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted font-medium">Verification Status:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      UNDER DESK REVIEW
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/"
                    className="btn-primary w-full sm:w-auto px-6 py-2.5 text-sm font-semibold"
                  >
                    Return to Marketplace
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionSuccess(null);
                      setShopImageFile(null);
                      setShopImagePreview(null);
                    }}
                    className="btn-secondary w-full sm:w-auto px-6 py-2.5 text-sm font-semibold"
                  >
                    Submit Another Profile
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-border shadow-sm">
                {submitError && (
                  <Alert
                    type="error"
                    title="Submission Notice"
                    message={submitError}
                    className="mb-6"
                  />
                )}

                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                  {/* 1. Business Identity */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                        1
                      </span>
                      <span>Business & Commercial Identity</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Business Name */}
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="partner-businessName"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Enterprise or Firm Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="partner-businessName"
                          name="businessName"
                          type="text"
                          value={formData.businessName}
                          onChange={handleChange}
                          placeholder="e.g. Skyline Architecture & Construction LLP"
                          className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                            errors.businessName
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-accent'
                          }`}
                        />
                        {errors.businessName && (
                          <p className="mt-1 text-xs text-red-600">{errors.businessName}</p>
                        )}
                      </div>

                      {/* Primary Category */}
                      <div>
                        <label
                          htmlFor="partner-category"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Primary Vertical <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="partner-category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors cursor-pointer ${
                            errors.category
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-accent'
                          }`}
                        >
                          <option value="">Select your main domain</option>
                          {availableCategories.map((c) => (
                            <option key={c._id || c.id} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                          <option value="other">Other — request a category</option>
                        </select>
                        {errors.category && (
                          <p className="mt-1 text-xs text-red-600">{errors.category}</p>
                        )}
                      </div>

                      {formData.category === 'other' && <div><label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">Requested category <span className="text-red-500">*</span></label><input name="customCategoryName" value={formData.customCategoryName} onChange={handleChange} placeholder="e.g. Cold Storage Facility" className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent" /></div>}

                      {/* Services Offered */}
                      <div>
                        <label
                          htmlFor="partner-servicesOffered"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Specific Services Offered <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="partner-servicesOffered"
                          name="servicesOffered"
                          type="text"
                          value={formData.servicesOffered}
                          onChange={handleChange}
                          placeholder="e.g. Modular Kitchens, Turnkey Interiors"
                          className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                            errors.servicesOffered
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-accent'
                          }`}
                        />
                        {errors.servicesOffered && (
                          <p className="mt-1 text-xs text-red-600">{errors.servicesOffered}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Shop / Business Image Upload (Required Phase 4 Feature) */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-primary mb-2 pb-2 border-b border-border/60 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                        2
                      </span>
                      <span>Shop / Business Establishment Image</span>
                    </h2>
                    <p className="text-xs text-text-muted mb-4">
                      Upload a photo of your shop, studio, office facade, or workshop. Verified
                      visuals build customer trust. (JPEG, PNG, WebP — Max 5MB).
                    </p>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        id="partner-shop-image-input"
                      />

                      {shopImagePreview ? (
                        <div className="flex flex-col sm:flex-row items-center gap-5 justify-center">
                          <div className="relative group">
                            <img
                              src={shopImagePreview}
                              alt="Shop Preview"
                              className="w-36 h-28 object-cover rounded-lg border border-border shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 shadow"
                              title="Remove photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-left text-xs space-y-1">
                            <p className="font-semibold text-primary truncate max-w-xs">
                              {shopImageFile?.name}
                            </p>
                            <p className="text-text-muted">
                              Size: {(shopImageFile?.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Ready for verification
                            </span>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs text-accent hover:underline font-semibold"
                              >
                                Replace with different photo
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="cursor-pointer space-y-2"
                        >
                          <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-accent hover:underline">
                              Click to choose shop photo
                            </span>
                            <span className="text-xs text-text-muted block mt-0.5">
                              or drag and drop here (JPG, PNG, WebP up to 5MB)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.shopImage && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.shopImage}</p>
                    )}
                  </div>

                  {/* 3. Contact Person & Authorization */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                        3
                      </span>
                      <span>Authorized Contact Person</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {/* Contact Person */}
                      <div>
                        <label
                          htmlFor="partner-contactPerson"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="partner-contactPerson"
                          name="contactPerson"
                          type="text"
                          value={formData.contactPerson}
                          onChange={handleChange}
                          placeholder="e.g. Anand Kulkarni"
                          className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                            errors.contactPerson
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-accent'
                          }`}
                        />
                        {errors.contactPerson && (
                          <p className="mt-1 text-xs text-red-600">{errors.contactPerson}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label
                          htmlFor="partner-phone"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Direct Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs text-text-muted font-medium pointer-events-none">
                            +91
                          </span>
                          <input
                            id="partner-phone"
                            name="phone"
                            type="tel"
                            maxLength={10}
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="98XXXXXXXX"
                            className={`w-full pl-11 pr-3 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                              errors.phone
                                ? 'border-red-500 bg-red-50/20'
                                : 'border-border focus:border-accent'
                            }`}
                          />
                        </div>
                        {errors.phone && (
                          <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={requestOtp} disabled={Boolean(verificationToken)} className="text-xs font-bold text-accent hover:underline">{verificationToken ? 'Mobile verified' : 'Send OTP'}</button>{otpSent && !verificationToken && <><input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="6-digit OTP" className="w-28 px-2 py-1 text-xs border border-border rounded" /><button type="button" onClick={verifyMobile} className="text-xs font-bold text-accent hover:underline">Verify</button></>}</div>{otpMessage && <p className={`mt-1 text-xs ${verificationToken ? 'text-emerald-700' : 'text-text-muted'}`}>{otpMessage}</p>}
                      </div>

                      {/* Email */}
                      <div>
                        <label
                          htmlFor="partner-email"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Official Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="partner-email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="business@example.com"
                          className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                            errors.email
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-accent'
                          }`}
                        />
                        {errors.email && (
                          <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Location & Geographic Scope */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                        4
                      </span>
                      <span>Physical Address & Operating Scope</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {/* City */}
                      <div>
                        <label
                          htmlFor="partner-city"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="partner-city"
                          name="city"
                          type="text"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="e.g. Pune, Delhi NCR"
                          className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                            errors.city
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-accent'
                          }`}
                        />
                        {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                      </div>

                      {/* State */}
                      <div>
                        <label
                          htmlFor="partner-state"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          State / UT
                        </label>
                        <input
                          id="partner-state"
                          name="state"
                          type="text"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="e.g. Maharashtra"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                      </div>

                      {/* PIN Code */}
                      <div>
                        <label
                          htmlFor="partner-pinCode"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          PIN Code
                        </label>
                        <input
                          id="partner-pinCode"
                          name="pinCode"
                          type="text"
                          maxLength={6}
                          value={formData.pinCode}
                          onChange={handleChange}
                          placeholder="e.g. 411045"
                          className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                            errors.pinCode
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-accent'
                          }`}
                        />
                        {errors.pinCode && (
                          <p className="mt-1 text-xs text-red-600">{errors.pinCode}</p>
                        )}
                      </div>

                      {/* Address */}
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="partner-address"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Shop / Office Address
                        </label>
                        <input
                          id="partner-address"
                          name="address"
                          type="text"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Shop No. 4, Commercial Complex, Main Road"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                      </div>

                      {/* Service Areas */}
                      <div>
                        <label
                          htmlFor="partner-serviceAreas"
                          className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                        >
                          Key Localities Served
                        </label>
                        <input
                          id="partner-serviceAreas"
                          name="serviceAreas"
                          type="text"
                          value={formData.serviceAreas}
                          onChange={handleChange}
                          placeholder="Baner, Kothrud, Wakad"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Business Description */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                        5
                      </span>
                      <span>Business Overview & Experience</span>
                    </h2>

                    <div>
                      <label
                        htmlFor="partner-businessDescription"
                        className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5"
                      >
                        Company Profile & Experience <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="partner-businessDescription"
                        name="businessDescription"
                        rows={3}
                        value={formData.businessDescription}
                        onChange={handleChange}
                        placeholder="Detail your years in operation, team size, client specializations, or certifications..."
                        className={`w-full p-3.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                          errors.businessDescription
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-border focus:border-accent'
                        }`}
                      />
                      {errors.businessDescription && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.businessDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 6. Consents & Declarations */}
                  <div className="bg-slate-50/70 p-5 sm:p-6 rounded-xl border border-border/80 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-accent" />
                      <span>Partner Declarations & Consent</span>
                    </h3>

                    {/* Phone Display Consent */}
                    <div className="flex items-start gap-3">
                      <input
                        id="partner-consentToDisplayPhone"
                        name="consentToDisplayPhone"
                        type="checkbox"
                        checked={formData.consentToDisplayPhone}
                        onChange={handleChange}
                        className="w-4 h-4 text-accent border-border rounded mt-0.5 cursor-pointer focus:ring-accent"
                      />
                      <label
                        htmlFor="partner-consentToDisplayPhone"
                        className="text-xs text-text-primary leading-relaxed cursor-pointer"
                      >
                        <strong>Public Contact Number Display:</strong> Consent to display direct
                        business phone number publicly once verified and published.
                      </label>
                    </div>

                    {/* Onboarding Consent */}
                    <div className="flex items-start gap-3">
                      <input
                        id="partner-consentToContact"
                        name="consentToContact"
                        type="checkbox"
                        checked={formData.consentToContact}
                        onChange={handleChange}
                        className="w-4 h-4 text-accent border-border rounded mt-0.5 cursor-pointer focus:ring-accent"
                      />
                      <label
                        htmlFor="partner-consentToContact"
                        className="text-xs text-text-primary leading-relaxed cursor-pointer"
                      >
                        <strong>Verification Authorization:</strong> I certify that all details
                        submitted are accurate and authorize KONNEVIA to review our credentials and
                        contact us for verification.{' '}
                        <span className="text-red-500">*</span>
                      </label>
                    </div>
                    {errors.consentToContact && (
                      <p className="text-xs text-red-600 pl-7">{errors.consentToContact}</p>
                    )}
                  </div>

                  {/* Submit Action Button */}
                  <div className="flex items-center justify-end gap-4 pt-4 border-t border-border/80">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full sm:w-auto py-3 px-8 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Partner Registration</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-accent" />
                <span>Why Partner With KONNEVIA</span>
              </h3>
              <ul className="space-y-3.5 text-xs text-text-muted leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Verified Provider Badge:</strong> Stand out to genuine customers looking
                    for audited Indian specialists.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Upfront Fees:</strong> Pay agreed commission only when you
                    successfully win and complete deals.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Admin Verification:</strong> Every business is reviewed to protect the
                    platform from low-quality spam.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-accent" />
                <span>Verification SLA</span>
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Our operations team reviews partner applications within 24 to 48 business hours. You
                will receive confirmation via email and phone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
