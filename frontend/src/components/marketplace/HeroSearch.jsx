import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Building2,
  X,
} from 'lucide-react';
import { categories } from '../../data/categories.js';

export default function HeroSearch({ onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();

    const trimmedSearch = searchQuery.trim();
    const trimmedLocation = locationQuery.trim();

    const params = new URLSearchParams();
    if (trimmedSearch) params.set('search', trimmedSearch);
    if (trimmedLocation) params.set('location', trimmedLocation);
    if (categoryQuery) params.set('category', categoryQuery);

    if (onSearch) {
      onSearch({
        search: trimmedSearch,
        location: trimmedLocation,
        category: categoryQuery,
      });
    }

    const qs = params.toString();
    navigate(qs ? `/providers?${qs}` : '/providers');
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSearch}
        className="w-full"
        role="search"
        aria-label="Search commercial properties and businesses"
      >
        {/* Mobile & Tablet Search-First Bar (Immediate, prominent single-row search bar with search icon on the right) */}
        <div className="lg:hidden space-y-2">
          <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-xs focus-within:border-[#F36B21] focus-within:ring-2 focus-within:ring-[#F36B21]/15 transition-all overflow-hidden">
            <label htmlFor="mobile-primary-search" className="sr-only">
              Search shops, offices, warehouses
            </label>
            <input
              id="mobile-primary-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shops, offices, warehouses..."
              className="w-full h-12 pl-4 pr-2 text-sm text-[#171717] placeholder:text-slate-400 bg-transparent outline-none font-medium"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-2 text-slate-400 hover:text-slate-600 shrink-0"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="h-10 w-10 mr-1 rounded-lg bg-[#F36B21] hover:bg-[#D95513] active:bg-[#B4400E] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label="Search commercial properties"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Compact Location & Category Filter Row on Mobile/Tablet */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 h-10 px-3 bg-white border border-slate-200 rounded-lg focus-within:border-[#F36B21] transition-colors">
              <MapPin className="w-3.5 h-3.5 text-[#F36B21] shrink-0" aria-hidden="true" />
              <label htmlFor="mobile-location-input" className="sr-only">
                City or location
              </label>
              <input
                id="mobile-location-input"
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City (e.g. Mumbai)"
                className="w-full bg-transparent text-xs text-[#171717] placeholder:text-slate-400 outline-none font-medium truncate"
                autoComplete="off"
              />
              {locationQuery && (
                <button
                  type="button"
                  onClick={() => setLocationQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Clear location"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 h-10 px-3 bg-white border border-slate-200 rounded-lg focus-within:border-[#F36B21] transition-colors">
              <Building2 className="w-3.5 h-3.5 text-[#F36B21] shrink-0" aria-hidden="true" />
              <label htmlFor="mobile-category-select" className="sr-only">
                Property category
              </label>
              <select
                id="mobile-category-select"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#171717] outline-none font-medium cursor-pointer truncate"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.pluralName || cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Unified Multi-Field Search Bar */}
        <div className="hidden lg:flex items-center bg-white border border-slate-300 rounded-xl shadow-card p-1.5 focus-within:border-[#F36B21] focus-within:ring-3 focus-within:ring-[#F36B21]/15 transition-all">
          {/* Primary Keyword Input */}
          <div className="flex-[1.6] flex items-center gap-3 px-3.5 py-2 min-w-0">
            <Search className="w-5 h-5 text-[#F36B21] shrink-0" aria-hidden="true" />
            <div className="w-full min-w-0">
              <label
                htmlFor="hero-keyword-input"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                Search Commercial Properties
              </label>
              <div className="flex items-center">
                <input
                  id="hero-keyword-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shops, offices, warehouses..."
                  className="w-full bg-transparent text-[#171717] text-sm placeholder:text-slate-400 outline-none font-medium truncate"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    aria-label="Clear keyword"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-px h-9 bg-slate-200" aria-hidden="true" />

          {/* City / Location Input */}
          <div className="flex-1 flex items-center gap-3 px-3.5 py-2 min-w-0">
            <MapPin className="w-5 h-5 text-[#F36B21] shrink-0" aria-hidden="true" />
            <div className="w-full min-w-0">
              <label
                htmlFor="hero-location-input"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                City or Location
              </label>
              <div className="flex items-center">
                <input
                  id="hero-location-input"
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Mumbai, Delhi NCR, Bengaluru..."
                  className="w-full bg-transparent text-[#171717] text-sm placeholder:text-slate-400 outline-none font-medium truncate"
                  autoComplete="off"
                />
                {locationQuery && (
                  <button
                    type="button"
                    onClick={() => setLocationQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    aria-label="Clear location"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-px h-9 bg-slate-200" aria-hidden="true" />

          {/* Category Selector */}
          <div className="w-48 flex items-center gap-2.5 px-3.5 py-2">
            <Building2 className="w-5 h-5 text-[#F36B21] shrink-0" aria-hidden="true" />
            <div className="w-full">
              <label
                htmlFor="hero-category-select"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                Property Type
              </label>
              <select
                id="hero-category-select"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                className="w-full bg-transparent text-[#171717] text-sm outline-none font-semibold cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.pluralName || cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            className="bg-[#F36B21] hover:bg-[#D95513] active:bg-[#B4400E] text-white rounded-lg h-12 px-6 text-sm font-semibold shadow-2xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Search</span>
            <Search className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
