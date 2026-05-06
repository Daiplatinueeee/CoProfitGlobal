import { useEffect, useState } from 'react';
import { Clock, Check, X } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

function PendingWithdrawGC() {
  const [records, setRecords]   = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actionError, setActionError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`${API_BASE_URL}/withdrawal/all?currency=gc_points&status=pending`);
      const json = await res.json();
      setRecords(Array.isArray(json) ? json : []);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    setActionError('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/withdrawal/${id}/approve`, {
        method:  'PATCH',
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json?.message ?? 'Failed to approve request.');
      } else {
        await fetchData();
      }
    } catch {
      setActionError('Network error. Please try again.');
    }
  };

  const handleDecline = async (id: string) => {
    setActionError('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/withdrawal/${id}/reject`, {
        method:  'PATCH',
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json?.message ?? 'Failed to reject request.');
      } else {
        await fetchData();
      }
    } catch {
      setActionError('Network error. Please try again.');
    }
  };

  const totalPendingGC = records.reduce((sum, r) => sum + r.amount, 0);
  const oldestDate = records.length
    ? new Date(records[records.length - 1].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Pending GC Withdrawals</h1>
          <p className="text-sm text-slate-400 mt-1">GC withdrawal requests currently awaiting processing</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Pending Requests', value: `${records.length}`,              valueSuffix: '',   sub: 'Awaiting admin approval' },
            { label: 'Total GC Held',    value: totalPendingGC.toLocaleString(),  valueSuffix: 'GC', sub: 'Combined pending amount' },
            { label: 'Oldest Request',   value: oldestDate,                        valueSuffix: '',   sub: 'Earliest pending submission' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">
                {stat.value}{' '}
                {stat.valueSuffix && (
                  <span className="text-sm font-medium text-slate-400">{stat.valueSuffix}</span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {actionError && (
          <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pending Requests</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {records.length} record{records.length !== 1 ? 's' : ''} awaiting action
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              All Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden sm:table-cell">#</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden sm:table-cell">Time</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Loading…</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
                        <p className="text-slate-400 text-sm">No pending GC withdrawals</p>
                        <p className="text-slate-300 text-xs">All requests have been processed</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-400 text-xs hidden sm:table-cell">{index + 1}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-slate-900 text-xs sm:text-sm">
                        {record.amount.toLocaleString()}{' '}
                        <span className="text-slate-400 font-normal text-xs">GC</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-500 text-xs sm:text-sm">
                        {new Date(record.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-500 text-xs sm:text-sm hidden sm:table-cell">
                        {new Date(record.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-center hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => handleApprove(record.id)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecline(record.id)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PendingWithdrawGC;