import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import {
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

export default function AdminProviderEditPage() {
  const { id } = useParams();

  const [provider, setProvider] = useState(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    businessName: '',
    providerName: '',
    description: '',
    category: '',
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
    api
      .get('/categories/admin/all')
      .then((res) => {
        if (Array.isArray(res?.data)) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  const loadProvider = useCallback(() => {
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
            description: p.description || '',
            category: p.category || '',
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

  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

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
      // Only send allow-listed fields (never send read-only slug or _id)
      const payload = {
        businessName: formData.businessName.trim(),
        providerName: formData.providerName.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        services: formData.services
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        address: formData.address.trim(),
        pinCode: formData.pinCode.trim(),
        serviceAreas: formData.serviceAreas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        website: formData.website.trim(),
        verificationStatus: formData.verificationStatus,
        publicationStatus: formData.publicationStatus,
        consentToDisplayPhone: Boolean(formData.consentToDisplayPhone),
        metaTitle: formData.metaTitle.trim(),
        metaDescription: formData.metaDescription.trim(),
      };

      const res = await api.put(`/admin/providers/${id}`, payload);

      if (res.success && res.data) {
        setProvider(res.data);
        setSuccessMsg('Listing profile and publication settings updated successfully!');
        loadProvider();
      } else {
        setErrorMsg(res.message || 'Failed to update provider');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating provider');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLifecycleAction = async (action) => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/admin/providers/${id}/${action}`, {});
      if (res.success) {
        setSuccessMsg(res.message || `Action ${action} completed.`);
        loadProvider();
      }
    } catch (err) {
      setErrorMsg(err.message || `Unable to ${action} listing`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit Listing" subtitle="Loading profile...">
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#F36B21] border-t-transparent rounded-full animate-spin mb-3" />
        </div>
      </AdminLayout>
    );
  }

  const isSuspended =
    provider?.status === 'SUSPENDED' || provider?.providerAccount?.status === 'SUSPENDED';

  return (
    <AdminLayout
      title={`Edit Listing: ${provider?.businessName || ''}`}
      subtitle={`Public URL: /providers/${provider?.slug || ''}`}
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/providers"
          className="text-xs font-bold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Listings</span>
        </Link>

        {/* Lifecycle Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {formData.publicationStatus === 'PUBLISHED' ? (
            <>
              <a
                href={`/providers/${provider?.slug}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
              >
                <span>Live Public Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => handleLifecycleAction('unpublish')}
                disabled={isSaving}
                className="py-2 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Unpublish to Draft
              </button>
            </>
          ) : (
            !isSuspended && (
              <button
                type="button"
                onClick={() => handleLifecycleAction('publish')}
                disabled={isSaving || formData.verificationStatus !== 'VERIFIED'}
                className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                Publish to Marketplace
              </button>
            )
          )}

          {isSuspended ? (
            <button
              type="button"
              onClick={() => handleLifecycleAction('reactivate')}
              disabled={isSaving}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reactivate Provider</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleLifecycleAction('suspend')}
              disabled={isSaving}
              className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Suspend Provider</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {provider?.shopImage?.url && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#F36B21]" />
                  <span>Property / Establishment Photograph</span>
                </h3>
                <div className="flex items-center gap-4">
                  <img
                    src={provider.shopImage.url}
                    alt="Property"
                    className="w-36 h-24 object-cover rounded-lg border border-slate-200 shadow-2xs"
                  />
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-900">
                      {provider.shopImage.originalName || 'Property Image'}
                    </p>
                    <a
                      href={provider.shopImage.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#F36B21] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Open full image</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Core Listing Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Business / Property Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    name="providerName"
                    value={formData.providerName}
                    onChange={handleChange}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white font-semibold"
                >
                  <option value="">Select Active Category</option>
                  {categories
                    .filter((c) => c.status === 'ACTIVE' || c.name === formData.category)
                    .map((c) => (
                      <option key={c._id || c.slug} value={c.name}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Services Offered (Comma-separated)
                </label>
                <input
                  type="text"
                  name="services"
                  value={formData.services}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                />
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Location & Coverage
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleChange}
                    maxLength={6}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Service Localities (Comma-separated)
                </label>
                <input
                  type="text"
                  name="serviceAreas"
                  value={formData.serviceAreas}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Governance & Lifecycle
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Verification Status
                </label>
                <select
                  name="verificationStatus"
                  value={formData.verificationStatus}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] font-semibold"
                >
                  <option value="VERIFIED">VERIFIED (Approved)</option>
                  <option value="UNVERIFIED">UNVERIFIED (Pending)</option>
                  <option value="REVOKED">REVOKED (Delisted)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Publication Status
                </label>
                <select
                  name="publicationStatus"
                  value={formData.publicationStatus}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] font-semibold"
                >
                  <option value="DRAFT">DRAFT (Hidden from Public)</option>
                  <option value="PUBLISHED">PUBLISHED (Live Marketplace)</option>
                  <option value="ARCHIVED">ARCHIVED (Unlisted)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consentToDisplayPhone"
                    checked={formData.consentToDisplayPhone}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#F36B21] rounded mt-0.5"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    <strong>Display Phone Publicly:</strong> Allow customers to reveal and call this
                    owner’s phone number.
                  </span>
                </label>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Owner Contact Details
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {provider?.providerAccount?.phoneVerified
                    ? 'Verified Phone Number (Locked to Account)'
                    : 'Business Mobile Number'}
                </label>
                <input
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  readOnly={Boolean(provider?.providerAccount?.phoneVerified)}
                  className="w-full text-xs p-3 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F36B21] focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 px-4 rounded-lg bg-[#F36B21] hover:bg-[#D95513] disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Listing Changes'}</span>
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
