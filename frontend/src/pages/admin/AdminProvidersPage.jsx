import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import {
  Building2,
  Search,
  Edit,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

export default function AdminProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const publicationStatus = searchParams.get('publication') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    api
      .get('/categories/admin/all')
      .then((res) => {
        if (Array.isArray(res?.data)) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  const fetchProviders = useCallback(() => {
    setIsLoading(true);
    setError('');
    const query = new URLSearchParams();
    if (publicationStatus !== 'all') query.set('publicationStatus', publicationStatus);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    if (categoryFilter !== 'all') query.set('category', categoryFilter);
    if (search.trim()) query.set('search', search.trim());

    api
      .get(`/admin/providers?${query.toString()}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setProviders(res.data);
        } else {
          setError('Failed to fetch providers');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error querying providers');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [publicationStatus, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchProviders();
  }, [publicationStatus, statusFilter, categoryFilter, fetchProviders]);

  const handleQuickAction = async (providerId, action) => {
    setError('');
    setActionMessage('');
    try {
      const res = await api.post(`/admin/providers/${providerId}/${action}`, {});
      if (res.success) {
        setActionMessage(res.message || `Action ${action} completed.`);
        fetchProviders();
      }
    } catch (err) {
      setError(err.message || `Unable to ${action} provider`);
    }
  };

  return (
    <AdminLayout
      title="Providers & Commercial Listings"
      subtitle="Manage listing publication, category assignment, and provider account suspension"
    >
      {/* Filters Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { label: 'All Listings', pub: 'all', st: 'all' },
              { label: 'Published (Live)', pub: 'PUBLISHED', st: 'all' },
              { label: 'Approved / Draft', pub: 'DRAFT', st: 'all' },
              { label: 'Suspended', pub: 'all', st: 'SUSPENDED' },
            ].map((tab) => {
              const active =
                publicationStatus === tab.pub && statusFilter === tab.st;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => {
                    const next = {};
                    if (tab.pub !== 'all') next.publication = tab.pub;
                    if (tab.st !== 'all') next.status = tab.st;
                    setSearchParams(next);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setSearch('');
              setSearchParams({});
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchProviders();
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c._id || c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="sm:col-span-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by business name, city, owner phone..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Providers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-7 h-7 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Querying provider listings...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Provider Listings Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Approve pending applications to create verified listings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Business Name & Slug</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Owner Phone</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map((p) => {
                  const isSuspended =
                    p.status === 'SUSPENDED' || p.accountStatus === 'SUSPENDED';
                  const isPublished = p.publicationStatus === 'PUBLISHED';

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{p.businessName}</span>
                        <span className="text-[11px] font-mono text-slate-500 block truncate max-w-xs">
                          /providers/{p.slug}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{p.category}</td>
                      <td className="py-3.5 px-4 text-slate-600">{p.city}</td>
                      <td className="py-3.5 px-4">
                        {p.contactNumber ? (
                          <span className="font-mono font-bold text-slate-800">
                            +91 {p.contactNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not Set</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300">
                            <ShieldAlert className="w-3 h-3" />
                            <span>SUSPENDED</span>
                          </span>
                        ) : isPublished ? (
                          <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            PUBLISHED
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                            {p.status || p.publicationStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isPublished && (
                            <a
                              href={`/providers/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title="View Live Public Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {!isSuspended && !isPublished && p.verificationStatus === 'VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(p._id, 'publish')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Publish
                            </button>
                          )}

                          {isPublished && (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(p._id, 'unpublish')}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold cursor-pointer"
                            >
                              Unpublish
                            </button>
                          )}

                          {isSuspended ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(p._id, 'reactivate')}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold cursor-pointer"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(p._id, 'suspend')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}

                          <Link
                            to={`/admin/providers/${p._id}`}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-orange-400 text-[11px] font-bold text-slate-800 inline-flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
