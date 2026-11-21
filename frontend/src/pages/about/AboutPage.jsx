import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import { categories } from '../../data/categories.js';
import { heroCommercialVisual } from '../../assets/categories/index.js';
import {
  ShieldCheck,
  Target,
  Compass,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  Store,
  Warehouse,
  Package,
  PhoneCall,
} from 'lucide-react';

const iconMap = {
  Store,
  Building2,
  Warehouse,
  Package,
};

export default function AboutPage() {
  usePageMeta({
    title: 'About WARERENT | Commercial Property & Business Directory',
    description:
      'Learn how WARERENT connects businesses and customers directly with commercial shop, office, warehouse and godown owners across India.',
    canonical: 'https://wareshop.in/about',
  });

  return (
    <div className="bg-[#F7F8FA] min-h-screen pb-16">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'About WARERENT' }]} />
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200/90 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFF5EF] border border-[#FFE6D5] text-[#B4400E] text-xs font-bold uppercase tracking-wider mb-4">
                <Warehouse className="w-3.5 h-3.5 text-[#F36B21]" />
                <span>Commercial Property & Business Marketplace</span>
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-[#171717] tracking-tight leading-tight mb-5">
                Direct Commercial Discovery Across India
              </h1>
              <p className="text-sm sm:text-lg text-slate-600 leading-relaxed mb-7">
                WARERENT is a commercial business and property discovery marketplace built to help
                retailers, enterprises, logistics operators, and traders find{' '}
                <strong className="text-[#171717] font-semibold">
                  Shops, Offices, Warehouses, and Godowns
                </strong>{' '}
                and contact their owners directly.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/providers"
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-bold shadow-2xs transition-colors"
                >
                  <span>Explore Directory</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/become-a-partner"
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-lg border border-slate-300 bg-white hover:border-[#F36B21] text-[#171717] text-xs sm:text-sm font-bold transition-colors"
                >
                  <span>List Your Property</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-elevated bg-slate-900">
                <img
                  src={heroCommercialVisual}
                  alt="WARERENT commercial real estate and business infrastructure"
                  className="w-full h-64 sm:h-72 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Direct-Contact Philosophy */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-7 sm:p-8 rounded-xl border border-slate-200/90 shadow-card">
              <div className="w-11 h-11 rounded-lg bg-[#FFF5EF] border border-[#FFE6D5] text-[#F36B21] flex items-center justify-center mb-5">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#171717] mb-3">Our Core Mission</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Commercial property search in India is often slowed down by opaque lead brokers and
                middlemen call centers. WARERENT provides a clean, searchable directory where
                verified business and property owners publish their spaces and customers reach out to
                them directly by phone.
              </p>
            </div>

            <div className="bg-white p-7 sm:p-8 rounded-xl border border-slate-200/90 shadow-card">
              <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-5">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#171717] mb-3">
                Direct Customer-to-Business Model
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                WARERENT does not collect customer leads into a central admin inbox or resell your
                phone number. When you find a suitable shop, office, warehouse, or godown, you
                reveal the email-verified owner’s business contact number and speak with them
                directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Four Primary Commercial Categories */}
      <section className="py-12 sm:py-16 bg-white border-y border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F36B21]">
              Marketplace Coverage
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-[#171717] mb-2">
              Four Primary Commercial Verticals
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every listing on WARERENT is organized by commercial property and business category for
              fast, structured discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Building2;
              return (
                <div
                  key={cat.slug}
                  className="rounded-xl bg-[#F7F8FA] border border-slate-200/90 overflow-hidden flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="aspect-[16/10] bg-slate-200 overflow-hidden relative">
                      <img
                        src={cat.imageUrl}
                        alt={cat.pluralName || cat.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/95 text-[#F36B21] flex items-center justify-center shadow-2xs">
                        <Icon className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-extrabold text-[#171717] mb-1.5">
                        {cat.pluralName || cat.name}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {cat.description}
                      </p>
                      <ul className="space-y-1.5 mb-4 text-xs text-slate-700">
                        {(cat.popularServices || []).slice(0, 3).map((service, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#F36B21] shrink-0" />
                            <span>{service}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <Link
                      to={`/categories/${cat.slug}`}
                      className="text-xs font-bold text-[#F36B21] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Browse {cat.pluralName || cat.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="pt-12 sm:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200/90 rounded-xl p-7 sm:p-8 shadow-card">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#F36B21] uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" />
                <span>For Customers & Tenants</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#171717] mb-4">
                Search & Call Without Friction
              </h3>
              <ul className="space-y-4 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <PhoneCall className="w-5 h-5 text-[#F36B21] shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-[#171717]">
                      Direct Owner Phone Numbers:
                    </strong>
                    Reveal the business mobile number of the email-verified property or business
                    owner and call immediately.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#F36B21] shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-[#171717]">No Enquiry Spam:</strong>
                    Browse the marketplace and call owners directly without filling out lead forms.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#F36B21] shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-[#171717]">Moderated Directory:</strong>
                    Only administrator-reviewed and approved listings are published to the public
                    directory.
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-7 sm:p-8 shadow-card">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4" />
                <span>For Property & Business Owners</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#171717] mb-4">
                Showcase Your Commercial Space
              </h3>
              <ul className="space-y-4 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-[#171717]">
                      Fast Email OTP Login:
                    </strong>
                    Authenticate with your verified email address and manage all your listings from
                    a dedicated Provider Dashboard.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-[#171717]">
                      Receive Direct Customer Calls:
                    </strong>
                    Interested customers contact you directly on your business mobile number with
                    full display-consent control.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-[#171717]">
                      Transparent Lifecycle Status:
                    </strong>
                    Track your application from submission to approval and publication in real time.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
