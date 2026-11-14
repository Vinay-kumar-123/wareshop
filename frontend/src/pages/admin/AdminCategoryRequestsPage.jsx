import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FolderPlus, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';

export default function AdminCategoryRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedMapCategory, setSelectedMapCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');
    const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    Promise.all([
      api.get(`/categories/admin/requests${qs}`),
      api.get('/categories/admin/all'),
    ])
      .then(([reqRes, catRes]) => {
        setRequests(Array.isArray(reqRes?.data) ? reqRes.data : []);
        setCategories(
          Array.isArray(catRes?.data)
            ? catRes.data.filter((c) => c.status === 'ACTIVE')
            : []
        );
      })
      .catch((err) => setError(err.message || 'Unable to load custom category requests'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReview = async (reqItem, action) => {
    setMessage('');
    setError('');

    const payload = { action };
    if (action === 'map') {
      const targetCatId = selectedMapCategory[reqItem._id];
      if (!targetCatId) {
        setError('Please select an active category to map this request to.');
        return;
      }
      payload.categoryId = targetCatId;
    }

    try {
      const res = await api.post(`/categories/admin/requests/${reqItem._id}/review`, payload);
      if (res.success) {
        setMessage(res.message || `Custom category request ${action}d successfully.`);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Unable to process category request');
    }
  };

  return (
    <AdminLayout
      title="Custom Category Requests"
      subtitle="Approve new commercial categories, map requests to existing categories, or reject"
    >
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Pending Review', value: 'PENDING' },
            { label: 'Approved / Mapped', value: 'APPROVED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'All Requests', value: 'all' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          to="/admin/categories"
          className="text-xs font-bold text-[#F36B21] hover:underline inline-flex items-center gap-1"
        >
          <span>Manage All Categories</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {message && (
        <div className="mb-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading custom category requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-14 text-center">
            <FolderPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Custom Category Requests</h3>
            <p className="text-xs text-slate-400 mt-1">
              When providers select &ldquo;Other&rdquo; during listing submission, their requested
              category appears here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((reqItem) => (
              <div
                key={reqItem._id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900">
                      {reqItem.requestedName}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        reqItem.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : reqItem.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {reqItem.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Submitted: {new Date(reqItem.createdAt).toLocaleDateString('en-IN')}
                    {reqItem.applicationId && (
                      <>
                        {' · '}
                        <Link
                          to={`/admin/applications/${reqItem.applicationId}`}
                          className="text-[#F36B21] font-bold hover:underline"
                        >
                          View Linked Application →
                        </Link>
                      </>
                    )}
                  </p>
                </div>

                {reqItem.status === 'PENDING' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(reqItem, 'approve')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve as New Category</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedMapCategory[reqItem._id] || ''}
                        onChange={(e) =>
                          setSelectedMapCategory((prev) => ({
                            ...prev,
                            [reqItem._id]: e.target.value,
                          }))
                        }
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                      >
                        <option value="">Map to existing...</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleReview(reqItem, 'map')}
                        className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Map
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReview(reqItem, 'reject')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
