import { useEffect, useState } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

interface PurchaseRecord {
  _id: string;
  userId: string;
  user?: { name: string; username: string; email: string };
  productName: string;
  price: number;
  pv: number;
  quantity: number;
  totalPrice: number;
  totalPv: number;
  monthKey: string;
  paymentMethod: string;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  createdAt: string;
}

export default function PendingUnilevelPurchases() {
  const [records, setRecords]         = useState<PurchaseRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionError, setActionError] = useState('');
  const [noteMap, setNoteMap]         = useState<Record<string, string>>({});

  const token = localStorage.getItem('accessToken');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/unilevel-products/admin/purchases/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const res = await fetch(`${API_BASE_URL}/unilevel-products/admin/purchases/${id}/approve`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNote: noteMap[id] ?? '' }),
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json?.message ?? 'Failed to approve purchase.');
      } else {
        await fetchData();
      }
    } catch {
      setActionError('Network error. Please try again.');
    }
  };

  const handleReject = async (id: string) => {
    setActionError('');
    try {
      const res = await fetch(`${API_BASE_URL}/unilevel-products/admin/purchases/${id}/reject`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNote: noteMap[id] ?? '' }),
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json?.message ?? 'Failed to reject purchase.');
      } else {
        await fetchData();
      }
    } catch {
      setActionError('Network error. Please try again.');
    }
  };

  const setNote = (id: string, val: string) =>
    setNoteMap(prev => ({ ...prev, [id]: val }));

  const methodLabel: Record<string, string> = {
    gcash:   'GCash',
    bank:    'Bank Transfer',
    paymaya: 'PayMaya',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Pending Unilevel Purchases</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Approve to credit PV · Reject to decline
          </p>
        </div>
        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
          {records.length} pending
        </span>
      </div>

      {actionError && (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium text-red-700">{actionError}</p>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No pending purchases.
          </div>
        ) : (
          records.map(record => (
            <div key={record._id} className="px-5 py-5 space-y-3">

              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {record.productName}
                  </p>
                  {record.user ? (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {record.user.name} · @{record.user.username} · {record.user.email}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">{record.userId}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Pending
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Paid',     value: `₱${record.totalPrice.toLocaleString()}` },
                  { label: 'PV to Credit',   value: `+${record.totalPv} PV` },
                  { label: 'Qty',            value: String(record.quantity) },
                  { label: 'Payment Method', value: methodLabel[record.paymentMethod] ?? record.paymentMethod },
                  { label: 'Period',         value: record.monthKey },
                  { label: 'Submitted',      value: new Date(record.createdAt).toLocaleDateString() },
                ].map(row => (
                  <div key={row.label} className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-400">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>

              {/* Proof link */}
              {record.proofImageUrl && (
                <a
                  href={`${API_BASE_URL}${record.proofImageUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink size={12} />
                  View payment proof
                </a>
              )}

              {/* Admin note input */}
              <input
                type="text"
                placeholder="Admin note (optional)"
                value={noteMap[record._id] ?? ''}
                onChange={e => setNote(record._id, e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 placeholder-slate-300"
              />

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(record._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <Check size={13} />
                  Approve (+{record.totalPv} PV)
                </button>
                <button
                  onClick={() => handleReject(record._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <X size={13} />
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
