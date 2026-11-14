import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  Building2,
  PhoneCall,
  Store,
  Warehouse,
  Package,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Lock,
} from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { categories as staticCategories } from '../../data/categories.js';
import providerService from '../../services/providerService.js';
import HeroSearch from '../../components/marketplace/HeroSearch.jsx';
import ProviderCard from '../../components/marketplace/ProviderCard.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const categoryIcons = {
  shop: Store,
  office: Building2,
  warehouse: Warehouse,
  godown: Package,
};

const popularLocations = [
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Ahmedabad',
  'Kolkata',
];

export default function HomePage() {
  usePageMeta({
    title: 'WARESHOP | Commercial Shops, Offices, Warehouses & Godowns Across India',
    description:
      'Discover verified commercial shops, offices, warehouses and godowns across India on WARESHOP. Connect directly with property and business owners.',
    canonical: 'https://wareshop.in/',
  });

  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchFeatured = useCallback((catSlug = '') => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    providerService
      .getProviders({ categorySlug: catSlug, limit: 8 })
      .then((res) => {
        if (isMounted) {
          setFeaturedProviders((res.data || []).slice(0, 8));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFeaturedProviders([]);
          setLoadError(err.message || 'Unable to load featured listings right now.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchFeatured(activeCategoryTab);
    return cleanup;
  }, [fetchFeatured, activeCategoryTab]);

  return (
    <div className="bg-[#F8FAFC]">
      {/* Search-First Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50/70 via-white to-indigo-50/60 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 text-orange-700 text-xs font-bold uppercase tracking-wider">
              <Warehouse className="w-3.5 h-3.5" />
              <span>India’s Commercial Property & Business Directory</span>
            </div>
            <h1 className="mt-4 text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-[1.12]">
              Discover Commercial{' '}
              <span className="text-orange-600">Shops, Offices, Warehouses & Godowns</span>
            </h1>
            <p className="mt-3.5 text-sm sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Search verified commercial properties and businesses across India and call the owner
              directly — no middlemen, no central lead desk, and no commission walls.
            </p>
          </div>

          <div className="mt-7">
            <HeroSearch />
          </div>

          {/* Popular Locations */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 inline-flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              Popular hubs:
            </span>
            {popularLocations.map((loc) => (
              <Link
                key={loc}
                to={`/providers?location=${encodeURIComponent(loc)}`}
                className="bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-600 text-slate-700 font-semibold px-3 py-1.5 rounded-full shadow-2xs transition-colors"
              >
                {loc}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WARESHOP Primary Commercial Categories (Inspired by Reference Design) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Primary Verticals
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              WARESHOP Popular Categories
            </h2>
          </div>
          <Link
            to="/categories"
            className="text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
          >
            <span>Explore all categories</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {staticCategories.map((category) => {
            const Icon = categoryIcons[category.slug] || Building2;
            return (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-200 flex flex-col"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={category.imageUrl}
                    alt={category.pluralName || category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-white/95 text-orange-600 flex items-center justify-center shadow-xs">
                    <Icon className="w-5 h-5" />
                  </span>
                </div>
                <div className="p-4 sm:p-5 text-center flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {category.pluralName || category.name}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {category.shortDescription}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1 text-xs font-bold text-orange-600">
                    <span>Browse {category.pluralName || category.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Published Listings Section */}
      <section className="bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="inline-block bg-orange-100 text-orange-700 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                Featured Directory
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Explore Published Businesses & Spaces
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Real database listings reviewed and published on WARESHOP. Contact owners directly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCategoryTab('')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  activeCategoryTab === ''
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300'
                }`}
              >
                All Spaces
              </button>
              {staticCategories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setActiveCategoryTab(cat.slug)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    activeCategoryTab === cat.slug
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300'
                  }`}
                >
                  {cat.pluralName || cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            {isLoading ? (
              <div className="py-16 text-center">
                <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Loading published listings...
                </p>
              </div>
            ) : loadError ? (
              <div
                role="alert"
                className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center max-w-xl mx-auto"
              >
                <AlertCircle className="w-9 h-9 text-rose-600 mx-auto mb-2.5" aria-hidden="true" />
                <h3 className="text-base font-bold text-rose-900 mb-1">
                  Unable to Load Published Listings
                </h3>
                <p className="text-xs sm:text-sm text-rose-700 mb-4">{loadError}</p>
                <button
                  type="button"
                  onClick={() => fetchFeatured(activeCategoryTab)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            ) : featuredProviders.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {featuredProviders.map((provider) => (
                    <ProviderCard
                      key={provider._id || provider.slug || provider.id}
                      provider={provider}
                    />
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <Link
                    to={
                      activeCategoryTab
                        ? `/providers?category=${encodeURIComponent(activeCategoryTab)}`
                        : '/providers'
                    }
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 hover:border-orange-500 bg-white text-slate-900 hover:text-orange-600 text-xs sm:text-sm font-bold shadow-2xs transition-all"
                  >
                    <span>View All Published Listings</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Building2}
                title="No Published Listings Yet"
                description={
                  activeCategoryTab
                    ? `No published ${activeCategoryTab} listings are available right now. Check back soon or list your own commercial property.`
                    : 'Verified commercial shops, offices, warehouses and godowns will appear here once approved and published.'
                }
                actionLabel="List Your Property"
                actionHref="/become-a-partner"
              />
            )}
          </div>
        </div>
      </section>

      {/* How WARESHOP Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
            How WARESHOP Works
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-950">
            Direct Discovery from Search to Owner Call
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600">
            Unlike lead-broker platforms that trap your enquiry in a call center, WARESHOP connects
            you straight to the property or business owner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: Search,
              title: 'Search by Category & City',
              description:
                'Filter commercial shops, offices, warehouses and godowns by keyword, service offering, city, or locality.',
            },
            {
              step: '02',
              icon: Building2,
              title: 'Inspect Authentic Details',
              description:
                'Review business descriptions, services offered, operating locations, and owner-uploaded property photographs.',
            },
            {
              step: '03',
              icon: PhoneCall,
              title: 'Call the Owner Directly',
              description:
                'Reveal the OTP-verified mobile number of the business owner and place a direct phone call immediately.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-black text-slate-300 tracking-widest">
                    STEP {item.step}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust & Safety Section + Provider CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Trust & Safety Box */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span>Trust & Safety Standards</span>
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-black text-slate-900">
                Built for Transparent Commercial Discovery
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every listing on WARESHOP follows strict verification and data-integrity rules to
                protect both property seekers and business owners.
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      OTP-Verified Owner Numbers
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Providers authenticate their Indian mobile number via SMS OTP before listing.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Administrator Review Gate
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      New submissions and listing edits are reviewed before appearing publicly.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Anti-Scraping Contact Protection
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Owner phone numbers are protected behind rate-limited reveal endpoints.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Zero Fake Metrics
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      We never display fabricated ratings, fake reviews, or unverified pricing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List Your Property / Business CTA */}
          <div className="lg:col-span-5 bg-slate-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="inline-block text-orange-400 text-xs font-bold uppercase tracking-widest">
                For Property & Business Owners
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                List Your Shop, Office, Warehouse or Godown
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Register with your mobile number via OTP, submit your commercial property or
                business details, and receive direct phone calls from interested customers once
                published.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/become-a-partner?tab=submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold transition-colors"
              >
                <span>List Your Property</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/become-a-partner"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
              >
                <span>Provider Portal Login</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
