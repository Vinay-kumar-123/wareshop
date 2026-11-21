import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Compass } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page Not Found (404) | WARERENT',
    description: 'The requested page could not be found on WARERENT.',
  });

  return (
    <div className="bg-[#F7F8FA] min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="bg-white border border-slate-200/90 rounded-xl p-8 sm:p-12 max-w-lg w-full text-center shadow-card">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#FFF5EF] border border-[#FFE6D5] text-[#F36B21] font-black text-xl mb-5">
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] mb-2">
          Page Not Found
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-7">
          The page or commercial listing you are looking for may have been moved, unpublished, or
          is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <Home size={16} aria-hidden="true" />
            <span>Back to Homepage</span>
          </Link>
          <Link
            to="/providers"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 hover:border-[#F36B21] bg-white text-[#171717] text-xs sm:text-sm font-bold transition-colors"
          >
            <Compass size={16} aria-hidden="true" />
            <span>Explore Directory</span>
          </Link>
          <Link
            to="/categories"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-slate-600 hover:text-[#F36B21] text-xs sm:text-sm font-semibold transition-colors"
          >
            <Search size={15} aria-hidden="true" />
            <span>Categories</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
