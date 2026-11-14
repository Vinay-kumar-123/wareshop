import React from 'react';
import { Link } from 'react-router-dom';
import { Warehouse, ArrowRight, ShieldCheck, PhoneCall, Building2 } from 'lucide-react';
import { categories } from '../data/categories.js';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-200 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center">
                <Warehouse className="w-5 h-5" />
              </span>
              <span className="font-black text-2xl tracking-tight text-white">WARESHOP</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              WARESHOP is India’s commercial property and business discovery marketplace for{' '}
              <strong className="text-slate-200 font-semibold">
                Shops, Offices, Warehouses, and Godowns
              </strong>
              . Discover verified listings and connect directly with property and business owners.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-orange-400" />
                Direct Owner Contact
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                OTP-Verified Providers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                No Middlemen Commission
              </span>
            </div>
            <Link
              to="/become-a-partner"
              className="inline-flex mt-6 items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white transition-colors"
            >
              List Your Property or Business <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Primary Categories */}
          <div>
            <h2 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Commercial Categories
            </h2>
            <ul className="space-y-2.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/categories/${category.slug}`}
                    className="text-sm text-slate-300 hover:text-orange-400 transition-colors"
                  >
                    {category.pluralName || category.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/categories"
                  className="text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View All Categories →
                </Link>
              </li>
            </ul>
          </div>

          {/* Marketplace Links */}
          <div>
            <h2 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Marketplace
            </h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/providers"
                  className="text-sm text-slate-300 hover:text-orange-400 transition-colors"
                >
                  Explore Directory
                </Link>
              </li>
              <li>
                <Link
                  to="/become-a-partner"
                  className="text-sm text-slate-300 hover:text-orange-400 transition-colors"
                >
                  Provider Portal & Login
                </Link>
              </li>
              <li>
                <Link
                  to="/become-a-partner?tab=submit"
                  className="text-sm text-slate-300 hover:text-orange-400 transition-colors"
                >
                  Submit a Listing
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-sm text-slate-300 hover:text-orange-400 transition-colors"
                >
                  About WARESHOP
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust, Legal & Governance */}
          <div>
            <h2 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Legal & Governance
            </h2>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-sm text-slate-300 hover:text-orange-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-slate-300 hover:text-orange-400 transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/login"
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Administrator Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} WARESHOP Commercial Marketplace. All rights reserved.
          </p>
          <p>
            Direct customer-to-owner discovery. Published owners control their displayed contact numbers.
          </p>
        </div>
      </div>
    </footer>
  );
}
