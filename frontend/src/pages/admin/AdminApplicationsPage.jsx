import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import { Users, Search, ArrowRight, RotateCcw } from 'lucide-react';

export default function AdminApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || 'pending';
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
  const [categories, setCategories] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/categories/admin/all')
      .then((res) => {
        if (Array.isArray(res?.data)) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  const fetchApplications = useCallback(() => {
    setIsLoading(true);
    setError('');
    const query = new URLSearchParams();
    if (currentStatus) query.set('status', currentStatus);
    if (categoryFilter && categoryFilter !== 'all') query.set('category', categoryFilter);
    if (cityFilter.trim()) query.set('city', cityFilter.trim());
    if (search.trim()) query.set('search', search.trim());

    api
      .get(`/admin/applications?${query.toString()}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setApplications(res.data);
        } else {
          setError('Failed to fetch applications');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error querying application records');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentStatus, categoryFilter, cityFilter, search]);

  useEffect(() => {
    fetchApplications();
  }, [currentStatus, categoryFilter, fetchApplications]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleTabChange = (status) => {
    setSearchParams({ status });
  };

  const handleReset = () => {
    setSearch('');
    setCategoryFilter('all');
    setCityFilter('');
    setSearchParams({ status: 'pending' });
  };

  const renderStatusBadge = (rawStatus) => {
    const s = String(rawStatus || '').toUpperCase();
    if (s === 'NEW' || s === 'SUBMITTED') {
      return (
        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          SUBMITTED
        </span>
      );
    }
    if (s === 'APPROVED' || s === 'QUALIFIED' || s === 'CONVERTED') {
      return (
        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
          APPROVED
        </span>
      );
    }
    if (s === 'PUBLISHED') {
      return (
        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          PUBLISHED
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
          REJECTED
        </span>
      );
    }
    return (
      <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        {s}
      </span>
    );
  };

  return (
    <AdminLayout
      title="Provider Applications"
      subtitle="Review, filter, approve, or reject submitted commercial property and business applications"
    >
      {/* Search & Filter Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { label: 'Pending Review', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'All Submissions', value: 'all' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  currentStatus === tab.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Category, City, and Search Filter Row */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c._id || c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
            <option value="other">Other (Custom Request)</option>
          </select>

          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city (e.g. Mumbai)..."
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
          />

          <div className="relative sm:col-span-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business name, contact person, phone, reference ID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-7 h-7 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Querying partner applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Applications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no applications matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Business / Property</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Owner Contact</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{app.businessName}</span>
                      <span className="text-[11px] text-slate-500 truncate block max-w-xs">
                        {app.email || 'No email'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {app.category}
                      {app.customCategoryName && (
                        <span className="block text-[10px] text-indigo-600">
                          Requested: {app.customCategoryName}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{app.city}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-900 block">{app.contactPerson}</span>
                      <span className="text-[11px] font-mono text-slate-500">{app.phone}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {app.referenceId}
                    </td>
                    <td className="py-3.5 px-4">{renderStatusBadge(app.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/admin/applications/${app._id}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-orange-400 text-[11px] font-bold text-slate-800 inline-flex items-center gap-1"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
