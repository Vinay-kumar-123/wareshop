import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Badge from '../../components/common/Badge.jsx';
import {
  ShieldCheck,
  Target,
  Compass,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  Calendar,
  Briefcase,
  GraduationCap,
  Sparkles,
  HelpCircle,
  FileText
} from 'lucide-react';

const CATEGORIES = [
  {
    title: 'Home & Construction',
    slug: 'home-construction',
    icon: Building2,
    description: 'Turnkey residential architects, civil contractors, interior fit-out firms, and specialized renovation supervisors.',
    highlights: ['Architectural planning & blueprints', 'Turnkey interior execution', 'Structural civil masonry'],
  },
  {
    title: 'Events & Lifestyle',
    slug: 'events-lifestyle',
    icon: Calendar,
    description: 'Full-service wedding curators, corporate production engineers, catering operations, and visual documentarians.',
    highlights: ['End-to-end wedding direction', 'Audio-visual stage production', 'Corporate banquet logistics'],
  },
  {
    title: 'Business & Property',
    slug: 'business-property',
    icon: Briefcase,
    description: 'Chartered accountants, legal advocates, commercial transaction advisors, and statutory compliance consultants.',
    highlights: ['Corporate registrations & taxation', 'Commercial lease vetting', 'Real estate due diligence'],
  },
  {
    title: 'Digital & Professional',
    slug: 'digital-professional',
    icon: Sparkles,
    description: 'Custom software engineers, growth performance marketers, brand designers, and corporate IT operations.',
    highlights: ['Full-stack web application engineering', 'Technical search optimization', 'Enterprise UI/UX systems'],
  },
  {
    title: 'Education & Career',
    slug: 'education-career',
    icon: GraduationCap,
    description: 'Executive corporate leadership trainers, international test preparation faculties, and career guidance advisors.',
    highlights: ['Executive leadership workshops', 'Higher education overseas advisory', 'Specialized test coaching'],
  },
];

export default function AboutPage() {
  usePageMeta({
    title: 'About KONNEVIA — Pan-India Service Discovery & Quality Facilitation',
    description: 'Learn about KONNEVIA’s manual-first marketplace model, structured service categories, and our mission to bring transparency to professional contracting across India.',
    canonical: 'https://konnevia.in/about',
  });

  return (
    <div className="bg-background min-h-screen">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'About Us' }]} />
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-white border-b border-border/80 py-16 sm:py-24">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 mb-4">
              <Badge variant="teal">Marketplace Foundations</Badge>
              <span className="text-xs font-semibold text-text-muted">PAN-INDIA DISCOVERY</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight leading-tight mb-6">
              Organizing High-Stakes Service Discovery Across India
            </h1>
            <p className="text-base sm:text-lg text-text-muted leading-relaxed mb-8 font-medium">
              KONNEVIA is a structured marketplace architecture connecting discerning individuals and growing businesses with verified, independent service professionals. We operate across five core domains where reliability, verifiable work samples, and transparent scope definitions matter most.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/categories" className="btn-primary py-3 px-6 text-sm font-semibold flex items-center gap-2">
                <span>Explore Marketplace Categories</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/become-a-partner" className="btn-secondary py-3 px-6 text-sm font-semibold">
                <span>Join as a Verified Partner</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Grid */}
      <section className="py-16 sm:py-20">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-border/80 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 font-bold">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3">Our Core Mission</h2>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed">
                To eliminate the ambiguity, fragmented negotiations, and inconsistent delivery common to unorganized service contracting in India. We equip clients with structured project scoping, transparent domain guides, and direct access to vetted regional specialists.
              </p>
            </div>

            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-border/80 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-accent-50 text-accent flex items-center justify-center mb-6 font-bold">
                <Compass className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3">Our Long-Term Vision</h2>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed">
                To build India’s most trusted technical and professional services network — where reputation is earned through verifiable milestone execution, transparent contract standards, and measurable client satisfaction rather than paid advertising prominence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 5 Finalized Categories */}
      <section className="py-16 sm:py-20 bg-white border-y border-border/80">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-3">
              Five Finalized Marketplace Verticals
            </h2>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed">
              Every category on KONNEVIA is built with domain-specific scoping attributes, ensuring clients receive tailored proposals and contractors receive well-defined specifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-border/70 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center text-primary mb-4 shadow-2xs">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-lg font-bold text-primary mb-2">{cat.title}</h3>
                    <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-4">
                      {cat.description}
                    </p>
                    <ul className="space-y-1.5 mb-6 text-xs text-text-primary">
                      {cat.highlights.map((h, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 mt-auto"
                  >
                    <span>View Category Providers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Transparent Explanation of Manual-First Operating Model */}
      <section className="py-16 sm:py-20">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="bg-primary text-white rounded-3xl p-8 sm:p-14 relative overflow-hidden shadow-md">
            <div className="max-w-3xl relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold mb-4">
                <ShieldCheck className="w-4 h-4 text-accent-light" />
                <span>Our Operational Model</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
                The Manual-First Operational Model
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-6">
                Unlike automated directory scrapers or lead-auction platforms where customer phone numbers are broadcast to dozens of telemarketers, KONNEVIA operates a human-reviewed, manual-first discovery desk:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10 text-xs sm:text-sm">
                <div>
                  <span className="text-accent-light font-bold block mb-1">1. Scope Review</span>
                  <p className="text-slate-300 leading-relaxed">
                    Every quote request is reviewed by our operations desk to verify technical clarity, budget alignment, and geographic feasibility before sharing.
                  </p>
                </div>
                <div>
                  <span className="text-accent-light font-bold block mb-1">2. Curated Match</span>
                  <p className="text-slate-300 leading-relaxed">
                    We connect you only with up to three vetted specialists who have demonstrated relevant portfolio experience in your exact service requirements.
                  </p>
                </div>
                <div>
                  <span className="text-accent-light font-bold block mb-1">3. Direct Contracts</span>
                  <p className="text-slate-300 leading-relaxed">
                    You hold full autonomy over direct contract negotiations, milestones, and payment disbursements with your chosen service provider.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer & Provider Value Propositions */}
      <section className="py-16 sm:py-20 bg-white border-t border-border/80">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Customer Value Prop */}
            <div className="bg-slate-50 border border-border/80 rounded-2xl p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" />
                <span>For Customers</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-primary mb-4">
                Contract With Confidence
              </h3>
              <ul className="space-y-4 text-sm text-text-primary">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-primary">No Spam or Lead Broadcasting:</strong>
                    Your contact coordinates are never sold to open-market telemarketing call centers.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-primary">Verified Documentation:</strong>
                    Review authentic portfolios, GST registrations, business addresses, and verified domains before hiring.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-primary">Clear Scope Checklists:</strong>
                    Benefit from domain-specific guides to evaluate milestone delivery and turnkey quotes.
                  </div>
                </li>
              </ul>
            </div>

            {/* Provider Value Prop */}
            <div className="bg-slate-50 border border-border/80 rounded-2xl p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4" />
                <span>For Independent Providers</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-primary mb-4">
                High-Intent, Scoped Enquiries
              </h3>
              <ul className="space-y-4 text-sm text-text-primary">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-primary">Pre-Qualified Project Leads:</strong>
                    Receive enquiries that contain genuine location, timeline, scope, and estimated budget parameters.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-primary">Direct Client Relationships:</strong>
                    Own your client relationship and contract terms without platform intermediation or commission holdbacks.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-primary">Editorial & Brand Visibility:</strong>
                    Showcase your verified work and subject-matter expertise across Pan-India category pages.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Governance & Compliance Notice */}
      <section className="py-12 bg-background border-t border-border/60">
        <div className="container-max px-4 sm:px-6 lg:px-8 text-center max-w-2xl">
          <p className="text-xs text-text-muted leading-relaxed mb-4">
            KONNEVIA is a marketplace facilitator. Individual service contracts, work guarantees, milestone payments, and on-site warranties are executed directly between the hiring client and the independent contractor.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs font-semibold text-accent">
            <Link to="/terms" className="hover:underline">Platform Terms</Link>
            <span className="text-border">•</span>
            <Link to="/privacy-policy" className="hover:underline">Privacy Governance</Link>
            <span className="text-border">•</span>
            <Link to="/contact" className="hover:underline">Communication Desk</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
