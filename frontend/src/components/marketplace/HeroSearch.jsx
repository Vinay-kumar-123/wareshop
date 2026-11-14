import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight } from 'lucide-react';

export default function HeroSearch({ onSearch }) {
  const [serviceQuery, setServiceQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();

    const trimmedService = serviceQuery.trim();
    const trimmedCity = cityQuery.trim();

    if (!trimmedService && !trimmedCity) {
      setValidationError('Please enter a service, category, or city to search.');
      return;
    }

    setValidationError('');

    const params = new URLSearchParams();
    if (trimmedService) params.append('service', trimmedService);
    if (trimmedCity) params.append('city', trimmedCity);

    if (onSearch) {
      onSearch({ service: trimmedService, city: trimmedCity });
    }

    navigate(`/providers?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-border/80 p-2 sm:p-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent"
        role="search"
        aria-label="Find service providers"
      >
        <div className="flex flex-col md:flex-row items-stretch gap-2">
          {/* Service / Category Input */}
          <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 sm:py-3 bg-slate-50/70 md:bg-transparent rounded-md border md:border-none border-border/60">
            <Search className="w-5 h-5 text-accent flex-shrink-0" aria-hidden="true" />
            <div className="w-full text-left">
              <label htmlFor="hero-service-input" className="sr-only">
                Service or Category
              </label>
              <input
                id="hero-service-input"
                type="text"
                value={serviceQuery}
                onChange={(e) => {
                  setServiceQuery(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="Search shops, offices, warehouses or services"
                className="w-full bg-transparent text-text-primary text-sm sm:text-base placeholder-text-muted outline-none font-medium"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Divider on desktop */}
          <div className="hidden md:block w-px bg-border/80 my-2" aria-hidden="true" />

          {/* City / Location Input */}
          <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 sm:py-3 bg-slate-50/70 md:bg-transparent rounded-md border md:border-none border-border/60">
            <MapPin className="w-5 h-5 text-accent flex-shrink-0" aria-hidden="true" />
            <div className="w-full text-left">
              <label htmlFor="hero-city-input" className="sr-only">
                City or Location
              </label>
              <input
                id="hero-city-input"
                type="text"
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="City, state or PIN code"
                className="w-full bg-transparent text-text-primary text-sm sm:text-base placeholder-text-muted outline-none font-medium"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            className="btn-primary py-3 px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 flex-shrink-0"
          >
            <span>Search Businesses</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      {/* Validation Message */}
      {validationError && (
        <p className="mt-2.5 text-xs sm:text-sm text-amber-200 bg-amber-950/40 border border-amber-500/30 rounded-md py-1.5 px-3.5 text-center font-medium animate-fadeIn">
          {validationError}
        </p>
      )}
    </div>
  );
}
