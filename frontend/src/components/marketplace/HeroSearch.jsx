import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Building2,
  ArrowRight,
  Store,
  Warehouse,
  Package,
  X,
} from 'lucide-react';
import { categories } from '../../data/categories.js';

const categoryTabIcons = {
  shop: Store,
  office: Building2,
  warehouse: Warehouse,
  godown: Package,
};

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
      {/* Quick Category Selector Tabs above Search Bar */}
      <div
        className="inline-flex flex-wrap items-center gap-1.5 mb-2.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80"
        role="tablist"
        aria-label="Select property category filter"
      >
        <button
          type="button"
          role="tab"
          aria-selected={categoryQuery === ''}
          onClick={() => setCategoryQuery('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            categoryQuery === ''
              ? 'bg-[#171717] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#171717] hover:bg-white/60'
          }`}
        >
          All Commercial Spaces
        </button>
        {categories.map((cat) => {
          const Icon = categoryTabIcons[cat.slug] || Building2;
          const active = categoryQuery === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategoryQuery(cat.slug)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-[#F36B21] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-[#F36B21] hover:bg-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{cat.pluralName || cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Search Box */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-xl shadow-elevated border border-slate-200 p-2 transition-all duration-150 focus-within:border-[#F36B21] focus-within:ring-3 focus-within:ring-[#F36B21]/15"
        role="search"
        aria-label="Search commercial properties and businesses"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-2">
          {/* Keyword / Business Name Input */}
          <div className="flex-[1.5] flex items-center gap-3 px-3.5 py-2.5 bg-slate-50/70 lg:bg-transparent rounded-lg border lg:border-none border-slate-200/80">
            <Search className="w-5 h-5 text-[#F36B21] shrink-0" aria-hidden="true" />
            <div className="w-full text-left min-w-0">
              <label
                htmlFor="hero-keyword-input"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                Keyword, Business or Facility
              </label>
              <div className="flex items-center">
                <input
                  id="hero-keyword-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Retail shop, corporate office, PEB warehouse, godown..."
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

          <div className="hidden lg:block w-px bg-slate-200 my-1.5" aria-hidden="true" />

          {/* Location / City Input */}
          <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 bg-slate-50/70 lg:bg-transparent rounded-lg border lg:border-none border-slate-200/80">
            <MapPin className="w-5 h-5 text-[#F36B21] shrink-0" aria-hidden="true" />
            <div className="w-full text-left min-w-0">
              <label
                htmlFor="hero-location-input"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                City or Industrial Hub
              </label>
              <div className="flex items-center">
                <input
                  id="hero-location-input"
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Mumbai, Delhi NCR, Bengaluru, Pune..."
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

          <div className="hidden lg:block w-px bg-slate-200 my-1.5" aria-hidden="true" />

          {/* Category Selector */}
          <div className="lg:w-48 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/70 lg:bg-transparent rounded-lg border lg:border-none border-slate-200/80">
            <Building2 className="w-5 h-5 text-[#F36B21] shrink-0" aria-hidden="true" />
            <div className="w-full text-left">
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
            className="bg-[#F36B21] hover:bg-[#D95513] active:bg-[#B4400E] text-white rounded-lg py-3.5 px-6 sm:px-7 text-sm font-bold shadow-xs hover:shadow transition-all duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Search Spaces</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
