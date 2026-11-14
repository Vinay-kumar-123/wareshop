import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Badge from '../../components/common/Badge.jsx';
import leadService from '../../services/leadService.js';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  HelpCircle,
  FileQuestion,
  Info
} from 'lucide-react';

const SUBJECT_OPTIONS = [
  'General Inquiry / Questions',
  'Marketplace Customer Support',
  'Partner Verification & Onboarding',
  'Editorial & Content Contribution',
  'Compliance, Legal or Privacy Question',
  'Technical Issue / Bug Report',
];

export default function ContactPage() {
  usePageMeta({
    title: 'Contact Us — KONNEVIA Communication & Support Desk',
    description: 'Get in touch with the KONNEVIA marketplace team for customer enquiries, partner verification assistance, and general platform support.',
    canonical: 'https://konnevia.in/contact',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: SUBJECT_OPTIONS[0],
    message: '',
    consentToContact: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
      }
    }

    if (!formData.subject) {
      newErrors.subject = 'Please select a topic';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    if (!formData.consentToContact) {
      newErrors.consentToContact = 'Please confirm consent to be contacted regarding this message';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const res = await leadService.submitContactMessage({
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
      });

      if (res && res.success) {
        setSuccessData(res.data);
      } else {
        setServerError(res?.message || 'Failed to submit message. Please try again.');
      }
    } catch (err) {
      setServerError(
        err.message || 'An unexpected error occurred while delivering your message. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Contact Us' }]} />
        </div>
      </div>

      <div className="container-max py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <Badge variant="teal">Communication Desk</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mt-3 mb-4">
            Connect With the KONNEVIA Team
          </h1>
          <p className="text-sm sm:text-base text-text-muted leading-relaxed">
            Have a question regarding service discovery, vendor onboarding, or marketplace compliance? Reach out to our operations team below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Details Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-primary border-b border-border/60 pb-3">
                Official Channels
              </h2>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-0.5">
                    General Inquiries & Support
                  </span>
                  <a
                    href="mailto:hello@konnevia.in"
                    className="text-sm font-semibold text-primary hover:text-accent transition-colors"
                  >
                    hello@konnevia.in
                  </a>
                  <p className="text-[11px] text-text-muted mt-0.5">Standard response window: 24–48 business hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-0.5">
                    Grievance & Privacy Officer
                  </span>
                  <a
                    href="mailto:grievance@konnevia.in"
                    className="text-sm font-semibold text-primary hover:text-accent transition-colors"
                  >
                    grievance@konnevia.in
                  </a>
                  <p className="text-[11px] text-text-muted mt-0.5">Statutory data governance and grievance redressal</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-text-primary flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-text-muted" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-0.5">
                    Operational Hours
                  </span>
                  <span className="text-sm font-semibold text-primary block">
                    Monday to Friday, 10:00 AM – 6:00 PM IST
                  </span>
                  <span className="text-[11px] text-text-muted">Excluding national holidays</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-text-primary flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-text-muted" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-0.5">
                    Regional Scope
                  </span>
                  <span className="text-sm font-semibold text-primary block">
                    Pan-India Service Discovery Operations
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Digital operations desk coordinating regional provider networks
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Guidance Box */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-border/80">
              <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-accent" />
                <span>Looking for Project Quotes?</span>
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                If you are looking to hire a professional for home interiors, event curation, software development, or legal advisory, please use our structured quote form instead for faster matching.
              </p>
              <Link
                to="/get-quote"
                className="btn-secondary w-full py-2 px-3 text-xs font-semibold text-center block"
              >
                Request a Scoped Quote
              </Link>
            </div>
          </div>

          {/* Contact Form Column (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border/80 shadow-xs">
              {successData ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">Message Delivered Successfully</h2>
                  <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out. Your communication reference ID is:
                  </p>
                  <div className="inline-block bg-slate-100 px-4 py-2 rounded-lg font-mono font-bold text-primary text-base">
                    {successData.referenceId}
                  </div>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Our communication desk has logged your inquiry and will follow up with you within 24–48 business hours.
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessData(null);
                        setFormData({
                          name: '',
                          email: '',
                          phone: '',
                          subject: SUBJECT_OPTIONS[0],
                          message: '',
                          consentToContact: false,
                        });
                      }}
                      className="btn-secondary py-2 px-5 text-xs font-semibold"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-1">Send Us a Direct Message</h2>
                    <p className="text-xs text-text-muted">
                      Complete the details below and an operations representative will review your message.
                    </p>
                  </div>

                  {serverError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{serverError}</span>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5" htmlFor="contact-name">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh Chandra"
                      className={`input-field ${errors.name ? 'border-red-400 focus:ring-red-200' : ''}`}
                    />
                    {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  {/* Email & Phone Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1.5" htmlFor="contact-email">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@example.com"
                        className={`input-field ${errors.email ? 'border-red-400 focus:ring-red-200' : ''}`}
                      />
                      {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary mb-1.5" htmlFor="contact-phone">
                        Mobile Number <span className="text-text-muted font-normal text-[11px]">(Optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">
                          +91
                        </span>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          maxLength={10}
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="9876543210"
                          className={`input-field pl-11 ${errors.phone ? 'border-red-400 focus:ring-red-200' : ''}`}
                        />
                      </div>
                      {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5" htmlFor="contact-subject">
                      Subject / Inquiry Topic <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="input-field bg-white"
                    >
                      {SUBJECT_OPTIONS.map((sub, idx) => (
                        <option key={idx} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5" htmlFor="contact-message">
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Please provide details regarding your inquiry, question, or request..."
                      className={`input-field resize-y ${errors.message ? 'border-red-400 focus:ring-red-200' : ''}`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.message ? (
                        <p className="text-[11px] text-red-500">{errors.message}</p>
                      ) : (
                        <span />
                      )}
                      <span className="text-[10px] text-text-muted">Minimum 10 characters</span>
                    </div>
                  </div>

                  {/* Consent Checkbox */}
                  <div className="pt-2 border-t border-border/60">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consentToContact"
                        checked={formData.consentToContact}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="text-xs text-text-muted leading-relaxed">
                        I confirm that the details provided are accurate and authorize KONNEVIA’s communication desk to contact me via email or phone regarding this inquiry in accordance with the{' '}
                        <Link to="/privacy-policy" className="text-accent hover:underline font-semibold" target="_blank">
                          Privacy Policy
                        </Link>
                        . <span className="text-red-500">*</span>
                      </span>
                    </label>
                    {errors.consentToContact && (
                      <p className="text-[11px] text-red-500 mt-1 ml-7">{errors.consentToContact}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full py-3 px-6 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Delivering Message...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Message</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-text-muted mt-2">
                      Protected by IP rate limiting to prevent automated spam submissions.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
