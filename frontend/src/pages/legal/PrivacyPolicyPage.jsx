import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Badge from '../../components/common/Badge.jsx';
import {
  ShieldAlert,
  Lock,
  Eye,
  FileCheck2,
  Database,
  Share2,
  RefreshCw,
  Mail,
  AlertTriangle
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  usePageMeta({
    title: 'Privacy Policy — KONNEVIA Data Governance & Protection Protocols',
    description: 'Read the KONNEVIA Privacy Policy detailing our information collection practices, customer consent management, vetted provider data sharing, and DPDP governance.',
    canonical: 'https://konnevia.in/privacy-policy',
  });

  return (
    <div className="bg-background min-h-screen">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Privacy Policy' }]} />
        </div>
      </div>

      <div className="container-max py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="teal">Legal Governance</Badge>
              <span className="text-xs font-semibold text-text-muted">VERSION 2026.1</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mb-3">
              KONNEVIA Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              Effective Date: January 1, 2026 · Last Updated: November 12, 2026
            </p>
          </div>

          {/* Legal Review Mandatory Callout */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 mb-10 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold block text-amber-950 mb-0.5">
                NOTICE: DRAFT POLICY SUBJECT TO FORMAL LEGAL COUNSEL REVIEW
              </strong>
              This privacy governance policy outlines the factual technical and operational data practices implemented by the KONNEVIA marketplace architecture. It is published as a draft standard and requires final review by qualified Indian legal counsel prior to formal commercial operations under the Digital Personal Data Protection (DPDP) Act, 2023.
            </div>
          </div>

          {/* Main Legal Content */}
          <div className="bg-white p-6 sm:p-12 rounded-3xl border border-border/80 shadow-xs space-y-10 text-text-primary text-sm sm:text-base leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
                <span>1. Introduction & Operational Scope</span>
              </h2>
              <p>
                KONNEVIA (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) operates as a Pan-India multi-category service discovery and lead facilitation marketplace. This Privacy Policy governs the collection, storage, processing, and transmission of personal and business information provided by users, including individuals requesting service quotes (&quot;Customers&quot;), independent contractors or firms applying to join the network (&quot;Partners&quot; or &quot;Providers&quot;), and general visitors.
              </p>
              <p>
                By accessing KONNEVIA, submitting a quote request, applying as a service partner, or delivering a communication desk message, you acknowledge the data handling practices described in this document.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                2. Information We Collect
              </h2>
              <p>
                We collect information directly from you when you submit forms across the marketplace. We do not purchase external third-party consumer databases or conduct non-consensual surveillance.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-text-muted">
                <li>
                  <strong className="text-primary font-semibold">Customer Quote Enquiries:</strong> Full name, 10-digit mobile number, email address (optional), service category, specific service requested, operating city, locality/area, 6-digit PIN code, detailed project requirements, estimated budget parameters, expected timeline, and explicit consent records.
                </li>
                <li>
                  <strong className="text-primary font-semibold">Partner Registration Applications:</strong> Business or trade name, contact person name, mobile number, business email address, primary vertical, itemized services offered, operating city, geographic service areas, website URL, business description, and verification consent.
                </li>
                <li>
                  <strong className="text-primary font-semibold">General Communications:</strong> Name, email address, optional contact number, inquiry subject, and message body.
                </li>
                <li>
                  <strong className="text-primary font-semibold">Technical & Network Metadata:</strong> Originating IP address, User-Agent header, and HTTP submission timestamps recorded automatically for spam prevention and rate-limiting enforcement.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                3. Purposes of Data Processing
              </h2>
              <p>We process collected data strictly for transparent operational objectives:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-text-muted">
                <li>Reviewing and validating customer project specifications for technical clarity.</li>
                <li>Matching customer requirements with relevant, vetted service professionals.</li>
                <li>Transmitting verified quote parameters to selected partners following customer consent.</li>
                <li>Conducting verification of partner trade credentials, portfolios, and operating locations.</li>
                <li>Responding to user inquiries delivered to the KONNEVIA communication desk.</li>
                <li>Detecting automated abuse, rate-limit violations, and malicious submissions.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                4. Information Sharing & Provider Transmission
              </h2>
              <p>
                A core function of our marketplace is connecting customers with service professionals. We implement strict boundaries on data sharing:
              </p>
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-border/80 text-xs sm:text-sm space-y-2">
                <p className="font-semibold text-primary">
                  Selective, Consent-Gated Transmission:
                </p>
                <p className="text-text-muted">
                  Customer project scopes and contact details are shared <strong>only</strong> with up to three vetted service providers who match the exact service category, city, and scope requirements. Customers provide explicit affirmative consent prior to submission.
                </p>
                <p className="font-semibold text-primary pt-2">
                  No Open-Market Lead Brokering:
                </p>
                <p className="text-text-muted">
                  We <strong>never</strong> broadcast, auction, or sell customer contact information to broad telemarketing aggregators or unverified third parties.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                5. User Consent & Withdrawal Rights
              </h2>
              <p>
                All form submissions require affirmative opt-in consent checkboxes. We record the exact policy version (e.g., &quot;2026.1&quot;) and submission timestamp alongside every record.
              </p>
              <p>
                Users maintain the right to withdraw consent, request disclosure of collected personal information, or request permanent deletion of their lead record from our databases, subject to applicable statutory retention obligations. To exercise these rights, submit a written request to{' '}
                <a href="mailto:grievance@konnevia.in" className="text-accent font-semibold hover:underline">
                  grievance@konnevia.in
                </a>
                .
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                6. Cookies, Tracking & Local Storage
              </h2>
              <p>
                KONNEVIA uses minimal, privacy-respecting client technologies. We do not use third-party behavioral surveillance cookies or invasive fingerprinting scripts. Essential local storage is used solely to maintain user interface preferences and session continuity.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                7. Data Retention & Security Architecture
              </h2>
              <p>
                Lead records and partner submissions are stored within secured MongoDB Atlas clusters protected by role-based access control, encrypted connections (TLS/HTTPS), and IP allowlists.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-text-muted">
                <li>
                  <strong className="text-primary font-semibold">Active Leads:</strong> Retained for 180 days to facilitate project matching, quote revisions, and customer follow-up.
                </li>
                <li>
                  <strong className="text-primary font-semibold">Inactive / Closed Inquiries:</strong> Archived or purged following standard data cleanup cycles.
                </li>
                <li>
                  <strong className="text-primary font-semibold">Partner Credentials:</strong> Retained for the duration of the active partner relationship plus statutory recordkeeping periods.
                </li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                8. Third-Party Infrastructure Services
              </h2>
              <p>We rely on established enterprise infrastructure providers to deliver the platform:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-text-muted">
                <li><strong className="text-primary font-semibold">Database:</strong> MongoDB Atlas (Cloud database hosting).</li>
                <li><strong className="text-primary font-semibold">Hosting:</strong> Vercel / Netlify (Frontend edge distribution) and Render (Backend API).</li>
                <li><strong className="text-primary font-semibold">Operational Logging:</strong> Google Sheets API (Optional secondary administrative audit sink).</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                9. Grievance Redressal Officer
              </h2>
              <p>
                In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, the details of our Grievance Officer are published below:
              </p>
              <div className="bg-slate-50 p-5 rounded-2xl border border-border/80 text-xs sm:text-sm space-y-1 font-mono">
                <p className="font-bold text-primary">KONNEVIA Privacy & Grievance Desk</p>
                <p className="text-text-muted">Attention: Grievance Redressal Officer</p>
                <p className="text-text-muted">Email: grievance@konnevia.in</p>
                <p className="text-text-muted">General Communication: hello@konnevia.in</p>
                <p className="text-text-muted">Jurisdiction: New Delhi, India</p>
              </div>
            </section>

            {/* Section 10 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                10. Policy Modifications
              </h2>
              <p>
                We may periodically update this Privacy Policy to reflect modifications to platform features or regulatory requirements. Material revisions will be posted with an updated version number and revision date on this page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
