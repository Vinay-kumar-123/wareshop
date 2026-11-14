import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import ProviderCard from '../../components/marketplace/ProviderCard.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import providerService from '../../services/providerService.js';
import { categories } from '../../data/categories.js';
import {
  Search,
  MapPin,
  Filter,
  X,
  SlidersHorizontal,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const popularCities = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad'];

export default function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') || searchParams.get('service') || ''
  );
  const [locationTerm, setLocationTerm] = useState(
    searchParams.get('location') || searchParams.get('city') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || ''
  );

  const [providersList, setProvidersList] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  usePageMeta({
    title: 'Explore Commercial Properties & Businesses | WARESHOP',
    description:
      'Search and filter published commercial shops, offices, warehouses and godowns across India on WARESHOP.',
    canonical: 'https://wareshop.in/providers',
  });

  useEffect(() => {
    const searchParam = searchParams.get('search') || searchParams.get('service') || '';
    const locParam = searchParams.get('location') || searchParams.get('city') || '';
    const catParam = searchParams.get('category') || '';
    const pageParam = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

    setSearchTerm(searchParam);
    setLocationTerm(locParam);
    setSelectedCategory(catParam);

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    providerService
      .getProviders({
        categorySlug: catParam,
        location: locParam,
        search: searchParam,
        page: pageParam,
        limit: 12,
      })
      .then((res) => {
        if (isMounted) {
          setProvidersList(res.data || []);
          setPagination({
            total: res.total ?? (res.data || []).length,
            page: res.page || pageParam,
            limit: res.limit || 12,
            totalPages: res.totalPages || 1,
          });
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setProvidersList([]);
          setLoadError(err.message || 'Unable to load commercial listings right now.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, retryCount]);

  const updateUrlParams = ({ search, location, category, page = 1 }) => {
    const params = new URLSearchParams();
    if (search && search.trim()) params.set('search', search.trim());
    if (location && location.trim()) params.set('location', location.trim());
    if (category && category.trim()) params.set('category', category.trim());
    if (page > 1) params.set('page', String(page));
    setSearchParams(params);
  };

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    updateUrlParams({
      search: searchTerm,
      location: locationTerm,
      category: selectedCategory,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setLocationTerm('');
    setSelectedCategory('');
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    updateUrlParams({
      search: searchTerm,
      location: locationTerm,
      category: selectedCategory,
      page: newPage,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Boolean(
    searchParams.get('search') ||
      searchParams.get('service') ||
      searchParams.get('location') ||
      searchParams.get('city') ||
      searchParams.get('category')
  );

  const selectedCategoryObj = categories.find((item) => item.slug === selectedCategory);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Commercial Directory', href: '/providers' },
              ...(selectedCategoryObj ? [{ label: selectedCategoryObj.pluralName || selectedCategoryObj.name }] : []),
            ]}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-7">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1.5 block">
            WARESHOP Commercial Directory
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-2">
            {selectedCategoryObj
              ? `Published ${selectedCategoryObj.pluralName || selectedCategoryObj.name}`
              : 'Explore Commercial Properties & Businesses'}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Search published shops, offices, warehouses and godowns across India and connect directly
            with business owners.
          </p>
        </div>

        {/* Search & Filter Panel */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs mb-6">
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Keyword / Business Name */}
              <div>
                <label
                  htmlFor="search-service-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
                >
                  Keyword, Business or Service
                </label>
                <div className="relative flex items-center">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="search-service-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. retail showroom, logistics hub, coworking"
                    className="w-full pl-10 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-700"
                      aria-label="Clear keyword input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Location Input */}
              <div>
                <label
                  htmlFor="search-location-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
                >
                  City or Location
                </label>
                <div className="relative flex items-center">
                  <MapPin
                    className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="search-location-input"
                    type="text"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi, Bengaluru, Pune"
                    className="w-full pl-10 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                  {locationTerm && (
                    <button
                      type="button"
                      onClick={() => setLocationTerm('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-700"
                      aria-label="Clear location input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Select */}
              <div>
                <label
                  htmlFor="category-select"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
                >
                  Property Category
                </label>
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="">All Categories (Shop, Office, Warehouse, Godown)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.pluralName || cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Footer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-600 font-medium">
                {isLoading ? (
                  <span>Searching directory...</span>
                ) : (
                  <span>
                    Showing <strong className="text-slate-950">{providersList.length}</strong> of{' '}
                    <strong className="text-slate-950">{pagination.total}</strong> published listing
                    {pagination.total === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset Filters</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Search Listings</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Category & Location Quick Pills */}
        <div className="mb-7 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Category quick filters">
            <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">Categories:</span>
            <button
              type="button"
              onClick={() =>
                updateUrlParams({
                  search: searchTerm,
                  location: locationTerm,
                  category: '',
                  page: 1,
                })
              }
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                !selectedCategory
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() =>
                  updateUrlParams({
                    search: searchTerm,
                    location: locationTerm,
                    category: category.slug,
                    page: 1,
                  })
                }
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  selectedCategory === category.slug
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300'
                }`}
              >
                {category.pluralName || category.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Location quick filters">
            <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">Locations:</span>
            {popularCities.map((city) => {
              const isSelected = locationTerm.toLowerCase() === city.toLowerCase();
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() =>
                    updateUrlParams({
                      search: searchTerm,
                      location: isSelected ? '' : city,
                      category: selectedCategory,
                      page: 1,
                    })
                  }
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-orange-100 text-orange-800 border-orange-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listing Results / States */}
        {isLoading ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80">
            <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Loading commercial listings...</p>
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-xl mx-auto my-6"
          >
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-base font-bold text-rose-900 mb-1">
              Unable to Load Business Directory
            </h2>
            <p className="text-xs sm:text-sm text-rose-700 leading-relaxed mb-5">{loadError}</p>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : providersList.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {providersList.map((provider) => (
                <ProviderCard
                  key={provider._id || provider.slug || provider.id}
                  provider={provider}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <nav
                className="mt-10 flex items-center justify-center gap-2"
                aria-label="Directory pagination"
              >
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="px-4 py-2 text-xs font-bold text-slate-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            icon={SlidersHorizontal}
            title="No Matching Listings Found"
            description={
              hasActiveFilters
                ? "We couldn't find any published property or business matching your search filters. Try broadening your keyword or clearing the location filter."
                : 'No published commercial listings are available right now. Are you a property or business owner? Submit your listing for review.'
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold mt-2 cursor-pointer"
                >
                  Clear All Filters
                </button>
              ) : undefined
            }
            actionLabel={!hasActiveFilters ? 'List Your Property' : undefined}
            actionHref={!hasActiveFilters ? '/become-a-partner' : undefined}
          />
        )}
      </div>
    </div>
  );
}
