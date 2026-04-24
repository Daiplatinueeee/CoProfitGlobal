import { useState, useEffect } from 'react';
import { Tag, RefreshCw } from 'lucide-react';
import ProductPinTab from '../modals/ProductPinsTab';
import { API_BASE } from './GeneratePin';

interface Product {
  _id: string;
  name: string;
  price: number;
  pv: number;
  status: string;
}

export default function GenerateProductPin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [pendingProductName, setPendingProductName] = useState<string>('');
  const [pendingQty, setPendingQty] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE}/unilevel-products/admin/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data.filter((p) => p.status === 'active')))
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleGenerate = () => {
    if (!selectedProduct) return;
    setLoading(true);
    setError(null);
    setPendingProductId(selectedProduct._id);
    setPendingProductName(selectedProduct.name);
    setPendingQty(quantity);
    setSelectedProduct(null);
    setQuantity(1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Generate Product PIN</h1>
          <p className="text-sm text-slate-400 mt-1">Select a product and generate PINs for user redemption</p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button className="text-xs underline ml-4 shrink-0" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Product Selection */}
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Select Product</p>

          {loadingProducts ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading products…
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No active products found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => {
                const isSelected = selectedProduct?._id === product._id;
                return (
                  <button
                    key={product._id}
                    onClick={() => setSelectedProduct(isSelected ? null : product)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                      isSelected
                        ? 'bg-slate-900 border-transparent ring-1 ring-slate-700'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {product.name}
                    </p>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      ₱{product.price.toLocaleString()}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      {product.pv} PV
                    </p>
                    {isSelected && (
                      <span className="mt-2 inline-flex text-xs font-medium text-slate-300">✓ Selected</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quantity + Generate */}
        {selectedProduct && (
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
              {loading ? 'Generating…' : `Generate ${quantity} PIN${quantity > 1 ? 's' : ''} for ${selectedProduct.name}`}
            </button>
          </div>
        )}

        {!selectedProduct && !loadingProducts && (
          <div className="mb-8 flex items-center gap-2">
            <button
              disabled
              className="flex items-center gap-2 text-sm font-medium py-2.5 px-5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
            >
              <Tag className="w-4 h-4" />
              Generate Product PIN
            </button>
            <p className="text-xs text-red-500">Please select a product to generate PINs</p>
          </div>
        )}

        <ProductPinTab
          API_BASE={API_BASE}
          pendingProductId={pendingProductId}
          pendingProductName={pendingProductName}
          pendingQuantity={pendingQty}
          onPendingConsumed={() => {
            setPendingProductId(null);
            setPendingProductName('');
            setPendingQty(1);
            setLoading(false);
          }}
        />

      </div>
    </div>
  );
}
