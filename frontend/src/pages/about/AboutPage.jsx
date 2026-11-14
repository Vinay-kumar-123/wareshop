import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import { categories } from '../../data/categories.js';
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
    title: 'About WARESHOP | Commercial Property & Business Directory',
    description:
      'Learn how WARESHOP connects businesses and customers directly with commercial shop, office, warehouse and godown owners across India.',
    canonical: 'https://wareshop.in/about',
  });

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'About WARESHOP' }]} />
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200/80 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Warehouse className="w-3.5 h-3.5" />
              <span>Commercial Property & Business Marketplace</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight mb-5">
              Direct Commercial Discovery Across India
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8">
              WARESHOP is a commercial business and property discovery marketplace built to help
              retailers, enterprises, logistics operators, and traders find{' '}
              <strong className="text-slate-900 font-semibold">
                Shops, Offices, Warehouses, and Godowns
              </strong>{' '}
              and contact their owners directly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/providers"
                className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-xs transition-colors"
              >
                <span>Explore Directory</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/become-a-partner"
                className="inline-flex items-center gap-2 py-3 px-6 rounded-xl border border-slate-300 bg-white hover:border-orange-400 text-slate-800 text-sm font-bold transition-colors"
              >
                <span>List Your Property</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Direct-Contact Philosophy */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-5">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mb-3">Our Core Mission</h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Commercial property search in India is often slowed down by opaque lead brokers and
                middlemen call centers. WARESHOP provides a clean, searchable directory where
                verified business and property owners publish their spaces and customers reach out to
                them directly by phone.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                <Compass className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mb-3">
                Direct Customer-to-Business Model
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                WARESHOP does not collect customer leads into a central admin inbox or resell your
                phone number. When you find a suitable shop, office, warehouse, or godown, you
                reveal the owner’s OTP-verified contact number and speak with them directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Four Primary Commercial Categories */}
      <section className="py-12 sm:py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 mb-2">
              Four Primary Commercial Verticals
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every listing on WARESHOP is organized by commercial property and business category for
              fast, structured discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Building2;
              return (
                <div
                  key={cat.slug}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-orange-600 mb-4 shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">
                      {cat.pluralName || cat.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                      {cat.description}
                    </p>
                    <ul className="space-y-1.5 mb-6 text-xs text-slate-700">
                      {(cat.popularServices || []).slice(0, 3).map((service, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1 mt-auto"
                  >
                    <span>Browse {cat.pluralName || cat.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" />
                <span>For Customers & Tenants</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 mb-4">
                Search & Call Without Friction
              </h3>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <PhoneCall className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-slate-900">
                      Direct Owner Phone Numbers:
                    </strong>
                    Reveal the verified mobile number of the business or property owner and call
                    immediately.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-slate-900">
                      No Enquiry Spam:
                    </strong>
                    Browse the marketplace and call owners directly without filling out lead forms.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-slate-900">
                      Moderated Directory:
                    </strong>
                    Only administrator-reviewed and approved listings are published to the public
                    directory.
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4" />
                <span>For Property & Business Owners</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 mb-4">
                Showcase Your Commercial Space
              </h3>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-slate-900">
                      Fast 2Factor SMS OTP Login:
                    </strong>
                    Authenticate with your Indian mobile number and manage all your listings from a
                    dedicated Provider Dashboard.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-slate-900">
                      Receive Direct Customer Calls:
                    </strong>
                    Interested customers contact you directly on your verified phone number with
                    full display-consent control.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-slate-900">
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
