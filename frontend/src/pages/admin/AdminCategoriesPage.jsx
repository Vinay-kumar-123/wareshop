import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, CheckCircle2, XCircle, FolderPlus } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';

const blankCategory = {
  name: '',
  shortDescription: '',
  description: '',
  icon: 'Layers',
  displayOrder: 0,
  status: 'ACTIVE',
};

export default function AdminCategoriesPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/categories/admin/all')
      .then((r) => setItems(r.data || []))
      .catch((e) => setError(e.message || 'Unable to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const method = form._id ? 'put' : 'post';
      const endpoint = form._id ? `/categories/admin/${form._id}` : '/categories/admin';
      const result = await api[method](endpoint, form);
      setMessage(result.message || 'Category saved successfully.');
      setForm(null);
      load();
    } catch (e) {
      setError(e.message || 'Unable to save category');
    }
  };

  const toggleStatus = async (item) => {
    setMessage('');
    setError('');
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/categories/admin/${item._id}`, { status: nextStatus });
      setMessage(`Category "${item.name}" is now ${nextStatus}.`);
      load();
    } catch (e) {
      setError(e.message || 'Unable to update category status');
    }
  };

  const filtered = items.filter((item) =>
    `${item.name} ${item.slug} ${item.description || ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <AdminLayout
      title="Category Management"
      subtitle="Create, edit, reorder, and activate/deactivate commercial property categories"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-2 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21]"
            placeholder="Search categories..."
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/category-requests"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-[#F36B21] text-xs font-bold text-slate-800 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-[#F36B21]" />
            <span>Review Custom Requests</span>
          </Link>
          <button
            type="button"
            onClick={() => setForm(blankCategory)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 rounded-lg bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200">
          {error}
        </div>
      )}

      {form && (
        <form
          onSubmit={save}
          className="mb-6 rounded-xl bg-white border border-slate-200 p-6 grid sm:grid-cols-2 gap-4 shadow-xs"
        >
          <h2 className="sm:col-span-2 font-extrabold text-slate-900 text-base">
            {form._id ? `Edit Category: ${form.name}` : 'Create New Category'}
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Category Name *
            </label>
            <input
              required
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
              placeholder="e.g. Cold Storage"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Short Subtitle
            </label>
            <input
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
              placeholder="e.g. Temperature-Controlled Storage"
              value={form.shortDescription || ''}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
              placeholder="Category description..."
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Display Order
            </label>
            <input
              type="number"
              min="0"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
              value={form.displayOrder ?? 0}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Status
            </label>
            <select
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-[#F36B21]"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE (Accepting Submissions & Visible)</option>
              <option value="INACTIVE">INACTIVE (Hidden & Closed to Submissions)</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex gap-2.5 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold cursor-pointer"
            >
              Save Category
            </button>
            <button
              type="button"
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              onClick={() => setForm(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_100px_120px_110px_160px] gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>Category & Slug</span>
          <span className="hidden sm:block">Order</span>
          <span className="hidden sm:block">Listings</span>
          <span className="hidden sm:block">Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading categories…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">No categories found.</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item._id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_100px_120px_110px_160px] gap-3 px-5 py-4 border-b border-slate-100 last:border-0 items-center text-xs hover:bg-slate-50/70 transition-colors"
            >
              <div>
                <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                <p className="text-xs text-slate-500">
                  /{item.slug} {item.shortDescription ? `· ${item.shortDescription}` : ''}
                </p>
              </div>
              <span className="hidden sm:block font-mono text-slate-600">
                #{item.displayOrder ?? 0}
              </span>
              <span className="hidden sm:block text-slate-700 font-semibold">
                {item.publishedCount ?? 0} pub / {item.businessCount ?? 0} total
              </span>
              <span className="hidden sm:block">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    item.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {item.status === 'ACTIVE' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span>{item.status}</span>
                </span>
              </span>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleStatus(item)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(item)}
                  className="px-2.5 py-1 rounded-lg bg-[#FFF5EF] text-[#D95513] border border-[#FFE6D5] hover:bg-[#FFE6D5]/60 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
