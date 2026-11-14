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
} from 'lucide-react';

const navLinks = [
  { label: 'Explore Directory', href: '/providers', icon: Compass },
  { label: 'Categories', href: '/categories', icon: Grid },
  { label: 'How It Works', href: '/about', icon: HelpCircle },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group shrink-0" aria-label="WARESHOP home">
      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-sm group-hover:from-orange-600 group-hover:to-orange-700 transition-all">
        <Warehouse className="w-5 h-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 leading-none">
          WARESHOP
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mt-0.5">
          Commercial Directory
        </span>
      </div>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (quickQuery.trim()) {
      params.set('search', quickQuery.trim());
    }
    navigate(`/providers${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <nav
        className="max-w-7xl mx-auto h-16 sm:h-[74px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        <Brand />

        {/* Quick Search Bar in Header */}
        <form
          onSubmit={handleQuickSearch}
          className="hidden lg:flex flex-1 max-w-md items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/15 transition-all"
        >
          <div className="pl-3.5 pr-2 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder="Search for Shops, offices, warehouses, godowns..."
            aria-label="Quick search commercial listings"
            className="w-full py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors flex items-center justify-center shrink-0"
            aria-label="Search directory"
          >
            <Search className="w-4 h-4" />
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
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-slate-700 hover:text-orange-600 hover:bg-slate-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Provider Portal & List Property Actions */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <Link
            to="/become-a-partner"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-slate-50 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-orange-600" />
            <span>Provider Login</span>
          </Link>
          <Link
            to="/become-a-partner?tab=submit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>List Your Property</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <form
            onSubmit={handleQuickSearch}
            className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden"
          >
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search shops, offices, warehouses..."
              className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-orange-500 text-white font-bold text-sm"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'
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
                  `block px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'
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
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-center text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Provider Login / Dashboard
            </Link>
            <Link
              to="/become-a-partner?tab=submit"
              className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-center text-sm font-bold text-white"
            >
              List Your Property
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
