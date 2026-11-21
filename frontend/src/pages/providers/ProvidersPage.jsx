import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  Store,
  Building2,
  Warehouse,
  Package,
  ShieldCheck,
  PlusCircle,
  ArrowUpDown,
} from 'lucide-react';

const popularCities = [
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Ahmedabad',
  'Kolkata',
];

const categoryIcons = {
  shop: Store,
  office: Building2,
  warehouse: Warehouse,
  godown: Package,
};

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
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recent');

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
    title: 'Explore Commercial Properties & Businesses | WARERENT',
    description:
      'Search and filter published commercial shops, offices, warehouses and godowns across India on WARERENT.',
    canonical: 'https://wareshop.in/providers',
  });

  useEffect(() => {
    const searchParam = searchParams.get('search') || searchParams.get('service') || '';
    const locParam = searchParams.get('location') || searchParams.get('city') || '';
    const catParam = searchParams.get('category') || '';
    const sortParam = searchParams.get('sort') || 'recent';
    const pageParam = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

    setSearchTerm(searchParam);
    setLocationTerm(locParam);
    setSelectedCategory(catParam);
    setSortBy(sortParam);

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

  const updateUrlParams = ({ search, location, category, sort = sortBy, page = 1 }) => {
    const params = new URLSearchParams();
    if (search && search.trim()) params.set('search', search.trim());
    if (location && location.trim()) params.set('location', location.trim());
    if (category && category.trim()) params.set('category', category.trim());
    if (sort && sort !== 'recent') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params);
  };

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    updateUrlParams({
      search: searchTerm,
      location: locationTerm,
      category: selectedCategory,
      sort: sortBy,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setLocationTerm('');
    setSelectedCategory('');
    setSortBy('recent');
    setSearchParams(new URLSearchParams());
  };

  const sortedProviders = useMemo(() => {
    const list = [...providersList];
    if (sortBy === 'name-asc') {
      list.sort((a, b) => String(a.businessName || '').localeCompare(String(b.businessName || '')));
    } else if (sortBy === 'city-asc') {
      list.sort((a, b) => String(a.city || '').localeCompare(String(b.city || '')));
    } else if (sortBy === 'photo-first') {
      list.sort((a, b) => Number(Boolean(b.shopImage?.url)) - Number(Boolean(a.shopImage?.url)));
    }
    return list;
  }, [providersList, sortBy]);

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

  const activeSearch = searchParams.get('search') || searchParams.get('service') || '';
  const activeLocation = searchParams.get('location') || searchParams.get('city') || '';
  const activeCategory = searchParams.get('category') || '';

  const hasActiveFilters = Boolean(activeSearch || activeLocation || activeCategory);
  const selectedCategoryObj = categories.find((item) => item.slug === selectedCategory);

  return (
    <div className="bg-[#F7F8FA] min-h-screen pb-16">
      {/* Compact Marketplace Header */}
      <div className="bg-white border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-100">
          <Breadcrumb
            items={[
              { label: 'Commercial Directory', href: '/providers' },
              ...(selectedCategoryObj
                ? [{ label: selectedCategoryObj.pluralName || selectedCategoryObj.name }]
                : []),
            ]}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F36B21] mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Commercial Marketplace Directory</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#171717] tracking-tight leading-tight">
              {selectedCategoryObj
                ? `Published ${selectedCategoryObj.pluralName || selectedCategoryObj.name}`
                : 'Explore Commercial Properties & Businesses'}
            </h1>
            <p className="mt-1.5 text-slate-600 text-xs sm:text-sm leading-relaxed">
              {selectedCategoryObj
                ? selectedCategoryObj.description
                : 'Search verified commercial shops, offices, warehouses, and godowns across India and call the owner directly.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/become-a-partner?tab=submit"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#FFF5EF] hover:bg-[#FFE6D5] border border-[#FFC8A8] text-[#B4400E] text-xs font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-[#F36B21]" />
              <span>List Your Property Free</span>
            </Link>
          </div>
        </div>

        {/* Horizontal Category Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 bg-slate-50/60">
          <div
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5"
            aria-label="Category quick filters"
          >
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
              className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                !selectedCategory
                  ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-[#F36B21]'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => {
              const Icon = categoryIcons[category.slug] || Building2;
              const isSelected = selectedCategory === category.slug;
              return (
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
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#F36B21] text-white border-[#F36B21] shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#F36B21]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{category.pluralName || category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 sm:pt-8 px-4 sm:px-6 lg:px-8">
        {/* Search & Filter Panel */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-card mb-6">
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Keyword / Business Name */}
              <div className="md:col-span-5">
                <label
                  htmlFor="search-service-input"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
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
                    className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-[#F7F8FA] border border-slate-300 rounded-lg text-[#171717] focus:outline-none focus:border-[#F36B21] focus:bg-white transition-colors"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Clear keyword input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Location Input */}
              <div className="md:col-span-4">
                <label
                  htmlFor="search-location-input"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
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
                    className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-[#F7F8FA] border border-slate-300 rounded-lg text-[#171717] focus:outline-none focus:border-[#F36B21] focus:bg-white transition-colors"
                  />
                  {locationTerm && (
                    <button
                      type="button"
                      onClick={() => setLocationTerm('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Clear location input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Select */}
              <div className="md:col-span-3">
                <label
                  htmlFor="category-select"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
                >
                  Property Category
                </label>
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F7F8FA] border border-slate-300 rounded-lg text-[#171717] font-medium focus:outline-none focus:border-[#F36B21] focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.pluralName || cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Popular Location Quick Pills + Filter Footer Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div
                className="flex flex-wrap items-center gap-1.5"
                aria-label="Location quick filters"
              >
                <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">
                  Popular Cities:
                </span>
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
                      className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF5EF] text-[#B4400E] border-[#F36B21]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-[#F36B21]'
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset Filters</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Search Listings</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Summary, Active Filter Chips & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs sm:text-sm text-slate-600 font-medium">
              {isLoading ? (
                <span>Searching commercial directory...</span>
              ) : (
                <span>
                  Showing <strong className="text-[#171717] font-bold">{sortedProviders.length}</strong>{' '}
                  of <strong className="text-[#171717] font-bold">{pagination.total}</strong>{' '}
                  published listing{pagination.total === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium mr-1">Active filters:</span>
                {activeCategory && (
                  <button
                    type="button"
                    onClick={() =>
                      updateUrlParams({
                        search: activeSearch,
                        location: activeLocation,
                        category: '',
                        page: 1,
                      })
                    }
                    className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-rose-300 px-2.5 py-1 rounded-md font-semibold text-slate-700 cursor-pointer"
                  >
                    <span>Category: {selectedCategoryObj?.name || activeCategory}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {activeLocation && (
                  <button
                    type="button"
                    onClick={() =>
                      updateUrlParams({
                        search: activeSearch,
                        location: '',
                        category: activeCategory,
                        page: 1,
                      })
                    }
                    className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-rose-300 px-2.5 py-1 rounded-md font-semibold text-slate-700 cursor-pointer"
                  >
                    <span>Location: {activeLocation}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {activeSearch && (
                  <button
                    type="button"
                    onClick={() =>
                      updateUrlParams({
                        search: '',
                        location: activeLocation,
                        category: activeCategory,
                        page: 1,
                      })
                    }
                    className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-rose-300 px-2.5 py-1 rounded-md font-semibold text-slate-700 cursor-pointer"
                  >
                    <span>Keyword: &ldquo;{activeSearch}&rdquo;</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort By Control */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <label
              htmlFor="directory-sort-select"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#F36B21]" aria-hidden="true" />
              <span>Sort by:</span>
            </label>
            <select
              id="directory-sort-select"
              value={sortBy}
              onChange={(e) => {
                const nextSort = e.target.value;
                setSortBy(nextSort);
                updateUrlParams({
                  search: searchTerm,
                  location: locationTerm,
                  category: selectedCategory,
                  sort: nextSort,
                  page: pagination.page,
                });
              }}
              className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#171717] leading-tight focus:outline-none focus:border-[#F36B21] cursor-pointer shadow-2xs"
            >
              <option value="recent">Recently Added</option>
              <option value="photo-first">Owner Photos First</option>
              <option value="name-asc">Property Name (A–Z)</option>
              <option value="city-asc">City (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Listing Results / States */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
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
            className="bg-rose-50/90 border border-rose-200 rounded-xl p-8 text-center max-w-xl mx-auto my-6"
          >
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-base font-bold text-rose-900 mb-1">
              Unable to Load Business Directory
            </h2>
            <p className="text-xs sm:text-sm text-rose-700 leading-relaxed mb-5">{loadError}</p>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-5 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : sortedProviders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sortedProviders.map((provider) => (
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
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-[#F36B21] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="px-4 py-2 text-xs font-bold text-[#171717] bg-white border border-slate-200 rounded-lg">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-[#F36B21] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
                  className="px-5 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold mt-2 cursor-pointer"
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
