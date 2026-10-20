import { useEffect, useState } from 'react';
import { Clock, Check, X } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface WithdrawalRecord {
  id: string;
  user: { name: string; username: string; email: string; contact: string } | null;
  amount: number;
  accountName: string;
  contactNumber: string;
  notes: string;
  status: string;
  createdAt: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/** Claimant name entered on the request, falling back to the account name for older requests. */
const claimantName = (r: WithdrawalRecord) => r.accountName || r.user?.name || '—';
const claimantContact = (r: WithdrawalRecord) => r.contactNumber || r.user?.contact || '—';

function PendingWithdrawGC() {
  const [records, setRecords]   = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId]     = useState<string | null>(null);

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

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionError('');
    setBusyId(id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/withdrawal/${id}/${action}`, {
        method:  'PATCH',
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json?.message ?? `Failed to ${action} request.`);
      } else {
        await fetchData();
      }
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const totalPendingGC = records.reduce((sum, r) => sum + r.amount, 0);
  const oldestDate = records.length ? formatDate(records[records.length - 1].createdAt) : '—';

  const actionButtons = (record: WithdrawalRecord, fullWidth: boolean) => (
    <div className={`flex gap-2 ${fullWidth ? '' : 'items-center justify-center'}`}>
      <button
        onClick={() => handleAction(record.id, 'approve')}
        disabled={busyId === record.id}
        className={`${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50`}
      >
        <Check className="w-3 h-3" />
        Approve
      </button>
      <button
        onClick={() => handleAction(record.id, 'reject')}
        disabled={busyId === record.id}
        className={`${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition-colors disabled:opacity-50`}
      >
        <X className="w-3 h-3" />
        Decline
      </button>
    </div>
  );

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
            { label: 'Total GC Held',    value: totalPendingGC.toLocaleString(),  valueSuffix: 'GC', sub: 'Combined pending quantity' },
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

          {/* Mobile: Card List */}
          <div className="block md:hidden divide-y divide-slate-50">
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">Loading…</div>
            ) : records.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-slate-400 text-sm">No pending GC withdrawals</p>
                <p className="text-slate-300 text-xs mt-1">All requests have been processed</p>
              </div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="px-4 py-4 text-xs">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.user?.name || '—'}</p>
                      {r.user?.username && <p className="text-slate-400">@{r.user.username}</p>}
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {r.amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">GC</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                    <div><span className="text-slate-400">Claimant</span><p className="text-slate-700 font-medium">{claimantName(r)}</p></div>
                    <div><span className="text-slate-400">Contact</span><p className="text-slate-700 font-medium">{claimantContact(r)}</p></div>
                    <div className="col-span-2"><span className="text-slate-400">Requested</span><p className="text-slate-700">{formatDate(r.createdAt)} · {formatTime(r.createdAt)}</p></div>
                    {r.notes && (
                      <div className="col-span-2"><span className="text-slate-400">Notes</span><p className="text-slate-700 whitespace-pre-wrap">{r.notes}</p></div>
                    )}
                  </div>
                  {actionButtons(r, true)}
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-4 lg:px-6 py-3">Requester</th>
                  <th className="text-right px-4 lg:px-6 py-3">Quantity</th>
                  <th className="text-left px-4 lg:px-6 py-3">Claimant / Contact</th>
                  <th className="text-left px-4 lg:px-6 py-3 hidden lg:table-cell">Notes</th>
                  <th className="text-left px-4 lg:px-6 py-3">Requested</th>
                  <th className="text-center px-4 lg:px-6 py-3">Actions</th>
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
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors duration-150 align-top">
                      <td className="px-4 lg:px-6 py-4">
                        <p className="font-medium text-slate-900">{r.user?.name || '—'}</p>
                        {r.user?.username && <p className="text-xs text-slate-400 mt-0.5">@{r.user.username}</p>}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {r.amount.toLocaleString()} <span className="text-slate-400 font-normal text-xs">GC</span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <p className="text-slate-700">{claimantName(r)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{claimantContact(r)}</p>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-slate-500 text-xs max-w-xs whitespace-pre-wrap hidden lg:table-cell">
                        {r.notes || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <p className="text-slate-700">{formatDate(r.createdAt)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatTime(r.createdAt)}</p>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {actionButtons(r, false)}
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
