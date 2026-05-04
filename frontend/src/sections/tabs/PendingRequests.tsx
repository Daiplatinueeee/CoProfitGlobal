import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle, Clock, X, RefreshCw, Inbox, Lock, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:3000';

interface ForgotPasswordRequest {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  username?: string;
  status: 'pending' | 'resolved';
  note?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedNote?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') ?? localStorage.getItem('accessToken');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

/* ── Request Card ─────────────────────────────────────────────── */
function RequestCard({
  req,
  onChangePassword,
  onResolve,
}: {
  req: ForgotPasswordRequest;
  onChangePassword: (req: ForgotPasswordRequest) => void;
  onResolve: (req: ForgotPasswordRequest) => void;
}) {
  const { date, time } = formatDate(req.createdAt);
  const isPending = req.status === 'pending';

  const initials = (req.userName ?? req.userEmail ?? '?')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`bg-white rounded-xl border transition-all ${isPending ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-75'}`}>
      <div className="px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${isPending ? 'bg-slate-800' : 'bg-slate-300'}`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {req.userName ?? req.username ?? 'Unknown User'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{req.userEmail ?? '—'}</p>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 shrink-0 ${isPending
              ? 'bg-amber-50 text-amber-700 ring-amber-200'
              : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              }`}>
              {isPending
                ? <><Clock className="w-3 h-3" /> Pending</>
                : <><CheckCircle className="w-3 h-3" /> Resolved</>
              }
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-2">
            Requested on <span className="font-medium text-slate-600">{date}</span> at {time}
          </p>

          {req.status === 'resolved' && req.resolvedNote && (
            <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <span className="font-medium text-slate-600">Note:</span> {req.resolvedNote}
            </p>
          )}
        </div>
      </div>

      {/* Actions (only for pending) */}
      {isPending && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={() => onChangePassword(req)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Set New Password
          </button>
          <button
            onClick={() => onResolve(req)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark Resolved
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Change Password Modal ────────────────────────────────────── */
function ChangePasswordModal({
  req,
  onClose,
  onSuccess,
}: {
  req: ForgotPasswordRequest;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveAfter, setResolveAfter] = useState(true);

  const handleSave = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!req.userId) {
      setError('No userId associated with this request.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Change the password
      const pwRes = await fetch(`${API_BASE}/admin/users/${req.userId}/password`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword }),
      });
      const pwData = await pwRes.json();
      if (!pwRes.ok) {
        setError(Array.isArray(pwData.message) ? pwData.message.join(', ') : pwData.message || 'Failed to change password.');
        return;
      }

      // 2. Optionally mark as resolved
      if (resolveAfter) {
        await fetch(`${API_BASE}/admin/forgot-password-requests/${req.id}/resolve`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ note: note.trim() || 'Password changed by admin.' }),
        });
      }

      onSuccess(`Password updated for ${req.userName ?? req.userEmail ?? 'user'}${resolveAfter ? ' and request marked as resolved.' : '.'}`);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Lock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Set New Password</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-48">
                {req.userName ?? req.userEmail ?? 'Unknown User'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
              New Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                autoFocus
                className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 transition-colors ${error
                  ? 'border-red-300 focus:ring-red-100'
                  : newPassword.length >= 6
                    ? 'border-emerald-300 focus:ring-emerald-100'
                    : 'border-slate-200 focus:ring-slate-200'
                  }`}
              />
            </div>
            {newPassword.length >= 6 && !error && (
              <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                <span>✓</span> Password looks good.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
              Resolution Note <span className="normal-case text-slate-300">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Password reset as per user request via phone call."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={resolveAfter}
              onChange={() => setResolveAfter((v) => !v)}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
            <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
              Automatically mark this request as resolved after saving
            </span>
          </label>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || newPassword.length < 6}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                Save Password
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Resolve Note Modal ───────────────────────────────────────── */
function ResolveModal({
  req,
  onClose,
  onSuccess,
}: {
  req: ForgotPasswordRequest;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/forgot-password-requests/${req.id}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to resolve request.');
        return;
      }
      onSuccess('Request marked as resolved.');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">

        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Mark as Resolved</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-48">
                {req.userName ?? req.userEmail ?? 'Unknown User'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to mark this request as resolved without changing the password?
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
              Note <span className="normal-case text-slate-300">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. User confirmed they remembered their password."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resolving…
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Confirm Resolve
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function PendingRequests() {
  const [requests, setRequests] = useState<ForgotPasswordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending');

  const [changePasswordReq, setChangePasswordReq] = useState<ForgotPasswordRequest | null>(null);
  const [resolveReq, setResolveReq] = useState<ForgotPasswordRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const res = await fetch(`${API_BASE}/admin/forgot-password-requests${query}`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) { setError('Session expired. Please log in again.'); return; }
      if (!res.ok) throw new Error(`Failed to fetch requests: ${res.status}`);
      const data = await res.json();
      const mapped: ForgotPasswordRequest[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: r._id ?? r.id,
        userId: r.userId ?? r.user?._id ?? r.user?.id,
        userEmail: r.userEmail ?? r.user?.email ?? r.email,
        userName: r.userName ?? r.user?.name ?? r.name,
        username: r.username ?? r.user?.username,
        status: r.status ?? 'pending',
        note: r.note,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        resolvedNote: r.resolvedNote ?? r.note,
      }));
      setRequests(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const showSuccess = (msg: string) => {
    setChangePasswordReq(null);
    setResolveReq(null);
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
    fetchRequests();
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const resolvedCount = requests.filter((r) => r.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Pending Requests
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Forgot-password requests submitted by users
            </p>
          </div>
          <button
            onClick={fetchRequests}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-5 flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {successMessage}
          </div>
        )}

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Pending', count: pendingCount, cls: 'text-amber-700 bg-amber-50 ring-amber-200' },
              { label: 'Resolved', count: resolvedCount, cls: 'text-emerald-700 bg-emerald-50 ring-emerald-200' },
              { label: 'Total', count: requests.length, cls: 'text-slate-700 bg-slate-50 ring-slate-200' },
            ].map(({ label, count, cls }) => (
              <div key={label} className={`rounded-xl ring-1 px-4 py-3 ${cls}`}>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
                <p className="text-2xl font-semibold mt-0.5">{count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(['pending', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <p className="text-slate-400 text-sm">Loading requests…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">No requests found</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusFilter === 'pending'
                  ? 'There are no pending password requests at the moment.'
                  : statusFilter === 'resolved'
                    ? 'No resolved requests yet.'
                    : 'No forgot-password requests have been submitted yet.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                onChangePassword={setChangePasswordReq}
                onResolve={setResolveReq}
              />
            ))}
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {changePasswordReq && (
        <ChangePasswordModal
          req={changePasswordReq}
          onClose={() => setChangePasswordReq(null)}
          onSuccess={showSuccess}
        />
      )}

      {/* Resolve Modal */}
      {resolveReq && (
        <ResolveModal
          req={resolveReq}
          onClose={() => setResolveReq(null)}
          onSuccess={showSuccess}
        />
      )}
    </div>
  );
}