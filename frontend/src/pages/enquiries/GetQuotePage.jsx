import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import leadService from '../../services/leadService.js';
import { categories } from '../../data/categories.js';
import { services } from '../../data/services.js';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Lock,
  PhoneCall
} from 'lucide-react';

export default function GetQuotePage() {
  const [searchParams] = useSearchParams();

  // Prefill params from discovery pages
  const paramService = searchParams.get('service') || '';
  const paramCategory = searchParams.get('category') || '';
  const paramProvider = searchParams.get('provider') || '';

  // Form State
  const [formData, setFormData] = useState({
    category: paramCategory,
    service: paramService,
    name: '',
    phone: '',
    email: '',
    city: '',
    location: '',
    pinCode: '',
    requirements: '',
    estimatedBudget: '',
    expectedTimeline: '',
    consentToContact: false,
    consentProviderSharing: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null); // stores { referenceId, message }
  const [submitError, setSubmitError] = useState(null);

  usePageMeta({
    title: 'Get a Service Quote — KONNEVIA Verified Matching',
    description: 'Submit your service requirements across Home, Events, Business, Digital, or Education. Verified matching with transparent privacy controls.',
    canonical: 'https://konnevia.com/get-quote',
  });

  // Automatically update category if service is selected from seed data
  useEffect(() => {
    if (formData.service && !formData.category) {
      const match = services.find(
        (s) => s.name.toLowerCase() === formData.service.toLowerCase()
      );
      if (match) {
        setFormData((prev) => ({ ...prev, category: match.categorySlug }));
      }
    }
  }, [formData.service, formData.category]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear field-level error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Client-side validation before submission
  const validateForm = () => {
    const errs = {};

    if (!formData.category.trim()) {
      errs.category = 'Please choose a service category';
    }

    if (!formData.service.trim()) {
      errs.service = 'Please specify the service you need';
    }

    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please provide a valid email format';
      }
    }

    if (!formData.city.trim()) {
      errs.city = 'City is required';
    }

    if (!formData.requirements.trim() || formData.requirements.trim().length < 10) {
      errs.requirements = 'Please describe your project scope (at least 10 characters)';
    }

    if (formData.pinCode.trim()) {
      if (!/^\d{6}$/.test(formData.pinCode.trim())) {
        errs.pinCode = 'PIN code must be 6 digits';
      }
    }

    if (!formData.consentToContact) {
      errs.consentToContact = 'You must authorize our team to contact you regarding this enquiry';
    }

    if (!formData.consentProviderSharing) {
      errs.consentProviderSharing = 'You must authorize sharing your scope with vetted providers';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await leadService.submitEnquiry({
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
        preferredProvider: paramProvider || undefined,
      });

      if (response && response.success) {
        setSubmissionSuccess({
          referenceId: response.data?.referenceId || 'KNV-ENQ-CONFIRMED',
          message: response.message || 'Your service enquiry has been successfully logged.',
        });
      } else {
        setSubmitError(
          response?.message || 'We could not record your enquiry. Please check your details and try again.'
        );
      }
    } catch (err) {
      console.error('Enquiry submission error:', err);
      setSubmitError(
        err.message || 'Unable to connect to the enquiry service. Please check your internet connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      category: '',
      service: '',
      name: '',
      phone: '',
      email: '',
      city: '',
      location: '',
      pinCode: '',
      requirements: '',
      estimatedBudget: '',
      expectedTimeline: '',
      consentToContact: false,
      consentProviderSharing: false,
    });
    setErrors({});
    setSubmissionSuccess(null);
    setSubmitError(null);
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Get a Quote' }]} />
        </div>
      </div>

      <div className="container-max py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">
              Direct Service Matching
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-3">
              Request Verified Quotes
            </h1>
            <p className="text-text-muted text-base sm:text-lg leading-relaxed">
              Submit your project scope in 2 minutes. Our team reviews your requirements and pairs you with up to 2 verified specialists.
            </p>
          </div>

          {/* Targeted Provider Note if arriving from profile */}
          {paramProvider && (
            <div className="mb-8 p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs sm:text-sm text-teal-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                <span>
                  Enquiry directed for provider: <strong>{paramProvider}</strong>
                </span>
              </div>
              <span className="text-[11px] font-semibold bg-white/80 px-2 py-0.5 rounded text-accent">
                Prefilled Scope
              </span>
            </div>
          )}

          {/* Submission Success State */}
          {submissionSuccess ? (
            <div className="bg-white rounded-2xl border border-border/80 p-8 sm:p-12 text-center shadow-xs animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-teal-50 text-accent flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-3">
                Enquiry Successfully Logged!
              </h2>
              <p className="text-text-muted text-base max-w-xl mx-auto mb-6 leading-relaxed">
                {submissionSuccess.message}
              </p>

              {/* Reference ID Pill */}
              <div className="inline-block bg-slate-50 border border-border/80 rounded-xl px-6 py-4 mb-8 text-left">
                <span className="text-xs uppercase tracking-wider text-text-muted font-bold block mb-1">
                  Enquiry Reference ID
                </span>
                <span className="text-xl sm:text-2xl font-mono font-extrabold text-primary tracking-wide">
                  {submissionSuccess.referenceId}
                </span>
                <span className="text-[11px] text-text-muted block mt-1">
                  Please keep this reference for follow-ups with our advisory team.
                </span>
              </div>

              {/* What happens next */}
              <div className="bg-slate-50/60 rounded-xl border border-border/60 p-6 max-w-xl mx-auto text-left mb-8 space-y-3">
                <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" />
                  <span>Next Steps in Our Workflow</span>
                </h3>
                <ol className="list-decimal list-inside text-xs text-text-muted space-y-1.5 leading-relaxed">
                  <li>Our operations team will review your project requirements.</li>
                  <li>We manually verify provider bandwidth in {formData.city || 'your area'}.</li>
                  <li>We connect with you to confirm specifications before any introduction.</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="btn-secondary text-xs sm:text-sm py-2.5 px-6"
                >
                  Submit Another Enquiry
                </button>
                <Link
                  to="/categories"
                  className="btn-primary text-xs sm:text-sm py-2.5 px-6"
                >
                  Browse Marketplace Categories
                </Link>
              </div>
            </div>
          ) : (
            /* Form Component */
            <div className="bg-white rounded-2xl border border-border/80 shadow-xs p-6 sm:p-10">
              {submitError && (
                <div className="mb-6">
                  <Alert variant="error" title="Submission Error" message={submitError} />
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-8">
                {/* 1. Service Scope Section */}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                      1
                    </span>
                    <span>Service Scope & Category</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Category Select */}
                    <div>
                      <label htmlFor="quote-category" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Marketplace Vertical <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="quote-category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors cursor-pointer ${
                          errors.category ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                        }`}
                      >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-xs text-red-600">{errors.category}</p>
                      )}
                    </div>

                    {/* Specific Service Input / Autocomplete */}
                    <div>
                      <label htmlFor="quote-service" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Specific Service <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="quote-service"
                        name="service"
                        type="text"
                        value={formData.service}
                        onChange={handleChange}
                        placeholder="e.g. Interior Design, Plumbing, Web App"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                          errors.service ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                        }`}
                      />
                      {errors.service && (
                        <p className="mt-1 text-xs text-red-600">{errors.service}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Contact Information */}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                      2
                    </span>
                    <span>Contact Information</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Full Name */}
                    <div>
                      <label htmlFor="quote-name" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="quote-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Verma"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                          errors.name ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                        }`}
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label htmlFor="quote-phone" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs text-text-muted font-medium pointer-events-none">
                          +91
                        </span>
                        <input
                          id="quote-phone"
                          name="phone"
                          type="tel"
                          maxLength={10}
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="98XXXXXXXX"
                          className={`w-full pl-11 pr-3 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                            errors.phone ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                          }`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                      )}
                    </div>

                    {/* Email (Optional) */}
                    <div>
                      <label htmlFor="quote-email" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Email Address <span className="text-xs font-normal text-text-muted">(Optional)</span>
                      </label>
                      <input
                        id="quote-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                          errors.email ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Project Location */}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                      3
                    </span>
                    <span>Project Location</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* City */}
                    <div>
                      <label htmlFor="quote-city" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="quote-city"
                        name="city"
                        type="text"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g. Mumbai, Bengaluru"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                          errors.city ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                        }`}
                      />
                      {errors.city && (
                        <p className="mt-1 text-xs text-red-600">{errors.city}</p>
                      )}
                    </div>

                    {/* Area / Locality */}
                    <div>
                      <label htmlFor="quote-location" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Area / Locality <span className="text-xs font-normal text-text-muted">(Optional)</span>
                      </label>
                      <input
                        id="quote-location"
                        name="location"
                        type="text"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. Andheri West, Whitefield"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors"
                      />
                    </div>

                    {/* PIN Code */}
                    <div>
                      <label htmlFor="quote-pincode" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        PIN Code <span className="text-xs font-normal text-text-muted">(Optional)</span>
                      </label>
                      <input
                        id="quote-pincode"
                        name="pinCode"
                        type="text"
                        maxLength={6}
                        value={formData.pinCode}
                        onChange={handleChange}
                        placeholder="e.g. 400053"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                          errors.pinCode ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                        }`}
                      />
                      {errors.pinCode && (
                        <p className="mt-1 text-xs text-red-600">{errors.pinCode}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Project Requirements & Budget */}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-primary mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent-50 text-accent text-xs font-extrabold flex items-center justify-center">
                      4
                    </span>
                    <span>Project Details & Scope</span>
                  </h2>

                  <div className="space-y-5">
                    {/* Requirements Description */}
                    <div>
                      <label htmlFor="quote-requirements" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Detailed Project Requirements <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="quote-requirements"
                        name="requirements"
                        rows={4}
                        value={formData.requirements}
                        onChange={handleChange}
                        placeholder="Please describe your project scope, size of space, specific deliverables, or any preferred brands/materials..."
                        className={`w-full p-3.5 text-sm bg-slate-50 border rounded-lg text-primary focus:outline-none focus:bg-white transition-colors ${
                          errors.requirements ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-accent'
                        }`}
                      />
                      {errors.requirements && (
                        <p className="mt-1 text-xs text-red-600">{errors.requirements}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Budget */}
                      <div>
                        <label htmlFor="quote-budget" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                          Estimated Budget <span className="text-xs font-normal text-text-muted">(Optional)</span>
                        </label>
                        <select
                          id="quote-budget"
                          name="estimatedBudget"
                          value={formData.estimatedBudget}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors cursor-pointer"
                        >
                          <option value="">Select an estimated range</option>
                          <option value="Under ₹50,000">Under ₹50,000</option>
                          <option value="₹50,000 - ₹2 Lakhs">₹50,000 - ₹2 Lakhs</option>
                          <option value="₹2 Lakhs - ₹5 Lakhs">₹2 Lakhs - ₹5 Lakhs</option>
                          <option value="₹5 Lakhs - ₹15 Lakhs">₹5 Lakhs - ₹15 Lakhs</option>
                          <option value="₹15 Lakhs+">₹15 Lakhs+</option>
                        </select>
                      </div>

                      {/* Timeline */}
                      <div>
                        <label htmlFor="quote-timeline" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                          Expected Timeline <span className="text-xs font-normal text-text-muted">(Optional)</span>
                        </label>
                        <select
                          id="quote-timeline"
                          name="expectedTimeline"
                          value={formData.expectedTimeline}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors cursor-pointer"
                        >
                          <option value="">When do you need this completed?</option>
                          <option value="Immediately (Within 1 week)">Immediately (Within 1 week)</option>
                          <option value="Within 1 month">Within 1 month</option>
                          <option value="1 - 3 months">1 - 3 months</option>
                          <option value="Flexible / Planning stage">Flexible / Planning stage</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Consents & Privacy Governance */}
                <div className="bg-slate-50/70 p-5 sm:p-6 rounded-xl border border-border/80 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-accent" />
                    <span>Explicit Consent & Data Governance</span>
                  </h3>

                  {/* Consent 1: Direct Contact */}
                  <div className="flex items-start gap-3">
                    <input
                      id="consentToContact"
                      name="consentToContact"
                      type="checkbox"
                      checked={formData.consentToContact}
                      onChange={handleChange}
                      className="w-4 h-4 text-accent border-border rounded mt-1 cursor-pointer focus:ring-accent"
                    />
                    <label htmlFor="consentToContact" className="text-xs text-text-primary leading-relaxed cursor-pointer">
                      <strong>Direct Contact Authorization:</strong> I authorize KONNEVIA’s marketplace operations team to contact me via phone/SMS/email regarding this service request. <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {errors.consentToContact && (
                    <p className="text-xs text-red-600 pl-7">{errors.consentToContact}</p>
                  )}

                  {/* Consent 2: Provider Scope Sharing */}
                  <div className="flex items-start gap-3">
                    <input
                      id="consentProviderSharing"
                      name="consentProviderSharing"
                      type="checkbox"
                      checked={formData.consentProviderSharing}
                      onChange={handleChange}
                      className="w-4 h-4 text-accent border-border rounded mt-1 cursor-pointer focus:ring-accent"
                    />
                    <label htmlFor="consentProviderSharing" className="text-xs text-text-primary leading-relaxed cursor-pointer">
                      <strong>Verified Provider Introduction:</strong> I agree that my project scope and contact details may be shared strictly with up to 2 vetted service professionals matching this enquiry. We adhere to a strict zero-spam, non-broadcast policy. <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {errors.consentProviderSharing && (
                    <p className="text-xs text-red-600 pl-7">{errors.consentProviderSharing}</p>
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
                        <span>Submitting Enquiry...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Service Request</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
