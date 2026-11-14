import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  ExternalLink,
  Archive,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function AdminBlogsPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || 'all';
  const [search, setSearch] = useState('');
  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBlogs = () => {
    setIsLoading(true);
    const query = new URLSearchParams();
    if (currentStatus !== 'all') query.set('status', currentStatus);
    if (search) query.set('search', search);

    api
      .get(`/admin/blogs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.success && res.data) {
          setBlogs(res.data);
        } else {
          setError('Failed to fetch blogs');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error querying blogs');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchBlogs();
  }, [currentStatus, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBlogs();
  };

  return (
    <AdminLayout title="Blog Editorial CMS" subtitle="Manage editorial guides, SEO metadata, and publishing status">
      {/* Filters Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { label: 'All Articles', value: 'all' },
            { label: 'Published (Live)', value: 'published' },
            { label: 'Drafts', value: 'draft' },
            { label: 'Archived', value: 'archived' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSearchParams({ status: tab.value })}
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

        {/* Search & New Article Action */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles by title..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </form>

          <Link
            to="/admin/blogs/new"
            className="btn-primary py-1.5 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Article</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Blogs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Querying editorial repository...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Articles Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Create an editorial article to publish advice and checklists.
            </p>
            <Link to="/admin/blogs/new" className="btn-primary py-1.5 px-4 text-xs font-semibold">
              Create First Article
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Title & Slug</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Published Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blogs.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block max-w-md truncate">{b.title}</span>
                      <span className="text-[11px] font-mono text-slate-500 block truncate max-w-xs">/blog/{b.slug}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{b.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{b.author?.name || 'Staff'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {b.status === 'published' && (
                        <a
                          href={`/blog/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-600 p-1 inline-block"
                          title="View on Live Website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Link
                        to={`/admin/blogs/${b._id}`}
                        className="btn-secondary py-1 px-3 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
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
