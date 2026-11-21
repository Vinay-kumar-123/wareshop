import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, PhoneCall, Building2, MapPin } from 'lucide-react';
import { categories } from '../data/categories.js';

const topCities = [
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Ahmedabad',
  'Kolkata',
];

export default function Footer() {
  return (
    <footer className="bg-[#111827] text-slate-300 border-t border-slate-800">
      {/* Regional Directory Quick Links Strip */}
      <div className="border-b border-slate-800/80 bg-[#0B0F19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-[#F36B21]" />
            <span>Major Commercial Hubs:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {topCities.map((city) => (
              <Link
                key={city}
                to={`/providers?location=${encodeURIComponent(city)}`}
                className="text-slate-400 hover:text-[#F36B21] transition-colors font-medium"
              >
                Commercial Spaces in {city}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-white rounded-xl h-11 px-1 overflow-hidden shadow-2xs"
              aria-label="WARERENT home"
            >
              <img
                src="/warerent-logo.png"
                alt="WARERENT"
                width="1280"
                height="543"
                className="h-[74px] w-auto max-w-none object-contain -ml-1.5 -mr-1"
              />
            </Link>
            <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-slate-400">
              WARERENT is India’s commercial property and business discovery marketplace for{' '}
              <strong className="text-slate-200 font-semibold">
                Shops, Offices, Warehouses, and Godowns
              </strong>
              . Search verified listings and call property or business owners directly.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-md">
                <PhoneCall className="w-3.5 h-3.5 text-[#F36B21]" />
                <span>Direct Owner Contact</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>OTP-Verified Providers</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-md">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>0% Brokerage</span>
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/become-a-partner?tab=submit"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-xs sm:text-sm font-semibold text-white transition-colors"
              >
                <span>List Your Property Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/become-a-partner"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-700 hover:border-slate-500 text-xs sm:text-sm font-semibold text-slate-200 transition-colors"
              >
                <span>Provider Portal</span>
              </Link>
            </div>
          </div>

          {/* Primary Categories */}
          <div>
            <h2 className="text-xs uppercase tracking-widest font-bold text-white mb-4">
              Commercial Verticals
            </h2>
            <ul className="space-y-2.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/categories/${category.slug}`}
                    className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                  >
                    {category.seoTitle || category.pluralName || category.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/categories"
                  className="text-xs sm:text-sm font-semibold text-[#F36B21] hover:text-[#FFA270] transition-colors"
                >
                  Browse All Categories →
                </Link>
              </li>
            </ul>
          </div>

          {/* Marketplace Links */}
          <div>
            <h2 className="text-xs uppercase tracking-widest font-bold text-white mb-4">
              Marketplace & Portal
            </h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/providers"
                  className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                >
                  Explore Commercial Directory
                </Link>
              </li>
              <li>
                <Link
                  to="/become-a-partner"
                  className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                >
                  Provider OTP Login
                </Link>
              </li>
              <li>
                <Link
                  to="/become-a-partner?tab=submit"
                  className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                >
                  Submit New Listing
                </Link>
              </li>
              <li>
                <Link
                  to="/become-a-partner?tab=status"
                  className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                >
                  Check Application Status
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                >
                  About WARERENT
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust, Legal & Governance */}
          <div>
            <h2 className="text-xs uppercase tracking-widest font-bold text-white mb-4">
              Governance & Legal
            </h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-xs sm:text-sm text-slate-400 hover:text-[#F36B21] transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/login"
                  className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Administrator Console
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/90 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} WARERENT Commercial Marketplace. All rights reserved.
          </p>
          <p className="text-center sm:text-right">
            Direct customer-to-owner discovery. Published owners control their displayed contact numbers.
          </p>
        </div>
      </div>
    </footer>
  );
}
