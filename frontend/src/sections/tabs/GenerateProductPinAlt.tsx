import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Clock, Hash, Plus, X, RefreshCw, AlertTriangle, KeyRound } from 'lucide-react';

const API_BASE = 'https://coprofitglobal-production.up.railway.app';

interface ProductPin {
  _id: string;
  pin: string;
  pv: number;
  status: 'used' | 'unused';
  createdAt: string;
  expiresAt: string | null;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
/** Returns expiresAt: use backend value if present, otherwise createdAt + 7 days */
function resolveExpiry(pin: ProductPin): Date {
  if (pin.expiresAt) return new Date(pin.expiresAt);
  const d = new Date(pin.createdAt);
  d.setDate(d.getDate() + 7);
  return d;
}

/* ═══════════════════════════════════════════════════════════════ */
export default function GenerateProductPin() {
  const [error, setError] = useState<string | null>(null);

  const [pins, setPins] = useState<ProductPin[]>([]);
  const [loadingPins, setLoadingPins] = useState(true);

  /* modal state */
  const [showModal, setShowModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pv, setPv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('accessToken');

  /* ── data fetchers ── */
  const fetchPins = async () => {
    setLoadingPins(true);
    try {
      const res = await fetch(`${API_BASE}/admin/unilevel-pins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPins(Array.isArray(data) ? data : []);
    } catch {
      // keep defaults
    } finally {
      setLoadingPins(false);
    }
  };

  useEffect(() => {
    fetchPins();
  }, []);

  /* close modal on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeModal();
      }
    };
    if (showModal) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModal]);

  /* ── modal helpers ── */
  const openModal = () => {
    setQuantity(1);
    setPv('');
    setModalError(null);
    setSuccessCount(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setModalError(null);
    setSuccessCount(null);
  };

  /* ── create PIN ── */
  const handleCreate = async () => {
    if (!pv || isNaN(Number(pv)) || Number(pv) <= 0) {
      setModalError('Please enter a valid PV value.');
      return;
    }
    if (quantity < 1) {
      setModalError('Quantity must be at least 1.');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/unilevel-pins/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pv: Number(pv), quantity }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message ?? 'Failed to create PIN');
      }

      setSuccessCount(quantity);
      await fetchPins();

      /* auto-close after 1.8 s */
      setTimeout(() => closeModal(), 1800);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── derived stats (dynamic from fetched pins) ── */
  const totalPins = pins.length;
  const usedPins = pins.filter((p) => p.status === 'used').length;
  const unusedPins = pins.filter((p) => p.status === 'unused').length;

  /* ════════════════════════ RENDER ════════════════════════ */
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Generate Product PIN
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Generate unilevel PINs for product redemption
            </p>
          </div>

          {/* ── Generate button ── */}
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 active:scale-95 transition-all duration-150 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Generate PIN
          </button>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button className="text-xs underline ml-4 shrink-0" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* ── Dynamic Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 mt-4">
          {[
            {
              label: 'Total PINs',
              value: loadingPins ? '—' : totalPins,
              sub: 'All generated product PINs',
            },
            {
              label: 'Used PINs',
              value: loadingPins ? '—' : usedPins,
              sub: 'Already redeemed by users',
            },
            {
              label: 'Unused PINs',
              value: loadingPins ? '—' : unusedPins,
              sub: 'Available for redemption',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">
                {loadingPins ? (
                  <span className="inline-block w-8 h-6 bg-slate-100 rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* PIN Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">All Product PINs</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {loadingPins ? 'Loading…' : `${totalPins} PIN${totalPins !== 1 ? 's' : ''} generated`}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200 px-3 py-1 rounded-full">
              <Hash className="w-3 h-3" />
              PIN Registry
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Date Created
                  </th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">
                    Unilevel PV
                  </th>
                  {/* NEW: Product PIN column */}
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Product PIN
                  </th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                    Expires
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingPins ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : pins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">
                          ✦
                        </div>
                        <p className="text-slate-400 text-sm">No product PINs yet</p>
                        <p className="text-slate-300 text-xs">Generated PINs will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pins.map((pin) => {
                    const expiry = resolveExpiry(pin);
                    const isExpired = expiry < new Date();

                    return (
                      <tr key={pin._id} className="hover:bg-slate-50 transition-colors duration-150">

                        {/* Date Created */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <p className="font-medium text-slate-900 text-xs sm:text-sm">
                            {new Date(pin.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(pin.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </td>

                        {/* Unilevel PV */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                            {pin.pv ?? '—'} PV
                          </span>
                        </td>

                        {/* Product PIN (randomized code) */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 ring-1 ring-slate-200 px-2.5 py-1 rounded-lg tracking-widest select-all">
                            <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                            {pin.pin}
                          </span>
                        </td>

                        {/* Expires — always shows 7-day date */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                          <span className={`text-xs font-medium ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                            {expiry.toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                            {isExpired && (
                              <span className="ml-1 text-xs text-red-400">(Expired)</span>
                            )}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                          {pin.status === 'used' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Used
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                              <Clock className="w-3 h-3" />
                              Unused
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════ CREATE PIN MODAL ══════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Generate Product PIN</h2>
                <p className="text-xs text-slate-400 mt-0.5">PINs expire 7 days after creation</p>
              </div>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">

              {/* Success banner */}
              {successCount !== null && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successCount} PIN{successCount !== 1 ? 's' : ''} created successfully!</span>
                </div>
              )}

              {/* Error banner */}
              {modalError && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Quantity + PV row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Quantity <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={submitting}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all duration-150 disabled:opacity-50"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Product PV <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={pv}
                    onChange={(e) => setPv(e.target.value)}
                    disabled={submitting}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all duration-150 disabled:opacity-50"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* 7-day expiry note */}
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Each PIN will automatically expire 7 days from the time of creation.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-100 transition-all duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || successCount !== null}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Create PIN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}