import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  ShieldAlert,
  RotateCcw
} from 'lucide-react';

export default function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State initialized from URL query parameters
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('service') || searchParams.get('search') || ''
  );
  const [locationTerm, setLocationTerm] = useState(
    searchParams.get('city') || searchParams.get('location') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || ''
  );

  const [providersList, setProvidersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  usePageMeta({
    title: 'Explore Businesses — WARESHOP',
    description: 'Search shops, offices, warehouses and godowns across India.',
    canonical: 'https://wareshop.in/providers',
  });

  // Query providerService when searchParams change
  useEffect(() => {
    const serviceParam = searchParams.get('service') || searchParams.get('search') || '';
    const cityParam = searchParams.get('city') || searchParams.get('location') || '';
    const catParam = searchParams.get('category') || '';

    setSearchTerm(serviceParam);
    setLocationTerm(cityParam);
    setSelectedCategory(catParam);

    let isMounted = true;
    setIsLoading(true);

    providerService
      .getProviders({
        categorySlug: catParam,
        location: cityParam,
        search: serviceParam,
      })
      .then((res) => {
        if (isMounted) {
          setProvidersList(res.data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to fetch providers', err);
          setProvidersList([]);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Synchronize form filter actions to URL
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (locationTerm.trim()) params.set('city', locationTerm.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setLocationTerm('');
    setSelectedCategory('');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    searchParams.get('service') ||
    searchParams.get('search') ||
    searchParams.get('city') ||
    searchParams.get('location') ||
    searchParams.get('category')
  );

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Business directory' }]} />
        </div>
      </div>

      <div className="container-max py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">
            Business Directory
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-2">
            {selectedCategory ? `${categories.find((item) => item.slug === selectedCategory)?.name || 'Commercial'} listings` : 'Explore businesses'}
          </h1>
          <p className="text-text-muted text-sm sm:text-base leading-relaxed">
            Find shops, offices, warehouses and godowns by business type, service or location.
          </p>
        </div>

        {/* Development Preview Banner */}
        <div className="mb-8 p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs sm:text-sm text-amber-900 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="leading-relaxed">
            <strong>Development sample data:</strong> These fictional listings demonstrate the directory experience. Real businesses appear only after review and publication.
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs mb-8">
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Keyword / Service Input */}
              <div className="relative">
                <label htmlFor="search-service-input" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Service or Keyword
                </label>
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" aria-hidden="true" />
                  <input
                    id="search-service-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. showroom, storage, managed office"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 text-text-muted hover:text-primary"
                      aria-label="Clear service input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Location Input */}
              <div className="relative">
                <label htmlFor="search-location-input" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  City or Location
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" aria-hidden="true" />
                  <input
                    id="search-location-input"
                    type="text"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi, Bengaluru"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors"
                  />
                  {locationTerm && (
                    <button
                      type="button"
                      onClick={() => setLocationTerm('')}
                      className="absolute right-3 text-text-muted hover:text-primary"
                      aria-label="Clear location input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label htmlFor="category-select" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Property category
                </label>
                <div className="relative flex items-center">
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <div className="text-xs text-text-muted font-medium">
                {isLoading ? (
                  <span>Searching directory...</span>
                ) : (
                  <span>
                    Showing <strong className="text-primary">{providersList.length}</strong> matching provider{providersList.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 text-text-muted hover:text-primary"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset Filters</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Apply Search</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Quick category filters">
          <button type="button" onClick={() => { setSelectedCategory(''); setSearchParams(new URLSearchParams()); }} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border ${!selectedCategory ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text-muted'}`}>All listings</button>
          {categories.map((category) => <button key={category.slug} type="button" onClick={() => { const params = new URLSearchParams(searchParams); params.set('category', category.slug); setSearchParams(params); }} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border ${selectedCategory === category.slug ? 'bg-accent text-white border-accent' : 'bg-white border-border text-text-muted hover:border-accent'}`}>{category.name}</button>)}
        </div>

        {/* Results Grid / Empty State */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-muted">Loading providers...</p>
          </div>
        ) : providersList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {providersList.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={SlidersHorizontal}
            title="No Matching Providers Found"
            description="We couldn't find any provider matching your filter criteria. Try broadening your keywords or clearing the location filter."
            action={
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-primary text-xs py-2.5 px-5 mt-2"
              >
                Clear All Filters
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
