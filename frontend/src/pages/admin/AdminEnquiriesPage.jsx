import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import {
  FileText,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  X,
  UserCheck,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New / Received' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected enquiry for inspection / status update
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const fetchEnquiries = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    api
      .get(`/admin/enquiries?${params.toString()}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setEnquiries(res.data);
        } else {
          setEnquiries([]);
        }
      })
      .catch((err) => {
        setError(err.message || 'Error loading enquiries');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchEnquiries();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEnquiries();
  };

  const handleStatusUpdate = async () => {
    if (!selectedEnquiry || !newStatus) return;
    setIsUpdatingStatus(true);
    setActionNotice('');

    try {
      const res = await api.put(`/admin/enquiries/${selectedEnquiry._id}/status`, {
        status: newStatus,
      });

      if (res.success && res.data) {
        setActionNotice(`Enquiry status updated to ${newStatus.toUpperCase()}`);
        setSelectedEnquiry(res.data);
        fetchEnquiries();
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'contacted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'qualified':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'converted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'closed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <AdminLayout
      title="Customer Enquiries & Leads"
      subtitle="Operational lead desk for customer project scopes and quote requests"
    >
      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by name, phone, email, ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#13A89E]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#13A89E] font-medium"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionNotice && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-3 border-[#13A89E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading enquiries from database...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No customer enquiries found</p>
            <p className="text-slate-400 mt-0.5">
              No matching records for current filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Ref ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Service Scope</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enq) => (
                  <tr key={enq._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#13A89E]">
                      {enq.referenceId}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{enq.name}</span>
                      <span className="text-slate-400 text-[11px]">{enq.phone}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{enq.service || enq.category}</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-xs block">
                        {enq.requirements}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{enq.city}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                          enq.status
                        )}`}
                      >
                        {enq.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(enq.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEnquiry(enq);
                          setNewStatus(enq.status);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-[#13A89E] hover:text-white text-slate-700 font-semibold transition-colors inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enquiry Detail Inspection & Status Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <span className="text-xs font-mono font-bold text-[#13A89E] block">
                  {selectedEnquiry.referenceId}
                </span>
                <h3 className="text-lg font-black text-[#142D4E]">{selectedEnquiry.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Phone Number</span>
                  <a
                    href={`tel:${selectedEnquiry.phone}`}
                    className="font-mono font-bold text-teal-600 text-sm hover:underline"
                  >
                    {selectedEnquiry.phone}
                  </a>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Email</span>
                  <span className="font-semibold text-slate-800">
                    {selectedEnquiry.email || 'Not provided'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">
                  Project Requirements
                </span>
                <p className="text-sm text-slate-800 leading-relaxed font-normal">
                  {selectedEnquiry.requirements}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Category</span>
                  <span className="font-bold text-slate-800">{selectedEnquiry.category}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Service</span>
                  <span className="font-bold text-slate-800">{selectedEnquiry.service || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">City</span>
                  <span className="font-bold text-slate-800">{selectedEnquiry.city}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Budget</span>
                  <span className="font-bold text-slate-800">
                    {selectedEnquiry.estimatedBudget || 'Flexible'}
                  </span>
                </div>
              </div>

              {/* Status Update Control */}
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div>
                  <span className="text-xs font-bold text-teal-900 block">
                    Operational Status Transition
                  </span>
                  <span className="text-[11px] text-teal-700">
                    Update current lifecycle status of this customer enquiry.
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="text-xs py-2 px-3 bg-white border border-teal-300 rounded-xl focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="new">NEW (Uncontacted)</option>
                    <option value="contacted">CONTACTED</option>
                    <option value="qualified">QUALIFIED</option>
                    <option value="assigned">ASSIGNED</option>
                    <option value="converted">CONVERTED (Won)</option>
                    <option value="closed">CLOSED</option>
                    <option value="rejected">REJECTED</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={isUpdatingStatus || newStatus === selectedEnquiry.status}
                    className="btn-primary py-2 px-4 text-xs font-bold whitespace-nowrap disabled:opacity-50"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Save Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
