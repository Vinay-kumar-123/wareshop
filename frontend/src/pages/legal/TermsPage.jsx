import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Badge from '../../components/common/Badge.jsx';
import {
  FileText,
  AlertTriangle,
  Scale,
  ShieldCheck,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export default function TermsPage() {
  usePageMeta({
    title: 'Terms & Conditions — KONNEVIA Marketplace Agreement',
    description: 'Read the Terms & Conditions governing use of the KONNEVIA marketplace, facilitator role, provider standards, and commercial limitations.',
    canonical: 'https://konnevia.in/terms',
  });

  return (
    <div className="bg-background min-h-screen">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Terms & Conditions' }]} />
        </div>
      </div>

      <div className="container-max py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="teal">Platform Governance</Badge>
              <span className="text-xs font-semibold text-text-muted">VERSION 2026.1</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mb-3">
              KONNEVIA Marketplace Terms & Conditions
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              Effective Date: January 1, 2026 · Last Updated: November 12, 2026
            </p>
          </div>

          {/* Legal Review Callout */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 mb-10 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold block text-amber-950 mb-0.5">
                NOTICE: DRAFT TERMS SUBJECT TO FORMAL LEGAL COUNSEL REVIEW
              </strong>
              These marketplace terms define the operational relationship between KONNEVIA, platform users, and independent service providers. This document represents a working operational draft and requires formal review and customization by qualified Indian legal counsel prior to commercial launch.
            </div>
          </div>

          {/* Main Legal Content */}
          <div className="bg-white p-6 sm:p-12 rounded-3xl border border-border/80 shadow-xs space-y-10 text-text-primary text-sm sm:text-base leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                1. Marketplace Role & Scope of Service
              </h2>
              <p>
                KONNEVIA (&quot;the Platform&quot;) operates strictly as an intermediary technology marketplace connecting clients seeking specialized services with independent, third-party service providers across five core domains: Home & Construction, Events & Lifestyle, Business & Property, Digital & Professional, and Education & Career.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-border text-xs sm:text-sm text-primary font-semibold">
                IMPORTANT DISTINCTION: KONNEVIA is not an employer, general contractor, architect, event producer, legal counsel, or financial consultant. We do not personally execute on-site construction, manage banquets, or deliver contracted technical deliverables.
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                2. User & Customer Responsibilities
              </h2>
              <p>When utilizing KONNEVIA to source service professionals, clients agree to:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-text-muted">
                <li>Provide accurate, genuine, and non-fraudulent project requirements and contact details.</li>
                <li>Conduct independent due diligence, reference checks, and contract reviews before awarding contracts.</li>
                <li>Execute written agreements directly with selected providers specifying milestone deliverables, payment terms, and warranty scopes.</li>
                <li>Refrain from submitting duplicate, spam, or abusive enquiries to manipulate partner matching.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                3. Service Provider & Partner Standards
              </h2>
              <p>Service professionals applying for network inclusion agree to:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-text-muted">
                <li>Submit authentic, verified portfolio samples, business registrations (GST/PAN), and trade credentials.</li>
                <li>Honor scope proposals, pricing estimates, and milestone timelines delivered to introduced clients.</li>
                <li>Maintain necessary statutory licenses, insurance policies, and labor compliance required by applicable Indian state and central laws.</li>
                <li>Treat client project parameters and contact coordinates with strict confidentiality.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                4. Scope of Provider Verification
              </h2>
              <p>
                The label &quot;Verified Partner&quot; indicates that KONNEVIA&apos;s operations desk has confirmed initial trade registration, business location, portfolio samples, and contact coordinates at the time of onboarding.
              </p>
              <p className="text-text-muted text-xs sm:text-sm">
                Verification does not constitute an ongoing financial guarantee, professional endorsement, or insurance bond by KONNEVIA regarding future project performance, craftsmanship quality, or post-completion warranty fulfillment.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                5. Commercial Model & Direct Contracting
              </h2>
              <p>
                KONNEVIA operates on a transparent facilitation model. Introduction fees or listing memberships (where applicable) are agreed separately under bilateral partner agreements.
              </p>
              <p>
                All project contract disbursements, advance payments, milestone settlements, and retention fees are handled <strong>directly between the customer and the provider</strong>. KONNEVIA does not process payments or escrow customer funds on the platform during Phase 6.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                6. Disputes Between Customers & Providers
              </h2>
              <p>
                Because service contracts are executed bilaterally between customers and providers, any dispute arising from milestone delays, craftsmanship defects, scope disagreements, or non-payment must be resolved directly between the contracting parties according to their agreed contract terms and Indian contract law.
              </p>
              <p>
                KONNEVIA will, upon written request, assist in reviewing communication logs and verifying lead referral parameters to facilitate mutual amicable resolution.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                7. Prohibited Platform Activities
              </h2>
              <p>Users and providers are strictly prohibited from:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-text-muted">
                <li>Submitting fraudulent, deceptive, defamatory, or unlawful content.</li>
                <li>Reverse engineering, scraping, or mass extracting platform directory data.</li>
                <li>Injecting malicious scripts, bots, or automated submission crawlers.</li>
                <li>Circumventing platform communication channels to defame other marketplace participants.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                8. Limitation of Liability
              </h2>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                To the maximum extent permitted by applicable Indian law, KONNEVIA, its founders, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from project delays, property damage, defective execution, provider insolvencies, or customer non-payment resulting from bilateral contracts facilitated through the platform.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                9. Governing Law & Jurisdiction
              </h2>
              <p>
                These Terms and Conditions shall be governed by, and construed in accordance with, the laws of the Republic of India. Any legal dispute or proceeding arising out of or related to the use of KONNEVIA shall be subject to the exclusive jurisdiction of the competent courts in New Delhi, India.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                10. Contact & Clarifications
              </h2>
              <p>
                For questions regarding these platform terms, please contact our legal and compliance desk at{' '}
                <a href="mailto:hello@konnevia.in" className="text-accent font-semibold hover:underline">
                  hello@konnevia.in
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
