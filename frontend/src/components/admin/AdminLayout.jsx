import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import {
  LayoutDashboard,
  Users,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Building2,
  Activity,
  Settings,
  Layers,
  Menu,
  X,
  FolderPlus,
} from 'lucide-react';

export default function AdminLayout({ children, title, subtitle }) {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  usePageMeta({
    title: title ? `${title} | WARERENT Admin` : 'WARERENT Admin',
    description: 'Restricted WARERENT administration console.',
    canonical: false,
    noIndex: true,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navGroups = [
    {
      heading: 'Operations & Moderation',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Applications', href: '/admin/applications', icon: Users },
        { label: 'Providers / Listings', href: '/admin/providers', icon: Building2 },
      ],
    },
    {
      heading: 'Marketplace Taxonomy',
      items: [
        { label: 'Categories', href: '/admin/categories', icon: Layers },
        { label: 'Custom Category Requests', href: '/admin/category-requests', icon: FolderPlus },
      ],
    },
    {
      heading: 'Audit & Security',
      items: [
        { label: 'Activity Logs', href: '/admin/activity-logs', icon: Activity },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const isCurrentActive = (itemHref) => {
    if (itemHref === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(itemHref);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col md:flex-row font-sans text-slate-900">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin"
            className="inline-flex items-center justify-center bg-white rounded-lg h-10 overflow-hidden shadow-2xs"
            aria-label="WARERENT Admin home"
          >
            <img
              src="/warerent-logo.png"
              alt="WARERENT"
              width="1280"
              height="543"
              className="h-[68px] w-auto max-w-none object-contain -ml-1.5 -mr-1"
            />
          </Link>
          <span className="text-[10px] uppercase font-bold text-[#F36B21] tracking-widest px-1.5 py-0.5 rounded bg-[#F36B21]/15 border border-[#F36B21]/30">
            Admin
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          aria-label="Toggle admin navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 bg-slate-950 text-slate-200 flex flex-col justify-between shrink-0 border-r border-slate-800 ${
          mobileMenuOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div>
          <div className="px-5 py-4 border-b border-slate-800/80">
            <Link
              to="/admin"
              className="inline-flex items-center justify-center bg-white rounded-xl h-12 overflow-hidden shadow-xs"
              aria-label="WARERENT Admin home"
            >
              <img
                src="/warerent-logo.png"
                alt="WARERENT"
                width="1280"
                height="543"
                className="h-[82px] w-auto max-w-none object-contain -ml-1.5 -mr-1"
              />
            </Link>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-extrabold text-[#F36B21] tracking-widest">
                Operations Console
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400">
                <ShieldCheck className="w-3 h-3 text-[#F36B21]" />
                <span>Admin</span>
              </span>
            </div>
          </div>

          <nav className="p-3.5 space-y-5" aria-label="Admin sidebar navigation">
            {navGroups.map((group) => (
              <div key={group.heading}>
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block mb-1.5">
                  {group.heading}
                </span>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isCurrentActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#F36B21] text-white shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950">
          <div className="px-3.5 py-2.5 bg-slate-900 rounded-lg text-xs border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
              Authenticated Operator
            </span>
            <span className="font-bold text-white truncate block">
              {admin?.email || 'Administrator'}
            </span>
            <span className="text-[10px] text-[#F36B21] font-extrabold uppercase tracking-wider mt-0.5 block">
              {admin?.role || 'ADMIN'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold transition-colors"
            >
              <span>Live Marketplace</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/providers"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              <span>Public Directory</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operations Active</span>
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
