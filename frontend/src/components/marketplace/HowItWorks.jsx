import React from 'react';
import { Search, Send, UserCheck, Shield, CheckCircle2, Lock, FileText } from 'lucide-react';
import SectionHeading from '../common/SectionHeading.jsx';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Discover a Service',
      description: 'Explore approved marketplace categories, review verified offerings, and pinpoint the exact service you require.',
      icon: Search,
    },
    {
      step: '02',
      title: 'Submit an Enquiry',
      description: 'Share your project scope, location, timeline, and budget through our secure, transparent 2-minute enquiry form.',
      icon: Send,
    },
    {
      step: '03',
      title: 'Connect with a Suitable Provider',
      description: 'Our advisory team manually verifies your enquiry and introduces you to vetted professionals with your explicit consent.',
      icon: UserCheck,
    },
  ];

  return (
    <section className="section-padding bg-slate-50/70 border-y border-border/60" aria-labelledby="hiw-title">
      <div className="container-max">
        <SectionHeading
          id="hiw-title"
          tag="Simple & Controlled Workflow"
          title="How KONNEVIA Works"
          subtitle="A disciplined, human-assisted process connecting customers with verified professionals without algorithmic guesswork."
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 mt-10">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-white p-7 sm:p-8 rounded-lg border border-border/80 shadow-card flex flex-col justify-between relative group hover:border-accent/40 transition-all duration-200"
              >
                {/* Step indicator pill */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-2xl font-black text-accent tracking-tight">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-lg bg-accent-50 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-200">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-primary mb-3">
                    {item.title}
                  </h3>
                  <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-semibold text-text-muted/80 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  <span>Manual review at every step</span>
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
      icon: Shield,
      title: 'Manual Enquiry Verification',
      description: 'Every customer requirement is individually verified by our internal operations team before any provider assignment is initiated.',
    },
    {
      icon: FileText,
      title: 'Vetted Provider Credentials',
      description: 'Provider listings and claimed specialties are manually validated with written authorization prior to publication on the platform.',
    },
    {
      icon: Lock,
      title: 'Explicit Customer Consent',
      description: 'Your contact details are strictly confidential. We never broadcast your phone number or allow unsolicited vendor telemarketing.',
    },
    {
      icon: CheckCircle2,
      title: 'Transparent Commission Model',
      description: 'Zero upfront fees for customers. Transparent commission terms agreed in writing with partners upon successful project completion.',
    },
  ];

  return (
    <section className="section-padding bg-white" aria-labelledby="trust-title">
      <div className="container-max">
        <SectionHeading
          id="trust-title"
          tag="Integrity & Transparency"
          title="Why Customers & Providers Trust KONNEVIA"
          subtitle="Built on high-touch quality assurance and consent-first data governance, not lead spam directories."
          align="center"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7 mt-10">
          {pillars.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-lg bg-background border border-border/80 flex flex-col justify-start"
              >
                <div className="w-11 h-11 rounded-md bg-accent-50 text-accent flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
