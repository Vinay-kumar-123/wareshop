import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  BookOpen,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  Activity,
  Settings,
  Layers,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';

export default function AdminLayout({ children, title, subtitle }) {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Provider Applications', href: '/admin/applications', icon: Users },
    { label: 'Business Listings', href: '/admin/providers', icon: Building2 },
    { label: 'Categories', href: '/admin/categories', icon: Layers },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const isCurrentActive = (itemHref) => {
    if (itemHref === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(itemHref);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col md:flex-row font-sans text-[#171717]">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#171717] text-white p-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="font-black text-base tracking-wider text-white">WARESHOP</span>
          <span className="text-[10px] uppercase font-bold text-[#FF9D60] tracking-widest px-1.5 py-0.5 rounded bg-orange-500/15">
            Admin
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 bg-[#171717] text-slate-200 flex flex-col justify-between shrink-0 ${
          mobileMenuOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div>
          {/* Logo and Brand */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xl font-black tracking-wider text-white">WARESHOP</span>
              <span className="block text-[10px] uppercase font-bold text-[#FF9D60] tracking-widest mt-0.5">
                Operations Portal
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-[#FF9D60] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = isCurrentActive(item.href);
              return (
                <Link
                  key={idx}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#F36B21] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="px-3.5 py-2.5 bg-slate-800/50 rounded-xl text-xs border border-slate-700/40">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
              Logged in as
            </span>
            <span className="font-semibold text-white truncate block">{admin?.email || 'Owner'}</span>
            <span className="text-[10px] text-[#13A89E] font-bold uppercase tracking-wider">
              {admin?.role || 'SUPER_ADMIN'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-medium transition-colors"
            >
              <span>Live Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-text-muted mt-0.5 font-medium">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online</span>
            </span>
          </div>
        </div>

        {/* Child Pages Container */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
