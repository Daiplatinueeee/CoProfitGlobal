import { useState } from 'react';
import { RefreshCw, Tag } from 'lucide-react';
import ProductPinTab from '../modals/ProductPinsTab';
import { API_BASE, tierConfig, FREE_STATIC_PIN, type Tier } from './GeneratePin';

export default function GenerateProductPin() {
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passed down to ProductPinsTab to trigger generation
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [pendingQty, setPendingQty] = useState(1);

  const handleGenerate = () => {
    if (!selectedTier || selectedTier === 'free') return;
    setLoading(true);
    setError(null);
    setPendingTier(selectedTier);
    setPendingQty(quantity);
    setSelectedTier(null);
    setQuantity(1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Generate Product PIN</h1>
          <p className="text-sm text-slate-400 mt-1">Create and manage product-specific PINs for individual product redemptions</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button className="text-xs underline ml-4 shrink-0" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Tier Selection */}
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Select Tier</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <button
              onClick={() => setSelectedTier('free')}
              className={`rounded-2xl border p-4 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                selectedTier === 'free'
                  ? `${tierConfig.free.bg} ${tierConfig.free.ring} ring-1 border-transparent`
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className={`text-sm font-semibold ${selectedTier === 'free' ? tierConfig.free.text : 'text-slate-700'}`}>Free</p>
              <p className="text-xs text-slate-400 mt-0.5">Static PIN</p>
              {selectedTier === 'free' && <span className="mt-2 inline-flex text-xs font-medium text-slate-500">✓ Selected</span>}
            </button>
            {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`rounded-2xl border p-4 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                  selectedTier === tier
                    ? `${tierConfig[tier].bg} ${tierConfig[tier].ring} ring-1 border-transparent`
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <p className={`text-sm font-semibold capitalize ${selectedTier === tier ? tierConfig[tier].text : 'text-slate-700'}`}>{tier}</p>
                {selectedTier === tier && <span className="mt-2 inline-flex text-xs font-medium text-slate-500">✓ Selected</span>}
              </button>
            ))}
          </div>

          {selectedTier === 'free' && (
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
              <p className="font-semibold text-slate-700 mb-0.5">Free Account — Static PIN</p>
              <p>
                The PIN for free accounts is fixed:{' '}
                <span className="font-mono font-bold tracking-widest text-slate-900">{FREE_STATIC_PIN}</span>
              </p>
              <p className="mt-1 text-slate-400 text-xs">Free accounts do not receive any bonus.</p>
            </div>
          )}
        </div>

        {/* Quantity + Generate */}
        {selectedTier && selectedTier !== 'free' && (
          <div className="mb-8 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                Quantity of PINs
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors"
                >−</button>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-16 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  disabled={quantity >= 50}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors"
                >+</button>
                <span className="text-xs text-slate-400 ml-1">(max 50)</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 text-sm font-medium py-2.5 px-5 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating…' : `Generate Product PIN${quantity > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {!selectedTier && (
          <div className="mb-8 flex items-center gap-2">
            <button
              disabled
              className="flex items-center gap-2 text-sm font-medium py-2.5 px-5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
            >
              <Tag className="w-4 h-4" />
              Generate Product PIN
            </button>
            <p className="text-xs text-red-500">Please select a tier to generate a PIN</p>
          </div>
        )}

        {/* Product PINs list — handles its own fetching and generation trigger */}
        <ProductPinTab
          API_BASE={API_BASE}
          pendingTier={pendingTier}
          pendingQuantity={pendingQty}
          onPendingConsumed={() => {
            setPendingTier(null);
            setPendingQty(1);
            setLoading(false);
          }}
        />

      </div>
    </div>
  );
}
