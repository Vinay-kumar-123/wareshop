import React from 'react';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  usePageMeta({
    title: 'Privacy Policy | WARESHOP',
    description:
      'Read the WARESHOP privacy policy covering provider OTP authentication, commercial listing data, and direct contact privacy.',
    canonical: 'https://wareshop.in/privacy-policy',
  });

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Privacy Policy' }]} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Governance</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mb-2">
            WARESHOP Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Effective Date: January 1, 2026 · Last Updated: November 2026
          </p>
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200/90 shadow-xs space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          <section className="space-y-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950">
              1. Overview & Marketplace Model
            </h2>
            <p>
              WARESHOP operates as a commercial property and business discovery marketplace for
              Shops, Offices, Warehouses, and Godowns across India. Our platform connects customers
              with property and business owners directly. We do not operate a central customer
              enquiry call center or sell user data to third-party lead brokers.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950">
              2. Information We Collect
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
              <li>
                <strong className="text-slate-900">Provider Account & OTP Verification:</strong>{' '}
                10-digit Indian mobile number, optional account holder name and email address, and
                cryptographic OTP challenge metadata used to authenticate business owners via
                2Factor SMS OTP.
              </li>
              <li>
                <strong className="text-slate-900">Commercial Listing Information:</strong>{' '}
                Business/property name, category (Shop, Office, Warehouse, Godown, or custom
                category request), description, services offered, contact person, address, city,
                state, PIN code, optional website, uploaded property photographs, and explicit phone
                display consent.
              </li>
              <li>
                <strong className="text-slate-900">Image Privacy & Metadata Stripping:</strong>{' '}
                Uploaded property images are validated server-side and automatically stripped of embedded
                EXIF/GPS camera metadata before storage.
              </li>
              <li>
                <strong className="text-slate-900">Security & Rate-Limit Logs:</strong> Request IP
                addresses and timestamps used strictly to prevent OTP abuse, automated scraping of
                owner phone numbers, and unauthorized access.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950">
              3. Direct Contact & Owner Consent
            </h2>
            <p>
              A provider’s verified mobile number is never exposed in bulk public search responses.
              It is revealed to prospective customers through our rate-limited contact endpoint only
              when:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600">
              <li>The listing has been approved and published by a WARESHOP administrator;</li>
              <li>The provider account and category are active; and</li>
              <li>
                The provider has granted explicit consent to display their verified phone number for
                direct customer calls.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950">
              4. Session Security & Storage
            </h2>
            <p>
              Provider and administrator session tokens are stored in cryptographically hashed form
              (SHA-256) on the server and transmitted over HTTPS with strict HttpOnly cookie and
              CSRF safeguards.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950">
              5. Infrastructure & Third-Party Processors
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600">
              <li>
                <strong className="text-slate-900">Database:</strong> MongoDB Atlas (encrypted cloud
                storage).
              </li>
              <li>
                <strong className="text-slate-900">SMS OTP Delivery:</strong> 2Factor SMS API (used
                solely for Indian mobile OTP verification).
              </li>
              <li>
                <strong className="text-slate-900">Media Hosting:</strong> Cloudinary (for
                published commercial listing images).
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
