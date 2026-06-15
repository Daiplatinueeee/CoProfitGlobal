import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import {
  CheckCircle, XCircle, AlertCircle, Clock, Eye, X,
  RefreshCw, Package,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseRequest {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  paymentMethod: 'gcash' | 'paymaya' | 'cash';
  amount: number;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  gcash: 'GCash',
  paymaya: 'PayMaya',
  cash: 'Cash on Hand',
};

const METHOD_STYLE: Record<string, string> = {
  gcash: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  paymaya: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  cash: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending:  { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   label: 'Pending'  },
    approved: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'Approved' },
    rejected: { cls: 'bg-red-50 text-red-600 ring-1 ring-red-200',         label: 'Rejected' },
  };
  const { cls, label } = map[status] ?? { cls: 'bg-slate-100 text-slate-600', label: status };
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ─── Proof viewer modal ───────────────────────────────────────────────────────

function ProofModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-xl w-full" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors"
        >
          <X size={16} /> Close
        </button>
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Eye size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Proof of Payment</span>
          </div>
          <div className="p-2 bg-slate-50">
            <img
              src={url}
              alt="Proof of Payment"
              className="w-full rounded-xl object-contain max-h-[70vh]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PendingUnilevelPackages() {
  const [requests, setRequests]     = useState<PurchaseRequest[]>([]);
  const [loading, setLoading]       = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter]         = useState<FilterStatus>('pending');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState<Record<string, string>>({});

  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [rejectNote, setRejectNote]     = useState('');

  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchRequests = useCallback(() => {
    setLoading(true);
    setFetchError('');
    const qs = filter !== 'all' ? `?status=${filter}` : '';
    apiFetch(`${API_BASE_URL}/unilevel-products/purchase-requests${qs}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setFetchError('Failed to load requests. Check your connection.'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setActionError(prev => ({ ...prev, [id]: '' }));
    try {
      const res = await apiFetch(`${API_BASE_URL}/unilevel-products/purchase-requests/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message ?? 'Approval failed');
      }
      fetchRequests();
    } catch (err: any) {
      setActionError(prev => ({ ...prev, [id]: err.message ?? 'Something went wrong' }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    setActionError(prev => ({ ...prev, [id]: '' }));
    try {
      const res = await apiFetch(`${API_BASE_URL}/unilevel-products/purchase-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message ?? 'Rejection failed');
      }
      setRejectingId(null);
      setRejectNote('');
      fetchRequests();
    } catch (err: any) {
      setActionError(prev => ({ ...prev, [id]: err.message ?? 'Something went wrong' }));
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Counts ─────────────────────────────────────────────────────────────────

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-semibold text-slate-900">Unilevel Package Purchases</h1>
            {pendingCount > 0 && filter !== 'pending' && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 ring-1 ring-amber-200 px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Review payment proofs and approve or reject unilevel package purchases
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
              filter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && pendingCount > 0 && (
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-16 border border-slate-100 rounded-2xl">
          <AlertCircle size={28} className="mx-auto mb-3 text-red-300" />
          <p className="text-sm font-medium text-red-500">{fetchError}</p>
          <button onClick={fetchRequests} className="mt-3 text-xs text-slate-500 underline">
            Try again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 border border-slate-100 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <Package size={24} className="text-slate-200" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            No {filter !== 'all' ? filter : ''} purchase requests
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Requests submitted by users will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req._id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 flex flex-col sm:flex-row gap-4">

                {/* User + meta */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Avatar + name row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0">
                      {req.userName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{req.userName}</p>
                      <p className="text-xs text-slate-400 truncate">{req.userEmail}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  {/* Detail chips */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${METHOD_STYLE[req.paymentMethod] ?? 'bg-slate-100 text-slate-600'}`}>
                      {METHOD_LABEL[req.paymentMethod] ?? req.paymentMethod}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                      ₱{req.amount.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock size={11} />
                      {new Date(req.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {req.reviewedAt && (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        Reviewed: {new Date(req.reviewedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {req.reviewNote && (
                    <p className="text-xs text-slate-500 italic">Note: {req.reviewNote}</p>
                  )}

                  {actionError[req._id] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={11} />
                      {actionError[req._id]}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:justify-center shrink-0">
                  {req.proofUrl && (
                    <button
                      onClick={() => setViewProofUrl(req.proofUrl!.startsWith('http') ? req.proofUrl! : `${API_BASE_URL}${req.proofUrl!}`)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <Eye size={13} />
                      View Proof
                    </button>
                  )}
                  {!req.proofUrl && req.paymentMethod !== 'cash' && (
                    <span className="text-xs text-slate-400 italic px-1">No proof attached</span>
                  )}
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req._id)}
                        disabled={actionLoading === req._id}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={13} />
                        {actionLoading === req._id ? 'Processing…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => { setRejectingId(req._id); setRejectNote(''); }}
                        disabled={actionLoading === req._id}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Reject note input (inline expansion) */}
              {rejectingId === req._id && (
                <div className="px-5 pb-5 pt-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Rejection reason <span className="font-normal text-slate-400">(optional)</span></p>
                  <textarea
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="e.g. Screenshot unclear, wrong amount sent…"
                    rows={2}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none bg-white"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setRejectingId(null); setRejectNote(''); }}
                      className="flex-1 text-xs font-medium text-slate-600 border border-slate-200 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(req._id)}
                      disabled={actionLoading === req._id}
                      className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {actionLoading === req._id ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Proof viewer */}
      {viewProofUrl && <ProofModal url={viewProofUrl} onClose={() => setViewProofUrl(null)} />}
    </div>
  );
}
