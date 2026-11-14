import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Building2, ArrowRight } from 'lucide-react';
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
    <div className="w-full max-w-5xl">
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-lg border border-slate-200/90 p-2 sm:p-2.5 transition-all duration-200 focus-within:ring-4 focus-within:ring-orange-500/15 focus-within:border-orange-500"
        role="search"
        aria-label="Search commercial properties and businesses"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-2">
          {/* Keyword / Business Name Input */}
          <div className="flex-[1.4] flex items-center gap-3 px-3.5 py-2.5 sm:py-3 bg-slate-50/80 lg:bg-transparent rounded-xl border lg:border-none border-slate-200">
            <Search className="w-5 h-5 text-orange-500 shrink-0" aria-hidden="true" />
            <div className="w-full text-left">
              <label htmlFor="hero-keyword-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Keyword or Business
              </label>
              <input
                id="hero-keyword-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shops, offices, warehouses, godowns..."
                className="w-full bg-transparent text-slate-900 text-sm sm:text-base placeholder:text-slate-400 outline-none font-medium"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="hidden lg:block w-px bg-slate-200 my-2" aria-hidden="true" />

          {/* Location / City Input */}
          <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 sm:py-3 bg-slate-50/80 lg:bg-transparent rounded-xl border lg:border-none border-slate-200">
            <MapPin className="w-5 h-5 text-orange-500 shrink-0" aria-hidden="true" />
            <div className="w-full text-left">
              <label htmlFor="hero-location-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                City or Location
              </label>
              <input
                id="hero-location-input"
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Mumbai, Delhi NCR, Bengaluru, Pune..."
                className="w-full bg-transparent text-slate-900 text-sm sm:text-base placeholder:text-slate-400 outline-none font-medium"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="hidden lg:block w-px bg-slate-200 my-2" aria-hidden="true" />

          {/* Category Selector */}
          <div className="lg:w-48 flex items-center gap-2.5 px-3.5 py-2.5 sm:py-3 bg-slate-50/80 lg:bg-transparent rounded-xl border lg:border-none border-slate-200">
            <Building2 className="w-5 h-5 text-orange-500 shrink-0" aria-hidden="true" />
            <div className="w-full text-left">
              <label htmlFor="hero-category-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Property Type
              </label>
              <select
                id="hero-category-select"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                className="w-full bg-transparent text-slate-900 text-sm sm:text-base outline-none font-medium cursor-pointer"
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
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3.5 px-6 sm:px-8 text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Search</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
