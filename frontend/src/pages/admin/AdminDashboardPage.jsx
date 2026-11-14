import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  FileCheck2,
  ArrowRight,
  Activity,
  FolderPlus,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';

function StatCard({ label, value, icon: Icon, tone, href, helper }) {
  return (
    <Link
      to={href}
      className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-orange-400 hover:shadow-xs transition-all flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div>
        <p className="mt-3 text-3xl font-black text-slate-950">{value ?? 0}</p>
        {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message || 'Unable to load dashboard statistics'));
  }, []);

  const stats = data?.stats;

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="Real-time commercial marketplace statistics, applications, and audit trail"
    >
      {error && (
        <div className="p-4 mb-6 text-xs sm:text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          {error}
        </div>
      )}

      {!data ? (
        <div className="py-24 text-center text-sm text-slate-500">
          Loading marketplace operations…
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white border border-slate-200 rounded-2xl p-5">
            <div>
              <p className="font-bold text-slate-900">Direct Customer-to-Business Marketplace</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Customers contact published property and business owners directly. Use this console
                to verify applications and manage public listings.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {stats.pendingCategoryRequests > 0 && (
                <Link
                  to="/admin/category-requests"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>{stats.pendingCategoryRequests} Category Requests</span>
                </Link>
              )}
              <Link
                to="/admin/applications?status=pending"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
              >
                <span>Review Pending ({stats.pendingApplications ?? stats.applications?.pending ?? 0})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* All 7 Required Admin Dashboard Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Providers"
              value={stats.totalProviders ?? stats.providers?.totalAccounts ?? 0}
              icon={Users}
              tone="bg-blue-50 text-blue-700"
              href="/admin/providers"
              helper="OTP-verified provider accounts"
            />
            <StatCard
              label="Total Applications"
              value={stats.totalApplications ?? stats.applications?.total ?? 0}
              icon={FileCheck2}
              tone="bg-orange-50 text-orange-600"
              href="/admin/applications?status=all"
              helper="All submitted applications"
            />
            <StatCard
              label="Pending Applications"
              value={stats.pendingApplications ?? stats.applications?.pending ?? 0}
              icon={Clock}
              tone="bg-amber-50 text-amber-700"
              href="/admin/applications?status=pending"
              helper="Awaiting administrator review"
            />
            <StatCard
              label="Approved Listings"
              value={stats.approvedListings ?? stats.providers?.approved ?? 0}
              icon={Building2}
              tone="bg-indigo-50 text-indigo-700"
              href="/admin/providers?publication=DRAFT"
              helper="Verified & ready to publish"
            />
            <StatCard
              label="Published Listings"
              value={stats.publishedListings ?? stats.providers?.published ?? 0}
              icon={CheckCircle2}
              tone="bg-emerald-50 text-emerald-700"
              href="/admin/providers?publication=PUBLISHED"
              helper="Live in public marketplace"
            />
            <StatCard
              label="Rejected Applications"
              value={stats.rejectedApplications ?? stats.applications?.rejected ?? 0}
              icon={XCircle}
              tone="bg-rose-50 text-rose-700"
              href="/admin/applications?status=rejected"
              helper="Declined with reason"
            />
            <StatCard
              label="Suspended Providers"
              value={stats.suspendedProviders ?? stats.providers?.suspended ?? 0}
              icon={ShieldAlert}
              tone="bg-red-100 text-red-800"
              href="/admin/providers?status=SUSPENDED"
              helper={`${stats.suspendedListings ?? 0} suspended listings`}
            />
            <StatCard
              label="Category Requests"
              value={stats.pendingCategoryRequests ?? 0}
              icon={FolderPlus}
              tone="bg-purple-50 text-purple-700"
              href="/admin/category-requests"
              helper="Pending custom categories"
            />
          </div>

          <div className="mt-7 grid lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="font-bold text-slate-900">Recent Applications</h2>
                <Link className="text-xs font-bold text-orange-600 hover:underline" to="/admin/applications">
                  View all →
                </Link>
              </div>
              {data.recentApplications?.length ? (
                <div className="divide-y divide-slate-100">
                  {data.recentApplications.map((app) => (
                    <div
                      key={app._id}
                      className="py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {app.businessName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {app.category} · {app.city} · {app.contactPerson}
                        </p>
                      </div>
                      <Link
                        to={`/admin/applications/${app._id}`}
                        className="text-xs font-bold text-orange-600 hover:underline shrink-0"
                      >
                        Review →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  No provider applications yet.
                </p>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="font-bold text-slate-900 flex gap-2 items-center">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span>Recent Activity</span>
                </h2>
                <Link className="text-xs font-bold text-orange-600 hover:underline" to="/admin/activity-logs">
                  Full audit log →
                </Link>
              </div>
              {data.recentActivityLogs?.length ? (
                <div className="divide-y divide-slate-100">
                  {data.recentActivityLogs.slice(0, 6).map((log) => (
                    <div key={log._id} className="py-3.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{log.action}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{log.adminEmail}</p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(log.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  No activity recorded yet.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
