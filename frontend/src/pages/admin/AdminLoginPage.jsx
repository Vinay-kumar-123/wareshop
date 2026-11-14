import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import {
  ShieldCheck,
  LockKeyhole,
  Mail,
  AlertCircle,
  Warehouse,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export default function AdminLoginPage() {
  usePageMeta({
    title: 'Admin Login | WARESHOP Operations Console',
    description: 'Secure administrator sign-in for WARESHOP.',
    canonical: false,
    noIndex: true,
  });

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/admin';

  const submit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      return setError('Enter your administrator email and password.');
    }
    setIsSubmitting(true);
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'We could not authenticate this account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F8FA] grid lg:grid-cols-2">
      {/* Left Enterprise Brand Panel */}
      <section className="hidden lg:flex bg-slate-950 text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#F36B21 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <Link to="/" className="relative flex items-center gap-3 w-fit">
          <span className="w-11 h-11 rounded-xl bg-[#F36B21] flex items-center justify-center shadow-xs">
            <Warehouse className="w-6 h-6 text-white" />
          </span>
          <div>
            <span className="font-black text-2xl tracking-tight block leading-none">
              WARESHOP
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F36B21] block mt-1">
              Commercial Marketplace
            </span>
          </div>
        </Link>

        <div className="relative max-w-md">
          <p className="text-[#F36B21] text-xs font-extrabold uppercase tracking-widest">
            OPERATIONS CONSOLE
          </p>
          <h1 className="mt-3 text-4xl xl:text-5xl font-black leading-tight tracking-tight">
            Run a trusted commercial property directory.
          </h1>
          <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            Review provider applications, verify ownership details, publish eligible commercial
            listings, and maintain category governance from one protected workspace.
          </p>
          <div className="mt-8 space-y-3.5">
            {[
              'Protected administrator access with rate-limited authentication',
              'Verified and published listing lifecycle controls',
              'Immutable activity logs recorded across all operations',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#F36B21] shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">
          WARESHOP Administration · Access is logged and rate-limited
        </p>
      </section>

      {/* Right Sign-In Form */}
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="lg:hidden flex items-center gap-2.5 font-black text-xl text-slate-950 mb-8"
          >
            <span className="w-9 h-9 rounded-lg bg-[#F36B21] text-white flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </span>
            <span>WARESHOP</span>
          </Link>

          <Link
            to="/"
            className="text-xs font-bold text-slate-500 hover:text-[#F36B21] inline-flex items-center gap-1.5 mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Marketplace</span>
          </Link>

          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-card">
            <div className="w-11 h-11 rounded-xl bg-[#FFF5EF] border border-[#FFE6D5] text-[#F36B21] flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">
              Administrator Sign In
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
              Use your operator credentials to access WARESHOP administration.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Administrator Email
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="admin-email"
                    autoComplete="username"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="admin@yourcompany.in"
                    required
                  />
                </div>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
                <div className="relative mt-1.5">
                  <LockKeyhole className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="admin-password"
                    autoComplete="current-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>{isSubmitting ? 'Signing in…' : 'Sign In Securely'}</span>
              </button>
            </form>

            <p className="mt-6 pt-5 border-t border-slate-100 text-center text-[11px] text-slate-500">
              Restricted administrator access only · Public registration is unavailable
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
