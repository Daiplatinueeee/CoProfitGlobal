import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { ExportModal } from './ExportModal';

interface ProductPIN {
  id: string;
  pin: string;
  productId: string | null;
  productName: string;
  pv: number;
  status: 'UNUSED' | 'USED' | 'VOID';
  createdAt: string;
  createdTime: string;
  usedAt?: string;
  usedBy?: string;
}

function mapApiProductPin(r: any): ProductPIN {
  const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
  return {
    id: r.id,
    pin: r.pin && !r.pin.startsWith('$2') ? r.pin : '[hashed — void & regenerate]',
    productId: r.productId ?? null,
    productName: r.productName ?? 'Unknown Product',
    pv: r.pv ?? 0,
    status: r.status ?? 'UNUSED',
    createdAt: createdDate.toISOString().split('T')[0],
    createdTime: createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    usedAt: r.usedAt ?? undefined,
    usedBy: r.usedByUserId ?? undefined,
  };
}

const statusColors = {
  UNUSED: { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  USED:   { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100'  },
  VOID:   { dot: 'bg-red-400',     text: 'text-red-600',     bg: 'bg-red-50'     },
};

function ProductPinCard({ pin, onClick }: { pin: ProductPIN; onClick: () => void }) {
  const s = statusColors[pin.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {pin.status.charAt(0) + pin.status.slice(1).toLowerCase()}
        </span>
        <span className="text-xs text-emerald-600 font-semibold">{pin.pv} PV</span>
      </div>

      <p className="font-mono text-base font-bold text-slate-900 tracking-widest mb-1">{pin.pin}</p>
      <p className="text-xs font-medium text-slate-600 truncate">{pin.productName}</p>
      <p className="text-xs text-slate-300 mt-1">{pin.createdAt}</p>
    </button>
  );
}

function ProductPinDetailModal({ pin, onClose }: { pin: ProductPIN; onClose: () => void }) {
  const s = statusColors[pin.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">PIN Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="font-mono text-2xl font-bold text-slate-900 tracking-widest">{pin.pin}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-400">Product</p>
              <p className="font-medium text-slate-800">{pin.productName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">PV Value</p>
              <p className="font-semibold text-emerald-600">{pin.pv} PV</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Status</p>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {pin.status.charAt(0) + pin.status.slice(1).toLowerCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Created</p>
              <p className="text-slate-600">{pin.createdAt} · {pin.createdTime}</p>
            </div>
            {pin.usedAt && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Used At</p>
                <p className="text-slate-600">{new Date(pin.usedAt).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProductPinTabProps {
  API_BASE: string;
  pendingProductId?: string | null;
  pendingProductName?: string;
  pendingQuantity?: number;
  onPendingConsumed: () => void;
}

export default function ProductPinTab({
  API_BASE,
  pendingProductId,
  pendingProductName,
  pendingQuantity,
  onPendingConsumed,
}: ProductPinTabProps) {
  const [pins, setPins] = useState<ProductPIN[]>([]);
  const [selectedPin, setSelectedPin] = useState<ProductPIN | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const [filterStatus, setFilterStatus] = useState<'all' | 'USED' | 'UNUSED' | 'VOID'>('all');
  const [filterProductId, setFilterProductId] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/product-pins?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load product pins (${res.status})`);
      const data: any[] = await res.json();
      setPins(data.map(mapApiProductPin));
    } catch (err: any) {
      setError(err.message ?? 'Could not load product pins');
    }
  }, [API_BASE]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  useEffect(() => {
    if (!pendingProductId) return;
    const qty = pendingQuantity ?? 1;
    onPendingConsumed();
    generatePins(pendingProductId, qty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingProductId]);

  const generatePins = async (productId: string, qty: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/product-pins/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity: qty }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Server error (${res.status})`);
      }

      const data = await res.json();
      const rawPins: string[] = data.pins ?? [];
      const now = new Date();

      const newPins: ProductPIN[] = rawPins.map((rawPin, i) => ({
        id: `temp-${Date.now()}-${i}`,
        pin: rawPin,
        productId,
        productName: pendingProductName ?? data.productName ?? 'Unknown',
        pv: data.pv ?? 0,
        status: 'UNUSED',
        createdAt: now.toISOString().split('T')[0],
        createdTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      }));

      setPins((prev) => [...newPins, ...prev]);

      setTimeout(async () => {
        const token2 = localStorage.getItem('accessToken');
        const res2 = await fetch(`${API_BASE}/admin/product-pins?limit=200`, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        if (!res2.ok) return;
        const list: any[] = await res2.json();
        setPins(list.map(mapApiProductPin));
      }, 600);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate product PINs');
    } finally {
      setLoading(false);
    }
  };

  // Unique products in current pin list for the filter bar
  const uniqueProducts = Array.from(
    new Map(
      pins
        .filter((p) => p.productId)
        .map((p) => [p.productId, { id: p.productId!, name: p.productName }])
    ).values()
  );

  const filteredPins = pins.filter((pin) => {
    if (filterProductId !== 'all' && pin.productId !== filterProductId) return false;
    if (filterStatus !== 'all' && pin.status !== filterStatus) return false;
    return true;
  });

  const displayedPins = filteredPins.slice(0, displayCount);

  // Map ProductPIN → shape ExportModal expects (it uses PIN type internally)
  const exportPins = filteredPins.map((p) => ({
    ...p,
    tier: p.productName as any,
  }));

  return (
    <div>
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

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button className="text-xs underline ml-4 shrink-0" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {loading && pins.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Generating product PINs…</p>
        </div>
      )}

      {(!loading || pins.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Generated Product PINs</p>

          {pins.length > 0 && (
            <div className="mb-6 space-y-3">
              {/* Product filters */}
              {uniqueProducts.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                  <button
                    onClick={() => { setFilterProductId('all'); setDisplayCount(12); }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterProductId === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Products
                  </button>
                  {uniqueProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setFilterProductId(p.id); setDisplayCount(12); }}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterProductId === p.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Status filters */}
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {(['all', 'UNUSED', 'USED', 'VOID'] as const).map((s) => {
                  const count = s === 'all' ? pins.length : pins.filter((p) => p.status === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => { setFilterStatus(s); setDisplayCount(12); }}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterStatus === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                No product PINs yet. Select a product above and click <strong>Generate</strong>.
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
                  <ProductPinCard key={pin.id} pin={pin} onClick={() => setSelectedPin(pin)} />
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
      )}

      {selectedPin && (
        <ProductPinDetailModal pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}

      {showExportModal && (
        <ExportModal pins={exportPins as any} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
