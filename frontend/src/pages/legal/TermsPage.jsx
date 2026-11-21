import React from 'react';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import { Scale } from 'lucide-react';

export default function TermsPage() {
  usePageMeta({
    title: 'Terms & Conditions | WARERENT',
    description:
      'Read the terms and conditions for using the WARERENT commercial property and business discovery marketplace.',
    canonical: 'https://wareshop.in/terms',
  });

  return (
    <div className="bg-[#F7F8FA] min-h-screen pb-16">
      <div className="bg-white border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Terms & Conditions' }]} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-10 sm:pt-14 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FFF5EF] border border-[#FFE6D5] text-[#B4400E] text-xs font-bold uppercase tracking-wider mb-3">
            <Scale className="w-3.5 h-3.5 text-[#F36B21]" />
            <span>Marketplace Terms</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#171717] tracking-tight mb-2">
            WARERENT Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Effective Date: January 1, 2026 · Last Updated: November 2026
          </p>
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-xl border border-slate-200/90 shadow-card space-y-8 text-slate-700 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#171717]">
              1. Role of WARERENT
            </h2>
            <p>
              WARERENT is an online commercial discovery directory for Shops, Offices, Warehouses,
              and Godowns across India. WARERENT facilitates direct discovery and phone contact
              between prospective customers and listing owners. WARERENT is not a real estate
              broker, lessor, property manager, or financial escrow agent.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#171717]">
              2. Provider Registration & Listing Rules
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600">
              <li>
                Providers must authenticate using their own valid email address via Email OTP and
                provide an accurate 10-digit Indian business mobile number. Submitting another
                person’s contact details is prohibited.
              </li>
              <li>
                All submitted listings enter the{' '}
                <strong className="text-[#171717]">SUBMITTED</strong> review state. Only authorized
                WARERENT administrators may approve, reject, publish, unpublish, or suspend
                listings.
              </li>
              <li>
                Edits made to a published or approved listing automatically re-enter administrator
                review to maintain marketplace integrity.
              </li>
              <li>
                Uploaded images must be authentic photographs of the commercial property or business
                in JPEG, PNG, or WebP format.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#171717]">
              3. Customer Due Diligence
            </h2>
            <p>
              Customers contacting business or property owners through WARERENT are responsible for
              conducting independent physical inspections, verifying property title and municipal
              approvals, and executing formal lease or commercial agreements directly with the
              owner.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#171717]">
              4. Prohibited Conduct
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600">
              <li>Automated scraping or bulk harvesting of listing descriptions or phone numbers.</li>
              <li>Submitting fraudulent, misleading, or unauthorized property listings.</li>
              <li>Abusing OTP generation or contact-reveal endpoints.</li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#171717]">
              5. Governing Law
            </h2>
            <p>
              These Terms & Conditions are governed by the laws of the Republic of India.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
