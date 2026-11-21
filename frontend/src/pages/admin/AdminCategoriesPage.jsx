import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Upload,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api, { resolveMediaUrl } from '../../services/api.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const blankCategory = {
  name: '',
  shortDescription: '',
  description: '',
  icon: 'Layers',
  displayOrder: 0,
  status: 'ACTIVE',
  imageUrl: '',
};

function formatFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function CategoryRowThumb({ imageUrl, name }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(imageUrl);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
        <ImageIcon className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={name}
      onError={() => setFailed(true)}
      className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
    />
  );
}

export default function AdminCategoriesPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');
  const [existingImgFailed, setExistingImgFailed] = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!selectedImageFile) {
      setSelectedPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedImageFile);
    setSelectedPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImageFile]);

  const resetImageState = () => {
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    setExistingImgFailed(false);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreateForm = () => {
    setMessage('');
    setError('');
    resetImageState();
    setForm({ ...blankCategory });
  };

  const openEditForm = (item) => {
    setMessage('');
    setError('');
    resetImageState();
    setForm({
      _id: item._id,
      name: item.name || '',
      shortDescription: item.shortDescription || '',
      description: item.description || '',
      icon: item.icon || 'Layers',
      displayOrder: item.displayOrder ?? 0,
      status: item.status || 'ACTIVE',
      imageUrl: item.imageUrl || '',
    });
  };

  const closeForm = () => {
    resetImageState();
    setForm(null);
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Unsupported file format. Please select a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError(`Image size exceeds ${MAX_IMAGE_SIZE_MB}MB. Please choose a smaller file.`);
      event.target.value = '';
      return;
    }

    setImageError('');
    setSelectedImageFile(file);
    setRemoveExistingImage(false);
  };

  const handleClearSelectedImage = () => {
    setSelectedImageFile(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingImage = () => {
    setSelectedImageFile(null);
    setImageError('');
    setRemoveExistingImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    if (saving) return;
    if (imageError) return;

    setMessage('');
    setError('');
    setSaving(true);
    try {
      const method = form._id ? 'put' : 'post';
      const endpoint = form._id ? `/categories/admin/${form._id}` : '/categories/admin';

      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('shortDescription', form.shortDescription || '');
      payload.append('description', form.description || '');
      payload.append('icon', form.icon || 'Layers');
      payload.append('displayOrder', String(form.displayOrder ?? 0));
      payload.append('status', form.status || 'ACTIVE');

      if (selectedImageFile) {
        payload.append('image', selectedImageFile);
      } else if (form._id && removeExistingImage) {
        payload.append('removeImage', 'true');
      }

      const result = await api[method](endpoint, payload, { timeoutMs: 30_000 });
      setMessage(result.message || 'Category saved successfully.');
      closeForm();
      load();
    } catch (e) {
      setError(e.message || 'Unable to save category');
    } finally {
      setSaving(false);
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

  const existingImageUrl = form?.imageUrl ? resolveMediaUrl(form.imageUrl) : '';
  const hasExistingImage = Boolean(form?._id && existingImageUrl && !removeExistingImage);
  const previewSrc = selectedPreviewUrl || (hasExistingImage && !existingImgFailed ? existingImageUrl : '');

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
            onClick={openCreateForm}
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

          {/* Category Image Upload Section */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
              Category Image <span className="font-normal normal-case text-slate-400">(Optional)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
              id="category-image-input"
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              {previewSrc ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative w-full sm:w-44 aspect-[16/10] rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                    <img
                      src={previewSrc}
                      alt={form.name ? `${form.name} preview` : 'Category image preview'}
                      onError={() => {
                        if (!selectedPreviewUrl) setExistingImgFailed(true);
                      }}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold">
                      {selectedImageFile ? 'New Preview' : 'Current Image'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {selectedImageFile ? (
                      <p className="text-xs text-slate-700 font-semibold truncate">
                        {selectedImageFile.name}{' '}
                        <span className="text-slate-500 font-normal">
                          ({formatFileSize(selectedImageFile.size)})
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600">
                        This image is currently displayed on the public category card.
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:border-[#F36B21] text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#F36B21]" />
                        <span>{selectedImageFile ? 'Change Image' : 'Replace Image'}</span>
                      </button>

                      {selectedImageFile ? (
                        <button
                          type="button"
                          onClick={handleClearSelectedImage}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {form._id && existingImageUrl ? 'Revert Selection' : 'Remove Image'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRemoveExistingImage}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Image</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      JPEG, PNG, or WebP up to {MAX_IMAGE_SIZE_MB}MB. Recommended aspect ratio 16:10.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {removeExistingImage
                          ? 'Current category image will be removed when saved.'
                          : 'No category image uploaded'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        JPEG, PNG, or WebP up to {MAX_IMAGE_SIZE_MB}MB. Public cards fall back to a
                        default visual if left empty.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {removeExistingImage && existingImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveExistingImage(false);
                          setExistingImgFailed(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Keep Existing</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:border-[#F36B21] text-xs font-bold text-slate-800 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#F36B21]" />
                      <span>Upload Image</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {imageError && (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-700">
                {imageError}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
            >
              {saving ? 'Saving Category…' : 'Save Category'}
            </button>
            <button
              type="button"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-60"
              onClick={closeForm}
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
              <div className="flex items-center gap-3 min-w-0">
                <CategoryRowThumb imageUrl={item.imageUrl} name={item.name} />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    /{item.slug} {item.shortDescription ? `· ${item.shortDescription}` : ''}
                  </p>
                </div>
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
                  onClick={() => openEditForm(item)}
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
