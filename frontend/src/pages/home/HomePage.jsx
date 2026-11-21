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
  ChevronRight,
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
  { city: 'Mumbai', region: 'Maharashtra' },
  { city: 'Delhi NCR', region: 'Delhi / Gurgaon / Noida' },
  { city: 'Bengaluru', region: 'Karnataka' },
  { city: 'Pune', region: 'Maharashtra' },
  { city: 'Hyderabad', region: 'Telangana' },
  { city: 'Chennai', region: 'Tamil Nadu' },
  { city: 'Ahmedabad', region: 'Gujarat' },
  { city: 'Kolkata', region: 'West Bengal' },
];

export default function HomePage() {
  usePageMeta({
    title: 'WARERENT | Commercial Shops, Offices, Warehouses & Godowns Across India',
    description:
      'Discover verified commercial shops, offices, warehouses and godowns across India on WARERENT. Connect directly with property and business owners.',
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
        const staticBySlug = new Map(staticCategories.map((c) => [c.slug, c]));
        const merged = apiCats.map((apiCat) => {
          const fallback = staticBySlug.get(String(apiCat.slug || '').toLowerCase()) || {};
          return {
            ...fallback,
            ...apiCat,
            id: apiCat._id || apiCat.slug,
            imageUrl: apiCat.imageUrl || fallback.imageUrl || '',
            shortDescription: apiCat.shortDescription || fallback.shortDescription,
            description: apiCat.description || fallback.description,
            subcategories: fallback.subcategories || [],
            listingCount:
              typeof apiCat.publishedCount === 'number'
                ? apiCat.publishedCount
                : apiCat.listingCount,
          };
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
      {/* =====================================================================
          SEARCH-FIRST TOP SECTION & COMMERCIAL CATEGORIES
          Immediate search bar below header + 4 primary categories (2x2 mobile)
      ====================================================================== */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 sm:pt-6 sm:pb-8">
          {/* Primary Search Section — Immediately visible below header */}
          <div className="max-w-4xl mx-auto">
            <HeroSearch />
          </div>

          {/* Four Primary Commercial Categories — 2-column mobile grid, 4-column desktop */}
          <div className="max-w-4xl mx-auto mt-3.5">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
              aria-label="Primary commercial categories"
            >
              {categoriesWithCounts.slice(0, 4).map((cat) => {
                const slug = String(cat.slug || '').toLowerCase();
                const Icon = categoryIcons[slug] || Building2;
                const displayLabel = cat.pluralName || cat.name;
                return (
                  <Link
                    key={cat.id || cat.slug}
                    to={`/categories/${cat.slug}`}
                    className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-[#FFF5EF] border border-slate-200 hover:border-[#F36B21]/50 transition-colors min-h-[54px]"
                  >
                    <span className="w-9 h-9 rounded-lg bg-white group-hover:bg-[#F36B21] text-[#F36B21] group-hover:text-white border border-slate-200/80 group-hover:border-[#F36B21] flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[13px] sm:text-sm font-bold text-[#171717] group-hover:text-[#F36B21] leading-tight">
                        {displayLabel}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate mt-0.5">
                        {cat.shortDescription || 'Commercial Space'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Concise Hero Section */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFF5EF] border border-[#FFE6D5] text-[#B4400E] text-xs font-semibold">
                  <Warehouse className="w-3.5 h-3.5 text-[#F36B21]" aria-hidden="true" />
                  <span>Direct Owner Contact • 0% Brokerage</span>
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-[#171717] tracking-tight leading-tight">
                  Find the Right Commercial Space for Your Business
                </h1>

                <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                  Discover shops, offices, warehouses and godowns across India. Connect directly
                  with verified property and business owners by phone.
                </p>

                <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    to="/providers"
                    className="h-11 px-5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors"
                  >
                    <span>Explore Properties</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/become-a-partner?tab=submit"
                    className="h-11 px-5 rounded-lg bg-white hover:bg-slate-50 text-[#171717] border border-slate-300 hover:border-slate-400 text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors"
                  >
                    <span>List Your Property Free</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 hidden sm:block">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/9] lg:aspect-[16/10] shadow-card">
                  <img
                    src={heroCommercialVisual}
                    alt="Commercial shops, offices, warehouses and godowns across India"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
                    <span className="inline-flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/15 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Email OTP Verified Owners</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/15 font-medium">
                      <PhoneCall className="w-3.5 h-3.5 text-[#F36B21]" aria-hidden="true" />
                      <span>Direct Phone Reveal</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          1. POPULAR COMMERCIAL CATEGORIES
      ====================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F36B21]">
              Commercial Verticals
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">
              Popular Commercial Categories
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Browse structured commercial property categories for retail, office, warehousing, and
              storage needs.
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs sm:text-sm font-semibold text-[#F36B21] hover:text-[#D95513] inline-flex items-center gap-1 shrink-0"
          >
            <span>View all categories</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categoriesWithCounts.map((category) => (
            <CategoryCard key={category.id || category.slug} category={category} />
          ))}
        </div>
      </section>

      {/* =====================================================================
          2. FEATURED / RECENTLY ADDED PROPERTIES
      ====================================================================== */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F36B21]">
                Live Directory
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">
                Featured Commercial Properties
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Administrator-reviewed commercial listings available for direct owner contact.
              </p>
            </div>

            <div
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0"
              role="tablist"
              aria-label="Filter featured listings by category"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeCategoryTab === ''}
                onClick={() => setActiveCategoryTab('')}
                className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
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
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F36B21] text-white border-[#F36B21]'
                        : 'bg-[#F7F8FA] text-slate-700 border-slate-200 hover:border-[#F36B21]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{cat.pluralName || cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
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
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2.5" aria-hidden="true" />
                <h3 className="text-base font-bold text-rose-900 mb-1">
                  Unable to Load Published Listings
                </h3>
                <p className="text-xs sm:text-sm text-rose-700 mb-4">{loadError}</p>
                <button
                  type="button"
                  onClick={() => fetchFeatured(activeCategoryTab)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-semibold cursor-pointer"
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
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-lg border border-slate-300 hover:border-[#F36B21] bg-white text-[#171717] hover:text-[#F36B21] text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
                  >
                    <span>Explore Complete Directory</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="bg-[#F7F8FA] rounded-xl border border-slate-200 p-6 sm:p-8">
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

      {/* =====================================================================
          3. EXPLORE BY LOCATION
      ====================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F36B21]">
              Regional Discovery
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">
              Explore by Location
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Filter commercial shops, offices, warehouses, and godowns in major business corridors.
            </p>
          </div>
          <Link
            to="/providers"
            className="text-xs sm:text-sm font-semibold text-[#F36B21] hover:text-[#D95513] inline-flex items-center gap-1 shrink-0"
          >
            <span>Search all cities</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {popularLocations.map((item) => (
            <Link
              key={item.city}
              to={`/providers?location=${encodeURIComponent(item.city)}`}
              className="group bg-white border border-slate-200 hover:border-[#F36B21]/60 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-2 shadow-2xs transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[#FFF5EF] text-[#F36B21] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs sm:text-sm font-bold text-[#171717] group-hover:text-[#F36B21] truncate">
                    {item.city}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">{item.region}</span>
                </div>
              </div>
              <ChevronRight
                className="w-4 h-4 text-slate-400 group-hover:text-[#F36B21] shrink-0"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* =====================================================================
          4. WHY CHOOSE WARERENT
      ====================================================================== */}
      <section className="bg-white border-t border-slate-200 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F36B21]">
              Marketplace Standards
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">
              Why Choose WARERENT
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Built for transparent commercial property discovery without middlemen or brokerage
              walls.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                icon: PhoneCall,
                title: 'Direct Owner Contact',
                description:
                  'Reveal the property or business owner’s mobile number and speak directly by phone without middlemen.',
              },
              {
                icon: ShieldCheck,
                title: 'Email OTP Verified Owners',
                description:
                  'Every provider authenticates their email via single-use OTP before submitting a listing.',
              },
              {
                icon: CheckCircle2,
                title: 'Administrator Moderated',
                description:
                  'New submissions and listing updates are reviewed by an administrator prior to publication.',
              },
              {
                icon: Lock,
                title: 'Protected Contact Privacy',
                description:
                  'Owner phone numbers are protected behind rate-limited reveal endpoints with explicit display consent.',
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-[#F36B21] flex items-center justify-center mb-3.5 shadow-2xs">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#171717]">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. PROPERTY OWNER CTA
      ====================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-[#171717] text-white rounded-xl p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#F36B21]/20 border border-[#F36B21]/40 text-[#FFA270] text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
              For Property & Business Owners
            </span>
            <h2 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">
              List Your Shop, Office, Warehouse or Godown Free
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Sign in with Email OTP or Google, submit your commercial property details, and receive
              direct calls from prospective tenants and businesses once published.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/become-a-partner?tab=submit"
              className="h-11 px-5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>List Your Property Free</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              to="/become-a-partner"
              className="h-11 px-4 rounded-lg border border-white/25 hover:border-white/50 bg-white/5 text-slate-100 text-xs sm:text-sm font-semibold inline-flex items-center justify-center transition-colors"
            >
              <span>Provider Login</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
