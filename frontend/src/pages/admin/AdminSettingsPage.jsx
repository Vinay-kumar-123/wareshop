import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShieldCheck, KeyRound, Server, Lock } from 'lucide-react';

export default function AdminSettingsPage() {
  const { admin } = useAuth();

  return (
    <AdminLayout
      title="Admin Platform Settings & Security"
      subtitle="Security parameters, credential rotation procedures, and deployment environment status"
    >
      <div className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-extrabold text-slate-950 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F36B21]" />
            <span>Active Administrator Session</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Authenticated Account
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {admin?.email || 'Administrator'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Role / Privilege Level
              </span>
              <span className="font-extrabold text-[#F36B21] text-sm uppercase">
                {admin?.role || 'ADMIN'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Session Storage
              </span>
              <span className="font-bold text-emerald-700 inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>In-Memory Bearer Session (SHA-256 Hashed in DB)</span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-base font-extrabold text-slate-950 pb-3 border-b border-slate-100 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#F36B21]" />
            <span>Production Credential Management & Rotation Policy</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            In compliance with WARERENT security standards, administrator credentials are never
            hardcoded. All credentials are driven by backend environment variables and salted scrypt
            cryptographic hashing.
          </p>

          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-3 text-xs">
            <span className="font-extrabold text-slate-900 block text-xs uppercase tracking-wider">
              Safe Rotation Procedure:
            </span>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed">
              <li>
                <strong>Update Environment Variable:</strong> Set{' '}
                <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  ADMIN_PASSWORD
                </code>{' '}
                in your deployment environment configuration.
              </li>
              <li>
                <strong>Execute Controlled Rotation:</strong> Run the backend bootstrap command:
                <pre className="mt-1.5 p-3 bg-slate-950 text-[#F36B21] rounded-lg font-mono text-[11px] overflow-x-auto">
                  node src/scripts/bootstrapAdmin.js &lt;admin-email&gt; &quot;&lt;NewStrongPassword&gt;&quot;
                </pre>
              </li>
              <li>
                <strong>Automatic Session Revocation:</strong> The rotation procedure automatically
                clears all active session token hashes in MongoDB.
              </li>
            </ol>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-base font-extrabold text-slate-950 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-[#F36B21]" />
            <span>Active Production Security Controls</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">Helmet & CSP Protection</strong>
                <p className="text-slate-600 text-[11px]">
                  Strict Content-Security-Policy, frameguard DENY, and nosniff headers enabled.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">Strict CORS Allowlist</strong>
                <p className="text-slate-600 text-[11px]">
                  Restricted to authorized frontend origins with explicit HTTP 403 rejection.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">NoSQL Injection Sanitizer</strong>
                <p className="text-slate-600 text-[11px]">
                  Recursive stripping of MongoDB query operators ($ and .) across body, query, and
                  params.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">
                  Account Lockout & Rate Limiting
                </strong>
                <p className="text-slate-600 text-[11px]">
                  Per-IP and per-account lockout protecting admin login, OTP endpoints, and contact
                  reveals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
