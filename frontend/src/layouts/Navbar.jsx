import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, Warehouse, Search } from 'lucide-react';

const navLinks = [{ label: 'Home', href: '/' }, { label: 'Explore Businesses', href: '/providers' }, { label: 'Categories', href: '/categories' }];

function Brand() {
  return <Link to="/" className="flex items-center gap-2.5" aria-label="WARESHOP home"><span className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center"><Warehouse className="w-6 h-6" /></span><span className="text-xl sm:text-2xl font-black tracking-tight text-black">WARESHOP</span></Link>;
}

export default function Navbar() {
  const [open, setOpen] = useState(false); const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border"><nav className="container-max h-16 sm:h-[74px] px-4 sm:px-6 flex items-center justify-between gap-4" aria-label="Main navigation"><Brand /><Link to="/providers" className="hidden lg:flex flex-1 max-w-sm items-center gap-2 border border-border bg-slate-50 hover:border-accent rounded-lg px-3 py-2 text-xs text-text-muted"><Search className="w-4 h-4 text-accent" />Search shops, offices, warehouses…</Link><div className="hidden md:flex items-center gap-1">{navLinks.slice(1).map((item) => <NavLink key={item.href} to={item.href} className={({ isActive }) => `px-2.5 py-2 text-xs font-semibold rounded-lg ${isActive ? 'text-accent bg-accent-50' : 'text-text-primary hover:text-accent'}`}>{item.label}</NavLink>)}</div><div className="hidden md:flex items-center gap-3"><Link to="/admin/login" className="text-xs font-semibold text-text-primary hover:text-accent">Sign in</Link><Link to="/become-a-partner" className="btn-primary text-xs py-2.5 px-3">List property <ArrowRight className="w-4 h-4" /></Link></div><button type="button" className="md:hidden p-2 text-primary" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button></nav>{open && <div className="md:hidden bg-white border-t border-border px-4 py-4 space-y-1">{navLinks.map((item) => <NavLink key={item.href} to={item.href} className="block px-3 py-3 font-semibold text-text-primary">{item.label}</NavLink>)}<Link to="/become-a-partner" className="btn-primary w-full mt-3">List your property</Link></div>}</header>;
}
