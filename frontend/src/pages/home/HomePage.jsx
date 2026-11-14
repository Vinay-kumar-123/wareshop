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
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { categories as staticCategories } from '../../data/categories.js';
import { heroCommercialVisual } from '../../assets/categories/index.js';
import providerService from '../../services/providerService.js';
import HeroSearch from '../../components/marketplace/HeroSearch.jsx';
import CategoryCard from '../../components/marketplace/CategoryCard.jsx';
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
  const [categoriesWithCounts, setCategoriesWithCounts] = useState(staticCategories);
  const [activeCategoryTab, setActiveCategoryTab] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    providerService
      .getPublicCategories()
      .then((apiCats) => {
        if (!isMounted || !Array.isArray(apiCats) || apiCats.length === 0) return;
        const apiBySlug = new Map(apiCats.map((c) => [String(c.slug || '').toLowerCase(), c]));
        const merged = staticCategories.map((sc) => {
          const found = apiBySlug.get(sc.slug);
          return found
            ? {
                ...sc,
                listingCount:
                  typeof found.publishedCount === 'number'
                    ? found.publishedCount
                    : found.listingCount,
              }
            : sc;
        });
        setCategoriesWithCounts(merged);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

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
    <div className="bg-[#F7F8FA]">
      {/* Search-First Commercial Marketplace Hero Section */}
      <section className="relative bg-white border-b border-slate-200/90 overflow-hidden">
        {/* Subtle Architectural Grid Accent */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-12 sm:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center mb-8">
            {/* Hero Copy & Value Proposition */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFF5EF] border border-[#FFE6D5] text-[#B4400E] text-xs font-bold uppercase tracking-wider">
                <Warehouse className="w-3.5 h-3.5 text-[#F36B21]" />
                <span>India’s Commercial Property & Business Marketplace</span>
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[44px] font-black text-[#171717] tracking-tight leading-[1.12]">
                Discover Verified Commercial{' '}
                <span className="text-[#F36B21]">Shops, Offices, Warehouses & Godowns</span>
              </h1>

              <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                Search commercial properties and businesses across India’s top industrial and retail
                corridors. Reveal the owner’s OTP-verified mobile number and call directly — with{' '}
                <strong className="text-[#171717] font-semibold">
                  zero middlemen and zero brokerage walls
                </strong>
                .
              </p>

              {/* Quick Trust Pills */}
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>2Factor SMS OTP Verified Owners</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
                  <PhoneCall className="w-4 h-4 text-[#F36B21]" />
                  <span>Direct Owner Phone Reveal</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Administrator Reviewed</span>
                </span>
              </div>
            </div>

            {/* Hero Visual Showcase Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-elevated bg-slate-900">
                <img
                  src={heroCommercialVisual}
                  alt="Modern commercial business park, retail showrooms and warehousing in India"
                  className="w-full h-56 sm:h-64 object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="bg-slate-950/80 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md border border-white/15">
                    4 Core Commercial Verticals
                  </span>
                  <Link
                    to="/become-a-partner?tab=submit"
                    className="bg-[#F36B21] hover:bg-[#D95513] text-white text-[11px] font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1 transition-colors"
                  >
                    <span>List Space</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Mini 4-Category Overlay Strip */}
                <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {staticCategories.map((cat) => {
                    const Icon = categoryIcons[cat.slug] || Building2;
                    return (
                      <Link
                        key={cat.slug}
                        to={`/categories/${cat.slug}`}
                        className="bg-white/95 hover:bg-[#FFF5EF] backdrop-blur-xs rounded-lg p-2 text-left transition-colors group"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#F36B21] mb-1" />
                        <span className="block text-[11px] font-extrabold text-[#171717] group-hover:text-[#F36B21] leading-tight">
                          {cat.pluralName || cat.name}
                        </span>
                        <span className="block text-[9px] text-slate-500 truncate">
                          {cat.shortDescription}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Search Module */}
          <HeroSearch />

          {/* Popular Locations Chips */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 inline-flex items-center gap-1.5 mr-1">
              <MapPin className="w-3.5 h-3.5 text-[#F36B21]" />
              <span>Popular Commercial Hubs:</span>
            </span>
            {popularLocations.map((loc) => (
              <Link
                key={loc}
                to={`/providers?location=${encodeURIComponent(loc)}`}
                className="bg-[#F7F8FA] border border-slate-200/90 hover:border-[#F36B21] hover:bg-[#FFF5EF] hover:text-[#B4400E] text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {loc}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Four Visually Appealing Primary Category Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#F36B21]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Commercial Space Taxonomy</span>
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Browse by Commercial Category
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Structured commercial verticals covering retail, corporate offices, logistics hubs, and
              storage godowns.
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs sm:text-sm font-bold text-[#F36B21] hover:text-[#D95513] inline-flex items-center gap-1.5 shrink-0"
          >
            <span>View all category specifications</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoriesWithCounts.map((category) => (
            <CategoryCard key={category.id || category.slug} category={category} />
          ))}
        </div>
      </section>

      {/* Featured Published Listings Section */}
      <section className="bg-white border-y border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="inline-block bg-[#FFF5EF] text-[#B4400E] border border-[#FFE6D5] text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                Live Marketplace Directory
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                Featured Commercial Listings
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Verified database listings approved for public discovery and direct owner contact.
              </p>
            </div>

            <div
              className="flex flex-wrap items-center gap-1.5"
              role="tablist"
              aria-label="Filter featured listings by category"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeCategoryTab === ''}
                onClick={() => setActiveCategoryTab('')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  activeCategoryTab === ''
                    ? 'bg-[#171717] text-white border-[#171717]'
                    : 'bg-[#F7F8FA] text-slate-700 border-slate-200 hover:border-[#F36B21]'
                }`}
              >
                All Spaces
              </button>
              {staticCategories.map((cat) => {
                const Icon = categoryIcons[cat.slug] || Building2;
                const isSelected = activeCategoryTab === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveCategoryTab(cat.slug)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F36B21] text-white border-[#F36B21]'
                        : 'bg-[#F7F8FA] text-slate-700 border-slate-200 hover:border-[#F36B21]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.pluralName || cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs animate-pulse"
                  >
                    <div className="aspect-[16/10] bg-slate-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-5 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-full" />
                      <div className="h-9 bg-slate-200 rounded w-full mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div
                role="alert"
                className="bg-rose-50/90 border border-rose-200 rounded-xl p-6 sm:p-8 text-center max-w-xl mx-auto"
              >
                <AlertCircle className="w-9 h-9 text-rose-600 mx-auto mb-2.5" aria-hidden="true" />
                <h3 className="text-base font-bold text-rose-900 mb-1">
                  Unable to Load Published Listings
                </h3>
                <p className="text-xs sm:text-sm text-rose-700 mb-4">{loadError}</p>
                <button
                  type="button"
                  onClick={() => fetchFeatured(activeCategoryTab)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer"
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
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 hover:border-[#F36B21] bg-white text-[#171717] hover:text-[#F36B21] text-xs sm:text-sm font-bold shadow-2xs transition-all"
                  >
                    <span>Explore Complete Directory</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="bg-[#F7F8FA] rounded-xl border border-slate-200/90 p-6 sm:p-8">
                <EmptyState
                  icon={Building2}
                  title="No Published Listings Yet"
                  description={
                    activeCategoryTab
                      ? `No published ${activeCategoryTab} listings are available right now. Check back soon or list your own commercial property.`
                      : 'Verified commercial shops, offices, warehouses and godowns will appear here once approved and published by an administrator.'
                  }
                  actionLabel="List Your Property Free"
                  actionHref="/become-a-partner?tab=submit"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How WARESHOP Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F36B21]">
            Direct Discovery Workflow
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            How WARESHOP Works
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600">
            Unlike lead-broker platforms that trap your enquiry in a call center, WARESHOP connects
            you straight to the verified property or business owner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: Search,
              title: 'Search by Category & City',
              description:
                'Filter commercial shops, offices, warehouses and godowns by keyword, facility requirement, city, or locality.',
              tag: 'Structured Filters',
            },
            {
              step: '02',
              icon: Building2,
              title: 'Inspect Authentic Details',
              description:
                'Review business descriptions, facilities offered, operating locations, and owner-uploaded property photographs.',
              tag: 'Admin Moderated',
            },
            {
              step: '03',
              icon: PhoneCall,
              title: 'Call the Owner Directly',
              description:
                'Reveal the OTP-verified mobile number of the business owner and place a direct phone call immediately.',
              tag: '0% Commission',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-card hover:border-[#F36B21]/50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="w-11 h-11 rounded-lg bg-[#FFF5EF] border border-[#FFE6D5] text-[#F36B21] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded tracking-widest">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#171717]">{item.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-[#F36B21]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{item.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust & Safety Section + Provider Registration CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Trust & Safety Box */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-6 sm:p-8 shadow-card flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Trust & Safety Standards</span>
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-black text-[#171717]">
                Built for Transparent Commercial Discovery
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every listing on WARESHOP follows strict verification and data-integrity rules to
                protect both property seekers and business owners.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#171717]">
                      OTP-Verified Owner Numbers
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Providers authenticate their Indian mobile number via SMS OTP before listing.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#171717]">
                      Administrator Review Gate
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      New submissions and listing edits are reviewed before appearing publicly.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#171717]">
                      Anti-Scraping Contact Protection
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Owner phone numbers are protected behind rate-limited reveal endpoints.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#171717]">
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
          <div className="lg:col-span-5 bg-[#171717] text-white rounded-xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-card">
            <img
              src={heroCommercialVisual}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
            />
            <div className="relative z-10">
              <span className="inline-block bg-[#F36B21]/20 border border-[#F36B21]/40 text-[#FFA270] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                For Property & Business Owners
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black leading-tight">
                List Your Shop, Office, Warehouse or Godown
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Register with your mobile number via 2Factor SMS OTP, submit your commercial
                property or business details, and receive direct phone calls from interested
                customers once published.
              </p>
            </div>

            <div className="relative z-10 mt-6 pt-5 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/become-a-partner?tab=submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-bold transition-colors"
              >
                <span>List Your Property</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/become-a-partner"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/25 hover:border-white/50 bg-white/5 text-slate-100 text-xs sm:text-sm font-semibold transition-colors"
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
