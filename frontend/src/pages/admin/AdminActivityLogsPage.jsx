import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import { Activity, Search, RefreshCw } from 'lucide-react';

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = () => {
    setIsLoading(true);
    setError('');
    api
      .get('/admin/activity-logs?limit=50')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setLogs(res.data);
        } else {
          setLogs([]);
        }
      })
      .catch((err) => {
        setError(err.message || 'Error fetching activity logs');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action) => {
    const a = String(action || '').toUpperCase();
    if (a.includes('APPROVED') || a.includes('SUCCESS') || a.includes('PUBLISHED') || a === 'LOGIN') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (a.includes('REJECTED') || a.includes('FAILED') || a.includes('SUSPENDED')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (a.includes('ROTATED') || a.includes('BOOTSTRAP')) {
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const filteredLogs = logs.filter((log) => {
    if (targetFilter !== 'ALL' && String(log.targetType || '').toUpperCase() !== targetFilter) {
      return false;
    }
    if (!query.trim()) return true;
    const text = `${log.action || ''} ${log.adminEmail || ''} ${log.targetType || ''} ${
      log.ip || ''
    } ${log.details ? JSON.stringify(log.details) : ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const targetTypes = Array.from(
    new Set(logs.map((l) => String(l.targetType || '').toUpperCase()).filter(Boolean))
  );

  return (
    <AdminLayout
      title="System Activity & Audit Logs"
      subtitle="Immutable trail of administrative operations, security audits, and state transitions"
    >
      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter audit logs by action, operator, details..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#F36B21] focus:bg-white"
            />
          </div>

          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F36B21]"
          >
            <option value="ALL">All Target Types</option>
            {targetTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-3 border-[#F36B21] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading audit records from database...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No matching activity logs found</p>
            <p className="text-slate-400 mt-0.5">
              Administrative events will automatically populate as operations occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target Type</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {log.adminEmail}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {log.targetType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ip || '127.0.0.1'}
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
