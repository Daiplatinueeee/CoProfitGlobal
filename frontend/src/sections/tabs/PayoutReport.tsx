import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ADMIN_FEE = 50;

interface PersonRef {
  name: string;
  username: string;
}

interface WithdrawalRecord {
  id: string;
  userId: string;
  user: (PersonRef & { email: string; contact: string }) | null;
  amount: number;
  vat: number;
  totalAmount: number;
  paymentMethod: string;
  accountName: string;
  contactNumber: string;
  status: 'pending' | 'completed' | 'rejected' | 'cancelled' | string;
  adminNote: string;
  processedAt: string | null;
  processedBy: (PersonRef & { id: string }) | null;
  createdAt: string;
}

type StatusFilter = 'all' | 'pending' | 'completed' | 'rejected' | 'cancelled';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash:   'Cash',
  bank:   'Bank Transfer',
  wallet: 'GCash',
  crypto: 'Paymaya',
};

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending:   'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  rejected:  'bg-red-50 text-red-700 ring-1 ring-red-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

const peso = (n: number) => `₱${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/** Fees actually kept by the company — cancelled/rejected requests were refunded in full. */
const isSettledOrHeld = (r: WithdrawalRecord) => r.status === 'completed' || r.status === 'pending';

function processedLabel(r: WithdrawalRecord) {
  if (r.status === 'cancelled') return 'Cancelled by user';
  if (!r.processedBy) return r.processedAt ? '—' : '';
  return r.processedBy.name || `@${r.processedBy.username}`;
}

function csvEscape(value: string | number) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function PayoutReport() {
  const [records, setRecords] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState<StatusFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ currency: 'php' });
      if (status !== 'all') qs.set('status', status);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const res = await apiFetch(`${API_BASE_URL}/withdrawal/all?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed to load payouts');
      setRecords(Array.isArray(json) ? json : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [status, from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.user?.name, r.user?.username, r.accountName, r.contactNumber, r.processedBy?.name, r.processedBy?.username]
        .some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  }, [records, search]);

  const summary = useMemo(() => {
    const completed = filtered.filter((r) => r.status === 'completed');
    const pending = filtered.filter((r) => r.status === 'pending');
    const feeRecords = filtered.filter(isSettledOrHeld);
    return {
      count: filtered.length,
      completedCount: completed.length,
      paidOut: completed.reduce((s, r) => s + r.totalAmount, 0),
      grossCompleted: completed.reduce((s, r) => s + r.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, r) => s + r.amount, 0),
      fees: feeRecords.reduce((s, r) => s + (r.vat ?? 0) + ADMIN_FEE, 0),
    };
  }, [filtered]);

  const exportCsv = () => {
    const header = [
      'Requested Date', 'Requested Time', 'Requester', 'Username', 'Method', 'Account Name', 'Account / Contact No.',
      'Amount Requested', 'Processing Fee (10%)', 'Admin Fee', 'Net Payout', 'Status',
      'Processed Date', 'Processed Time', 'Processed By', 'Admin Note', 'Reference ID',
    ];
    const rows = filtered.map((r) => [
      formatDate(r.createdAt), formatTime(r.createdAt), r.user?.name ?? '', r.user?.username ?? '',
      PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod, r.accountName, r.contactNumber,
      r.amount, r.vat ?? 0, ADMIN_FEE, r.totalAmount, r.status,
      formatDate(r.processedAt), formatTime(r.processedAt), processedLabel(r), r.adminNote, r.id,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-report_${from || 'start'}_to_${to || 'today'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = 'px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-900 bg-white';

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Payout Report</h1>
            <p className="text-sm text-slate-400 mt-1">Every payout transaction, with request and processing timestamps for tracing</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Transactions', value: `${summary.count}`, sub: `${summary.completedCount} completed` },
            { label: 'Net Paid Out', value: peso(summary.paidOut), sub: `Gross ${peso(summary.grossCompleted)} deducted` },
            { label: 'Pending', value: peso(summary.pendingAmount), sub: `${summary.pendingCount} awaiting approval` },
            { label: 'Fees Collected', value: peso(summary.fees), sub: '10% + ₱50 (completed & pending)' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{s.label}</p>
              <p className="text-lg sm:text-2xl font-semibold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requester, account, or admin…"
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={inputClass}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} aria-label="From date" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} aria-label="To date" />
          </div>
        </div>

        {error && (
          <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Mobile cards */}
          <div className="block md:hidden divide-y divide-slate-50">
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-slate-400">No payout transactions found</div>
            ) : filtered.map((r) => (
              <div key={r.id} className="px-4 py-4 text-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.user?.name || '—'}</p>
                    {r.user?.username && <p className="text-slate-400">@{r.user.username}</p>}
                  </div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[r.status] ?? STATUS_BADGE.cancelled}`}>
                    {r.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div><span className="text-slate-400">Requested</span><p className="text-slate-700">{formatDate(r.createdAt)} · {formatTime(r.createdAt)}</p></div>
                  <div><span className="text-slate-400">Method</span><p className="text-slate-700">{PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}</p></div>
                  <div><span className="text-slate-400">Amount</span><p className="text-slate-900 font-semibold">{peso(r.amount)}</p></div>
                  <div><span className="text-slate-400">Net Payout</span><p className="text-emerald-700 font-semibold">{peso(r.totalAmount)}</p></div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Processed</span>
                    <p className="text-slate-700">
                      {r.processedAt ? `${formatDate(r.processedAt)} · ${formatTime(r.processedAt)}` : '—'}
                      {processedLabel(r) && <span className="text-slate-400"> — {processedLabel(r)}</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Requested</th>
                  <th className="text-left px-4 py-3">Requester</th>
                  <th className="text-left px-4 py-3">Method / Account</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-right px-4 py-3">Fees</th>
                  <th className="text-right px-4 py-3">Net Payout</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Processed</th>
                  <th className="text-left px-4 py-3">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400">No payout transactions found</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-slate-900">{formatDate(r.createdAt)}</p>
                      <p className="text-xs text-slate-400">{formatTime(r.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 font-medium">{r.user?.name || '—'}</p>
                      {r.user?.username && <p className="text-xs text-slate-400">@{r.user.username}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}</p>
                      <p className="text-xs text-slate-400">
                        {[r.accountName, r.paymentMethod !== 'cash' ? r.contactNumber : ''].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 whitespace-nowrap">{peso(r.amount)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{peso((r.vat ?? 0) + ADMIN_FEE)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">{peso(r.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[r.status] ?? STATUS_BADGE.cancelled}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.processedAt ? (
                        <>
                          <p className="text-slate-900">{formatDate(r.processedAt)}</p>
                          <p className="text-xs text-slate-400">{formatTime(r.processedAt)}</p>
                        </>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{processedLabel(r) || <span className="text-slate-300">—</span>}</p>
                      {r.processedBy?.username && r.processedBy.name && (
                        <p className="text-xs text-slate-400">@{r.processedBy.username}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          "Processed By" is recorded for payouts approved or rejected after this report was introduced; older records show "—".
        </p>
      </div>
    </div>
  );
}
