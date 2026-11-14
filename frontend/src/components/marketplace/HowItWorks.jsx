import React from 'react';
import { Search, Building2, PhoneCall, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import SectionHeading from '../common/SectionHeading.jsx';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Search by Category & City',
      description:
        'Filter commercial shops, offices, warehouses, and godowns by keyword, space type, city, or industrial locality.',
      icon: Search,
      badge: 'Instant Directory Search',
    },
    {
      step: '02',
      title: 'Inspect Verified Space Details',
      description:
        'Review property descriptions, facilities offered, service coverage, and owner-uploaded photographs.',
      icon: Building2,
      badge: 'Admin-Reviewed Profiles',
    },
    {
      step: '03',
      title: 'Call the Owner Directly',
      description:
        'Reveal the OTP-verified mobile number of the business or property owner and speak with them directly.',
      icon: PhoneCall,
      badge: 'Zero Middlemen or Brokerage',
    },
  ];

  return (
    <section
      className="section-padding bg-slate-50/80 border-y border-slate-200/80"
      aria-labelledby="hiw-title"
    >
      <div className="container-max">
        <SectionHeading
          id="hiw-title"
          tag="Direct Commercial Discovery"
          title="How WARESHOP Works"
          subtitle="Connect directly with commercial property and business owners across India without call-center lead brokers."
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-10">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/90 shadow-card flex flex-col justify-between relative group hover:border-[#F36B21]/50 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-lg bg-[#FFF5EF] border border-[#FFE6D5] flex items-center justify-center text-[#F36B21] group-hover:bg-[#F36B21] group-hover:text-white transition-colors duration-200">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md tracking-wider">
                    STEP {item.step}
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#171717] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F36B21]" aria-hidden="true" />
                  <span>{item.badge}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: 'OTP-Verified Mobile Numbers',
      description:
        'Every provider authenticates their Indian mobile number via 2Factor SMS OTP before submitting a listing.',
    },
    {
      icon: Building2,
      title: 'Administrator Review Gate',
      description:
        'All new submissions and listing edits are reviewed by WARESHOP administrators prior to publication.',
    },
    {
      icon: Lock,
      title: 'Anti-Scraping Contact Protection',
      description:
        'Owner phone numbers are never exposed in bulk JSON responses and are protected by rate-limited reveal endpoints.',
    },
    {
      icon: CheckCircle2,
      title: 'Zero Fake Ratings or Commissions',
      description:
        'We never fabricate reviews or intercept calls. Customers speak directly with the authorized property owner.',
    },
  ];

  return (
    <section className="section-padding bg-white" aria-labelledby="trust-title">
      <div className="container-max">
        <SectionHeading
          id="trust-title"
          tag="Governance & Trust"
          title="Built for Transparent Commercial Discovery"
          subtitle="Strict verification and data-integrity rules protect both commercial space seekers and business owners."
          align="center"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {pillars.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-xl bg-[#F7F8FA] border border-slate-200/80 flex flex-col justify-start"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FFF5EF] border border-[#FFE6D5] text-[#F36B21] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#171717] mb-1.5">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
