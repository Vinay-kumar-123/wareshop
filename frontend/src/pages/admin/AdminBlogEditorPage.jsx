import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Eye,
  Archive,
  ExternalLink
} from 'lucide-react';

const CATEGORY_CHOICES = [
  'Home & Construction',
  'Events & Lifestyle',
  'Business & Property',
  'Digital & Professional Services',
  'Education & Career',
];

export default function AdminBlogEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: CATEGORY_CHOICES[0],
    tags: '',
    authorName: 'KONNEVIA Editorial Team',
    authorRole: 'Domain Contributor',
    coverImage: '',
    status: 'draft',
    metaTitle: '',
    metaDescription: '',
    relatedServiceSlug: '',
  });

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isNew) {
      setIsLoading(true);
      api
        .get(`/admin/blogs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          if (res.success && res.data) {
            const b = res.data;
            setFormData({
              title: b.title || '',
              slug: b.slug || '',
              excerpt: b.excerpt || '',
              content: b.content || '',
              category: b.category || CATEGORY_CHOICES[0],
              tags: Array.isArray(b.tags) ? b.tags.join(', ') : '',
              authorName: b.author?.name || 'KONNEVIA Editorial Team',
              authorRole: b.author?.role || 'Domain Contributor',
              coverImage: b.coverImage || '',
              status: b.status || 'draft',
              metaTitle: b.metaTitle || '',
              metaDescription: b.metaDescription || '',
              relatedServiceSlug: b.relatedServiceSlug || '',
            });
          } else {
            setErrorMsg('Article not found');
          }
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Error loading article');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isNew, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSave = async (targetStatus) => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content,
        category: formData.category,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        author: {
          name: formData.authorName,
          role: formData.authorRole,
        },
        coverImage: formData.coverImage,
        status: targetStatus || formData.status,
        metaTitle: formData.metaTitle,
        metaDescription: formData.metaDescription,
        relatedServiceSlug: formData.relatedServiceSlug,
      };

      let res;
      if (isNew) {
        res = await api.post('/admin/blogs', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await api.put(`/admin/blogs/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (res.success && res.data) {
        setSuccessMsg(
          targetStatus === 'published'
            ? 'Article successfully published live!'
            : 'Article draft saved successfully!'
        );
        if (isNew) {
          navigate(`/admin/blogs/${res.data._id}`, { replace: true });
        } else {
          setFormData((prev) => ({ ...prev, status: res.data.status, slug: res.data.slug }));
        }
      } else {
        setErrorMsg(res.message || 'Failed to save article');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error saving article');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Blog Editor" subtitle="Loading article...">
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isNew ? 'Create Editorial Article' : `Edit: ${formData.title}`}
      subtitle={isNew ? 'Author a new guides or checklist article' : `Slug: /blog/${formData.slug}`}
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/blogs"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Articles</span>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isNew && formData.status === 'published' && (
            <a
              href={`/blog/${formData.slug}`}
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <span>View Public Article</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="btn-secondary py-1.5 px-4 text-xs font-bold"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={isSaving}
            className="btn-primary py-1.5 px-5 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{formData.status === 'published' ? 'Update & Keep Published' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Editor (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="b-title">
              Article Title *
            </label>
            <input
              id="b-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Essential Questions to Ask Before Hiring an Interior Designer"
              required
              className="input-field text-sm font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="b-slug">
                Custom URL Slug (Leave blank to auto-generate)
              </label>
              <input
                id="b-slug"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={handleChange}
                placeholder="auto-generated-from-title"
                className="input-field text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="b-cat">
                Service Vertical *
              </label>
              <select
                id="b-cat"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field text-xs bg-white"
              >
                {CATEGORY_CHOICES.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="b-excerpt">
              Article Summary / Excerpt *
            </label>
            <textarea
              id="b-excerpt"
              name="excerpt"
              rows={2}
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="A concise summary of key takeaways and actionable guidance..."
              required
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="b-content">
              Article Content (Markdown Supported) *
            </label>
            <textarea
              id="b-content"
              name="content"
              rows={16}
              value={formData.content}
              onChange={handleChange}
              placeholder="Write the editorial guide body using markdown headings (##, ###), bullet points, and numbered lists..."
              required
              className="input-field text-xs font-mono resize-y"
            />
          </div>
        </div>

        {/* Sidebar Settings (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata & Author Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Author & Category Mapping
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Author Name</label>
              <input
                name="authorName"
                type="text"
                value={formData.authorName}
                onChange={handleChange}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Author Role</label>
              <input
                name="authorRole"
                type="text"
                value={formData.authorRole}
                onChange={handleChange}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Topics / Tags (Comma-separated)</label>
              <input
                name="tags"
                type="text"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Interior Design, Renovation, Budget"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Related Service Slug (Optional CTA)</label>
              <input
                name="relatedServiceSlug"
                type="text"
                value={formData.relatedServiceSlug}
                onChange={handleChange}
                placeholder="interior-design"
                className="input-field text-xs font-mono"
              />
            </div>
          </div>

          {/* Technical SEO Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Technical SEO Metadata
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Title</label>
              <input
                name="metaTitle"
                type="text"
                value={formData.metaTitle}
                onChange={handleChange}
                placeholder="Defaults to article title if empty"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Description</label>
              <textarea
                name="metaDescription"
                rows={3}
                value={formData.metaDescription}
                onChange={handleChange}
                placeholder="Defaults to excerpt if empty"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cover Image Path / URL</label>
              <input
                name="coverImage"
                type="text"
                value={formData.coverImage}
                onChange={handleChange}
                placeholder="/assets/blog/interior-guide.jpg"
                className="input-field text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
