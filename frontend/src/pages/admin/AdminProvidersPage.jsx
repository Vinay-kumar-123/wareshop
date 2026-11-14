import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Building2,
  Search,
  CheckCircle2,
  Phone,
  Eye,
  Edit,
  ExternalLink,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function AdminProvidersPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const publicationStatus = searchParams.get('publication') || 'all';
  const [search, setSearch] = useState('');
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProviders = () => {
    setIsLoading(true);
    const query = new URLSearchParams();
    if (publicationStatus !== 'all') query.set('publicationStatus', publicationStatus);
    if (search) query.set('search', search);

    api
      .get(`/admin/providers?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.success && res.data) {
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
  };

  useEffect(() => {
    fetchProviders();
  }, [publicationStatus, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProviders();
  };

  return (
    <AdminLayout title="Verified Provider Profiles" subtitle="Manage profile publication, contact phone visibility, and public listings">
      {/* Filters Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { label: 'All Profiles', value: 'all' },
            { label: 'Published (Public)', value: 'PUBLISHED' },
            { label: 'Drafts (Pending)', value: 'DRAFT' },
            { label: 'Archived', value: 'ARCHIVED' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSearchParams({ publication: tab.value })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                publicationStatus === tab.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business, city, phone..."
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

      {/* Providers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Querying provider directory...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Providers Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Approve partner applications to generate verified provider profiles.
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
                  <th className="py-3 px-4">Public Phone</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Publication</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{p.businessName}</span>
                      <span className="text-[11px] font-mono text-slate-500 block truncate max-w-xs">/providers/{p.slug}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{p.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{p.city}</td>
                    <td className="py-3.5 px-4">
                      {p.contactNumber ? (
                        <span className="font-mono font-bold text-teal-700">{p.contactNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Hidden / Not Set</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {p.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.publicationStatus === 'PUBLISHED'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : p.publicationStatus === 'DRAFT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.publicationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {p.publicationStatus === 'PUBLISHED' && (
                        <a
                          href={`/providers/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-600 p-1 inline-block"
                          title="View on Live Website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Link
                        to={`/admin/providers/${p._id}`}
                        className="btn-secondary py-1 px-3 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit Profile</span>
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
