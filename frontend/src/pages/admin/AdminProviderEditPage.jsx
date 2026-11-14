import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import {
  Building2,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Phone,
  Eye,
  Globe,
  Trash2,
  Image as ImageIcon,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

export default function AdminProviderEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [formData, setFormData] = useState({
    businessName: '',
    providerName: '',
    slug: '',
    description: '',
    category: '',
    categorySlug: '',
    services: '',
    contactNumber: '',
    email: '',
    city: '',
    state: '',
    address: '',
    pinCode: '',
    serviceAreas: '',
    website: '',
    verificationStatus: 'VERIFIED',
    publicationStatus: 'DRAFT',
    consentToDisplayPhone: true,
    metaTitle: '',
    metaDescription: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setIsLoading(true);
    api
      .get(`/admin/providers/${id}`)
      .then((res) => {
        if (res.success && res.data) {
          const p = res.data;
          setProvider(p);
          setFormData({
            businessName: p.businessName || '',
            providerName: p.providerName || '',
            slug: p.slug || '',
            description: p.description || '',
            category: p.category || '',
            categorySlug: p.categorySlug || '',
            services: Array.isArray(p.services) ? p.services.join(', ') : '',
            contactNumber: p.contactNumber || '',
            email: p.email || '',
            city: p.city || '',
            state: p.state || '',
            address: p.address || '',
            pinCode: p.pinCode || '',
            serviceAreas: Array.isArray(p.serviceAreas) ? p.serviceAreas.join(', ') : '',
            website: p.website || '',
            verificationStatus: p.verificationStatus || 'VERIFIED',
            publicationStatus: p.publicationStatus || 'DRAFT',
            consentToDisplayPhone: p.consentToDisplayPhone !== false,
            metaTitle: p.metaTitle || '',
            metaDescription: p.metaDescription || '',
          });
        } else {
          setErrorMsg('Provider not found');
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Error loading provider');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        ...formData,
        services: formData.services.split(',').map((s) => s.trim()).filter(Boolean),
        serviceAreas: formData.serviceAreas.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const res = await api.put(`/admin/providers/${id}`, payload);

      if (res.success && res.data) {
        setProvider(res.data);
        setSuccessMsg('Provider profile and publication settings updated successfully!');
      } else {
        setErrorMsg(res.message || 'Failed to update provider');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating provider');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublication = async (newStatus) => {
    setIsSaving(true);
    try {
      const res = await api.put(`/admin/providers/${id}`, { publicationStatus: newStatus });
      if (res.success) {
        setFormData((prev) => ({ ...prev, publicationStatus: newStatus }));
        setSuccessMsg(`Provider publication status changed to ${newStatus}.`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating publication status');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit Provider" subtitle="Loading profile...">
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Edit Profile: ${provider?.businessName}`}
      subtitle={`Slug: /providers/${provider?.slug}`}
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/providers"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Providers</span>
        </Link>

        {/* Quick Publication Actions */}
        <div className="flex items-center gap-2">
          {formData.publicationStatus === 'PUBLISHED' ? (
            <>
              <a
                href={`/providers/${provider?.slug}`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span>Live Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => togglePublication('DRAFT')}
                disabled={isSaving}
                className="py-1.5 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold"
              >
                Unpublish to Draft
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => togglePublication('PUBLISHED')}
              disabled={isSaving || formData.verificationStatus !== 'VERIFIED'}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold disabled:opacity-50"
            >
              Publish to Marketplace
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Shop Image Display */}
            {provider?.shopImage?.url && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                  <span>Verified Shop / Establishment Photo</span>
                </h3>
                <div className="flex items-center gap-4">
                  <img
                    src={provider.shopImage.url}
                    alt="Shop Establishment"
                    className="w-32 h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                  />
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-900">{provider.shopImage.originalName || 'Shop Image'}</p>
                    <p className="text-slate-400">Stored Key: {provider.shopImage.publicId}</p>
                    <a
                      href={provider.shopImage.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-600 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>View full image</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Core Business Information */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Core Identity
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    name="providerName"
                    value={formData.providerName}
                    onChange={handleChange}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Public Profile Slug (URL) *
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-slate-400 bg-slate-100 px-3 py-3 border border-r-0 border-slate-200 rounded-l-xl">
                    /providers/
                  </span>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    required
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Business Description *
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Category Slug *
                  </label>
                  <input
                    type="text"
                    name="categorySlug"
                    value={formData.categorySlug}
                    onChange={handleChange}
                    required
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Offered Services (Comma-separated)
                </label>
                <input
                  type="text"
                  name="services"
                  value={formData.services}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            {/* Address & Geographic Scope */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Location & Coverage
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">PIN Code</label>
                  <input
                    type="text"
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleChange}
                    maxLength={6}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Street Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Service Localities (Comma-separated)
                </label>
                <input
                  type="text"
                  name="serviceAreas"
                  value={formData.serviceAreas}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Governance, Contact & Publication */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Governance & Status
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Verification Status
                </label>
                <select
                  name="verificationStatus"
                  value={formData.verificationStatus}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 font-semibold"
                >
                  <option value="VERIFIED">VERIFIED (Vetted)</option>
                  <option value="UNVERIFIED">UNVERIFIED (Pending)</option>
                  <option value="REVOKED">REVOKED (Delisted)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Publication Status
                </label>
                <select
                  name="publicationStatus"
                  value={formData.publicationStatus}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 font-semibold"
                >
                  <option value="DRAFT">DRAFT (Hidden from Public)</option>
                  <option value="PUBLISHED">PUBLISHED (Live Marketplace)</option>
                  <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consentToDisplayPhone"
                    checked={formData.consentToDisplayPhone}
                    onChange={handleChange}
                    className="w-4 h-4 text-teal-600 rounded mt-0.5 focus:ring-teal-400"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    <strong>Display Phone Publicly:</strong> When checked, contact number is shown on
                    public provider card.
                  </span>
                </label>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Direct Coordinates
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Website URL</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary w-full py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
