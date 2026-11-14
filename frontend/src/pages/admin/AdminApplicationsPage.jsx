import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export default function AdminApplicationsPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || 'pending';
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApplications = () => {
    setIsLoading(true);
    const query = new URLSearchParams();
    if (currentStatus) query.set('status', currentStatus);
    if (search) query.set('search', search);

    api
      .get(`/admin/applications?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.success && res.data) {
          setApplications(res.data);
        } else {
          setError('Failed to fetch applications');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error querying records');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchApplications();
  }, [currentStatus, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleTabChange = (status) => {
    setSearchParams({ status });
  };

  return (
    <AdminLayout title="Partner Applications" subtitle="Review incoming service provider registrations">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                currentStatus === tab.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business, city, ref..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <button type="submit" className="p-1.5 bg-slate-900 text-white rounded-xl text-xs hover:bg-slate-800">
            <Search className="w-3.5 h-3.5" />
          </button>
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
            <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Querying partner applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Applications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no partner applications matching the selected status or query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Business / Trade Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Contact Person</th>
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
                      <span className="text-[11px] text-slate-500 truncate block max-w-xs">{app.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{app.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{app.city}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-900 block">{app.contactPerson}</span>
                      <span className="text-[11px] text-slate-500">{app.phone}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{app.referenceId}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          app.status === 'new'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : app.status === 'qualified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {app.status === 'new' ? 'PENDING' : app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/admin/applications/${app._id}`}
                        className="btn-secondary py-1 px-3 text-[11px] font-semibold inline-flex items-center gap-1"
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
