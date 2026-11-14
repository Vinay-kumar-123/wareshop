import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Warehouse,
  Search,
  Building2,
  UserCheck,
  Compass,
  Grid,
  HelpCircle,
  ShieldCheck,
  PhoneCall,
  Store,
  Package,
} from 'lucide-react';
import { categories } from '../data/categories.js';

const navLinks = [
  { label: 'Directory', href: '/providers', icon: Compass },
  { label: 'Categories', href: '/categories', icon: Grid },
  { label: 'About', href: '/about', icon: HelpCircle },
];

const quickCategoryIcons = {
  shop: Store,
  office: Building2,
  warehouse: Warehouse,
  godown: Package,
};

function Brand() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 group shrink-0"
      aria-label="WARESHOP home"
    >
      <span className="w-10 h-10 rounded-lg bg-[#F36B21] group-hover:bg-[#D95513] text-white flex items-center justify-center shadow-2xs transition-colors">
        <Warehouse className="w-5 h-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-xl sm:text-[22px] font-black tracking-tight text-[#171717] leading-none">
          WARESHOP
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#F36B21] mt-0.5">
          Commercial Marketplace
        </span>
      </div>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (quickCategory) {
      params.set('category', quickCategory);
    }
    if (quickQuery.trim()) {
      params.set('search', quickQuery.trim());
    }
    navigate(`/providers${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/90 shadow-2xs">
      {/* Top Commercial Utility Bar (Desktop) */}
      <div className="hidden lg:block bg-[#171717] text-slate-300 text-[11px] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F36B21]" />
              <span>India’s B2B & Commercial Space Marketplace:</span>
              <strong className="text-white font-semibold">
                Shops • Offices • Warehouses • Godowns
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="inline-flex items-center gap-1 text-slate-300">
              <PhoneCall className="w-3 h-3 text-[#F36B21]" />
              <span>Direct Owner Calls (0% Brokerage)</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2Factor OTP Verified Owners</span>
            </span>
            <span className="text-slate-600">|</span>
            <Link
              to="/become-a-partner"
              className="text-slate-300 hover:text-white font-medium transition-colors"
            >
              Provider Dashboard
            </Link>
            <span className="text-slate-600">|</span>
            <Link
              to="/about"
              className="text-slate-300 hover:text-white font-medium transition-colors"
            >
              Verification Standards
            </Link>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <nav
        className="max-w-7xl mx-auto h-16 sm:h-[70px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        <Brand />

        {/* Quick Search Bar in Header */}
        <form
          onSubmit={handleQuickSearch}
          className="hidden lg:flex flex-1 max-w-lg items-center bg-[#F7F8FA] border border-slate-300/90 rounded-lg overflow-hidden focus-within:border-[#F36B21] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#F36B21]/15 transition-all"
        >
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            aria-label="Filter category"
            className="h-9 pl-3 pr-2 bg-slate-100/80 border-r border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer shrink-0"
          >
            <option value="">All Spaces</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.pluralName || cat.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder="Search shops, offices, warehouses, cities..."
            aria-label="Quick search commercial listings"
            className="w-full px-3 py-2 text-xs sm:text-sm text-[#171717] placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 h-9 bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            aria-label="Search directory"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#F36B21] bg-[#FFF5EF]'
                    : 'text-slate-700 hover:text-[#F36B21] hover:bg-slate-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Provider Portal & List Property Actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Link
            to="/become-a-partner"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#171717] hover:bg-slate-50 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-[#F36B21]" />
            <span>Provider Login</span>
          </Link>
          <Link
            to="/become-a-partner?tab=submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-bold shadow-2xs hover:shadow-xs transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>List Property</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-white/20 text-white text-[10px] font-extrabold uppercase rounded">
              Free
            </span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-5 space-y-4 shadow-lg">
          <form
            onSubmit={handleQuickSearch}
            className="flex items-center bg-[#F7F8FA] border border-slate-300 rounded-lg overflow-hidden"
          >
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search shops, offices, warehouses..."
              className="w-full px-3.5 py-2.5 text-sm text-[#171717] bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#F36B21] text-white font-bold text-sm"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Category Pills in Mobile Menu */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Commercial Verticals
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => {
                const Icon = quickCategoryIcons[cat.slug] || Building2;
                return (
                  <Link
                    key={cat.slug}
                    to={`/categories/${cat.slug}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-[#FFF5EF] border border-slate-200/80 text-xs font-semibold text-slate-800"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#F36B21]" />
                    <span>{cat.pluralName || cat.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-100">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-[#FFF5EF] text-[#F36B21]' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              Home
            </NavLink>
            {navLinks.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-[#FFF5EF] text-[#F36B21]' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Link
              to="/become-a-partner"
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-center text-xs sm:text-sm font-bold text-[#171717] hover:bg-slate-50"
            >
              Provider Login / OTP Portal
            </Link>
            <Link
              to="/become-a-partner?tab=submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-center text-xs sm:text-sm font-bold text-white"
            >
              List Your Property Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
