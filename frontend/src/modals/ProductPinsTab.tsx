import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { ExportModal } from './ExportModal';
import {
  type PIN,
  type Tier,
  mapApiPin,
  PinCard,
  PinDetailModal,
} from '../sections/tabs/GeneratePin';

interface ProductPinTabProps {
  API_BASE: string;
  pendingTier?: Tier | null;
  pendingQuantity?: number;
  onPendingConsumed: () => void;
}

export default function ProductPinTab({
  API_BASE,
  pendingTier,
  pendingQuantity,
  onPendingConsumed,
}: ProductPinTabProps) {
  const [pins, setPins] = useState<PIN[]>([]);
  const [selectedPin, setSelectedPin] = useState<PIN | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const [filterStatus, setFilterStatus] = useState<'all' | 'USED' | 'UNUSED' | 'VOID'>('all');
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPins = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/product-pins?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load product pins (${res.status})`);
      const data: any[] = await res.json();
      setPins(data.map(mapApiPin));
    } catch (err: any) {
      setError(err.message ?? 'Could not load product pins');
    }
  }, [API_BASE]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  // ── Consume pending tier/quantity passed from the parent modal ─────────────

  useEffect(() => {
    if (!pendingTier || pendingTier === 'free') return;
    const qty = pendingQuantity ?? 1;
    onPendingConsumed();
    generatePins(pendingTier, qty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTier]);

  // ── Generate ───────────────────────────────────────────────────────────────

  const generatePins = async (tier: Tier, qty: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/product-pins/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier, quantity: qty }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Server error (${res.status})`);
      }

      const data = await res.json();
      const rawPins: string[] = data.pins ?? [];
      const now = new Date();

      const newPins: PIN[] = rawPins.map((rawPin, i) => ({
        id: `temp-${Date.now()}-${i}`,
        pin: rawPin ?? 'N/A',
        tier,
        createdAt: now.toISOString().split('T')[0],
        createdTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: 'UNUSED',
      }));

      setPins((prev) => [...newPins, ...prev]);

      setTimeout(async () => {
        const token2 = localStorage.getItem('accessToken');
        const res2 = await fetch(`${API_BASE}/admin/product-pins?limit=200`, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        if (!res2.ok) return;
        const list: any[] = await res2.json();
        setPins(list.map(mapApiPin));
      }, 600);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate product PIN');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredPins = pins.filter((pin) => {
    if (filterTier !== 'all' && pin.tier !== filterTier) return false;
    if (filterStatus === 'all') return true;
    return pin.status === filterStatus;
  });

  const displayedPins = filteredPins.slice(0, displayCount);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Sub-header */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {pins.length} total product PIN{pins.length !== 1 ? 's' : ''}
          {loading && <span className="ml-2 text-slate-300">· generating…</span>}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPins}
            className="text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Refresh
          </button>
          {pins.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Bulk Export
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button className="text-xs underline ml-4 shrink-0" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Loading spinner while generating */}
      {loading && pins.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Generating product PINs…</p>
        </div>
      )}

      {/* Filters + grid */}
      {!loading || pins.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Generated Product PINs</p>

          {pins.length > 0 && (
            <div className="mb-6 space-y-3">
              {/* Tier filters — horizontal scroll on mobile */}
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {(['all', 'free', 'bronze', 'silver', 'gold', 'platinum'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setFilterTier(t); setDisplayCount(12); }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      filterTier === t
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t === 'all' ? 'All Tiers' : t}
                  </button>
                ))}
              </div>

              {/* Status filters — horizontal scroll on mobile */}
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {(['all', 'UNUSED', 'USED', 'VOID'] as const).map((s) => {
                  const count = s === 'all' ? pins.length : pins.filter((p) => p.status === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => { setFilterStatus(s); setDisplayCount(12); }}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterStatus === s
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s === 'all' ? `All (${count})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${count})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {pins.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <p className="text-slate-400 text-sm">
                No product PINs yet. Select a tier above, click Generate PIN, then choose <strong>Product PIN</strong>.
              </p>
            </div>
          ) : filteredPins.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <p className="text-slate-400 text-sm">No PINs match the selected filter.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayedPins.map((pin) => (
                  <PinCard key={pin.id} pin={pin} onClick={() => setSelectedPin(pin)} />
                ))}
              </div>
              {displayCount < filteredPins.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setDisplayCount(displayCount + 12)}
                    className="text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-6 py-2.5 rounded-xl transition-colors"
                  >
                    Show More ({filteredPins.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* PIN detail modal */}
      {selectedPin && (
        <PinDetailModal pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}

      {/* Bulk export modal */}
      {showExportModal && (
        <ExportModal pins={filteredPins} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}