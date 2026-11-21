import React, { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Building2,
  UserCheck,
  Compass,
  Grid,
  HelpCircle,
  ShieldCheck,
  PhoneCall,
  Home,
  ChevronRight,
} from 'lucide-react';

const navLinks = [
  { label: 'Directory', href: '/providers', icon: Compass },
  { label: 'Categories', href: '/categories', icon: Grid },
  { label: 'About', href: '/about', icon: HelpCircle },
];

const drawerLinks = [
  { label: 'Home', href: '/', icon: Home, end: true },
  { label: 'Directory', href: '/providers', icon: Compass },
  { label: 'Categories', href: '/categories', icon: Grid },
  { label: 'About', href: '/about', icon: HelpCircle },
];

function Brand({ compact = false }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center overflow-hidden shrink-0 focus:outline-none ${
        compact ? 'h-10' : 'h-11 sm:h-12'
      }`}
      aria-label="WARERENT home"
    >
      <img
        src="/warerent-logo.png"
        alt="WARERENT"
        width="1280"
        height="543"
        className={`${
          compact ? 'h-[62px] -ml-2 -mr-1.5' : 'h-[66px] sm:h-[74px] lg:h-[80px] -ml-2.5 -mr-2'
        } w-auto max-w-none object-contain`}
      />
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const closeButtonRef = useRef(null);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Escape key dismissal and body scroll lock when drawer is open
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    // Focus close button for keyboard accessibility
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-2xs">
      {/* Top Commercial Utility Bar (Desktop Only) */}
      <div className="hidden xl:block bg-[#171717] text-slate-300 text-[11px] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F36B21]" />
              <span>India’s Commercial Property Marketplace:</span>
              <strong className="text-white font-semibold">
                Shops • Offices • Warehouses • Godowns
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="inline-flex items-center gap-1 text-slate-300">
              <PhoneCall className="w-3 h-3 text-[#F36B21]" />
              <span>Direct Owner Contact (0% Brokerage)</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Email OTP Verified Owners</span>
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

      {/* Main Compact Header */}
      <nav
        className="max-w-7xl mx-auto h-14 sm:h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4"
        aria-label="Main navigation"
      >
        <Brand />

        {/* Desktop Nav Links (lg and above) */}
        <div className="hidden lg:flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                isActive
                  ? 'text-[#F36B21] bg-[#FFF5EF]'
                  : 'text-slate-700 hover:text-[#F36B21] hover:bg-slate-50'
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
                `px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
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

        {/* Desktop Provider Portal & List Property Actions (lg and above) */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <Link
            to="/become-a-partner"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#171717] hover:bg-slate-50 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-[#F36B21]" />
            <span>Provider Login</span>
          </Link>
          <Link
            to="/become-a-partner?tab=submit"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>List Your Property Free</span>
          </Link>
        </div>

        {/* Mobile & Tablet Menu Trigger (visible below lg / 1024px) */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[#171717] hover:bg-slate-100 active:bg-slate-200/70 border border-slate-200 transition-colors cursor-pointer"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          aria-controls="mobile-navigation-drawer"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile & Tablet Navigation Drawer with Outside-Click Backdrop & Escape Dismissal */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {/* Outside-Click Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          data-testid="mobile-drawer-backdrop"
        />

        {/* Clean White Surface Drawer Panel */}
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className={`fixed top-0 right-0 w-full max-w-[320px] max-h-screen overflow-y-auto bg-white border-l border-slate-200 shadow-elevated transition-transform duration-200 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header: WARERENT Logo + Close Button */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200">
            <Brand compact />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-[#171717] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="px-3 py-3" aria-label="Mobile primary navigation">
            <ul className="divide-y divide-slate-100">
              {drawerLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-[#FFF5EF] text-[#F36B21]'
                            : 'text-[#171717] hover:bg-slate-50'
                        }`
                      }
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-[#F36B21] shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Subtle Separator & Provider Actions */}
          <div className="px-4 pt-3 pb-5 border-t border-slate-200 bg-slate-50/50 space-y-2.5">
            <Link
              to="/become-a-partner"
              onClick={() => setOpen(false)}
              className="w-full h-11 px-4 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-[#171717] text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <UserCheck className="w-4 h-4 text-[#F36B21]" aria-hidden="true" />
              <span>Provider Login / OTP Portal</span>
            </Link>
            <Link
              to="/become-a-partner?tab=submit"
              onClick={() => setOpen(false)}
              className="w-full h-11 px-4 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <Building2 className="w-4 h-4" aria-hidden="true" />
              <span>List Your Property Free</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
