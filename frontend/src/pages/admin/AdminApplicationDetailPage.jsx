import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import {
  Users,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Calendar,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export default function AdminApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Image lightbox modal
  const [previewImage, setPreviewImage] = useState(null);

  const fetchApplication = () => {
    setIsLoading(true);
    api
      .get(`/admin/applications/${id}`)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('Application details not found');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error loading details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const handleApprove = async () => {
    setIsProcessing(true);
    setError('');
    setActionSuccess('');

    try {
      const res = await api.post(`/admin/applications/${id}/approve`, {});
      if (res.success) {
        setActionSuccess('Application approved successfully! Verified draft profile created.');
        fetchApplication();
      } else {
        setError(res.message || 'Failed to approve application');
      }
    } catch (err) {
      setError(err.message || 'Approval error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setError('A rejection reason is mandatory');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const res = await api.post(`/admin/applications/${id}/reject`, {
        reason: rejectReason.trim(),
      });
      if (res.success) {
        setShowRejectModal(false);
        setActionSuccess('Application rejected successfully.');
        fetchApplication();
      } else {
        setError(res.message || 'Failed to reject application');
      }
    } catch (err) {
      setError(err.message || 'Rejection error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Application Details" subtitle="Loading record...">
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-500 font-medium">Fetching application data from database...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Application Details" subtitle="Error">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Could not load application</h3>
          <p className="text-xs text-slate-500 mb-6">{error || 'Record does not exist'}</p>
          <Link to="/admin/applications" className="btn-secondary py-2 px-4 text-xs font-semibold">
            Return to Applications List
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { application, linkedProvider } = data;
  const isPending = application.status === 'new';
  const isApproved = ['qualified', 'converted'].includes(application.status);
  const isRejected = application.status === 'rejected';

  return (
    <AdminLayout
      title={`Application: ${application.businessName}`}
      subtitle={`Ref ID: ${application.referenceId} · Submitted: ${new Date(
        application.createdAt
      ).toLocaleDateString()}`}
    >
      {/* Top Action Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/applications"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-teal-600">
                {application.referenceId}
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isPending
                    ? 'bg-amber-100 text-amber-800'
                    : isApproved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {application.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing}
                className="py-2 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Verify</span>
              </button>
            </>
          )}

          {isApproved && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Application Approved</span>
              </span>
              {linkedProvider && (
                <Link
                  to={`/admin/providers/${linkedProvider._id}`}
                  className="btn-secondary py-1.5 px-3.5 text-xs font-bold"
                >
                  Manage Provider
                </Link>
              )}
            </div>
          )}

          {isRejected && (
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              <span>Application Rejected</span>
            </span>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Linked Provider Alert Banner */}
      {linkedProvider && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <strong className="font-bold block mb-0.5">Linked Provider Record Active</strong>
            <span>
              Status: <span className="font-bold uppercase">{linkedProvider.publicationStatus}</span>{' '}
              · Verification:{' '}
              <span className="font-bold uppercase">{linkedProvider.verificationStatus}</span>
            </span>
          </div>
          <Link
            to={`/admin/providers/${linkedProvider._id}`}
            className="btn-primary py-1.5 px-3.5 text-xs font-semibold"
          >
            Open Profile Editor
          </Link>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Shop / Business Image Review Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-teal-600" />
              <span>Shop & Business Image Verification</span>
            </h3>

            {application.shopImage?.url ? (
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="relative group cursor-pointer" onClick={() => setPreviewImage(application.shopImage.url)}>
                  <img
                    src={application.shopImage.url}
                    alt="Applicant Shop"
                    className="w-48 h-36 object-cover rounded-xl border border-slate-200 shadow-sm group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-xs space-y-2">
                  <p className="font-bold text-slate-900 text-sm">
                    {application.shopImage.originalName || 'Business Shop Photo'}
                  </p>
                  <p className="text-slate-500">
                    File Type: <span className="font-mono">{application.shopImage.mimeType || 'image/jpeg'}</span>
                  </p>
                  {application.shopImage.size > 0 && (
                    <p className="text-slate-500">
                      Size: <span className="font-mono">{(application.shopImage.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </p>
                  )}
                  {application.shopImage.uploadedAt && (
                    <p className="text-slate-500">
                      Uploaded: {new Date(application.shopImage.uploadedAt).toLocaleString()}
                    </p>
                  )}
                  <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    Stored via {application.shopImage.url.startsWith('http') ? 'Cloud Object Storage' : 'Local Secure Sink'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No shop photo uploaded with application</p>
                <p className="text-slate-400 mt-0.5">The applicant did not provide a physical storefront image.</p>
              </div>
            )}
          </div>

          {/* Business & Scope Details */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Business Information
            </h3>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Business / Trade Name</span>
              <span className="text-lg font-bold text-slate-900 block">{application.businessName}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Company Description</span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                {application.businessDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Primary Category</span>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg inline-block">
                  {application.category}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">City</span>
                <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  {application.city}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">State & PIN</span>
                <span className="text-xs font-bold text-slate-900">
                  {application.state || '—'} {application.pinCode ? `(${application.pinCode})` : ''}
                </span>
              </div>
            </div>

            {application.address && (
              <div>
                <span className="text-xs text-slate-400 block mb-1">Address</span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {application.address}
                </p>
              </div>
            )}

            <div>
              <span className="text-xs text-slate-400 block mb-2">Offered Services</span>
              <div className="flex flex-wrap gap-2">
                {application.servicesOffered?.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {application.serviceAreas && application.serviceAreas.length > 0 && (
              <div>
                <span className="text-xs text-slate-400 block mb-2">Service Coverage Localities</span>
                <div className="flex flex-wrap gap-1.5">
                  {application.serviceAreas.map((a, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Contact Verification Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Contact Coordinates
            </h3>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Contact Person</span>
              <span className="text-sm font-bold text-slate-900 block">{application.contactPerson}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Verified Phone</span>
              <a
                href={`tel:${application.phone}`}
                className="text-sm font-mono font-bold text-teal-600 hover:underline"
              >
                {application.phone}
              </a>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Email Address</span>
              <a
                href={`mailto:${application.email}`}
                className="text-xs text-slate-700 hover:underline"
              >
                {application.email}
              </a>
            </div>

            {application.website && (
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Website</span>
                <a
                  href={
                    application.website.startsWith('http')
                      ? application.website
                      : `https://${application.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                >
                  <span>{application.website}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div>
                Phone Consent Display:{' '}
                <span className="font-bold text-slate-900">
                  {application.consentToDisplayPhone !== false ? 'ALLOWED' : 'WITHHELD'}
                </span>
              </div>
              <div>
                Consent to Contact: <span className="font-bold text-slate-900">VERIFIED</span>
              </div>
              <div>
                Policy Version:{' '}
                <span className="font-mono">{application.consentPolicyVersion || '2026.1'}</span>
              </div>
              <div>
                Timestamp:{' '}
                <span>
                  {new Date(
                    application.consentTimestamp || application.createdAt
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Enlarged shop preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reject Partner Application</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Please specify the internal rationale for rejecting this application (e.g. invalid phone
              number, out of operating territory, incomplete documentation).
            </p>
            <form onSubmit={handleReject}>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter mandatory rejection reason..."
                required
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="btn-secondary py-1.5 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
