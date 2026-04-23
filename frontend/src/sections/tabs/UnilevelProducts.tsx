import React, { useCallback, useEffect, useState } from 'react';
import { Upload, CheckCircle, X, AlertCircle, KeyRound, Gift, History, ShoppingBag } from 'lucide-react';

import defaultProductImg from '../../assets/pk1.jpeg';

const API_BASE_URL = 'http://localhost:3000';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiProduct {
  _id: string;
  name: string;
  price: number;
  pv: number;
  description: string;
  imageUrl: string;
  features: string[];
  status: 'active' | 'inactive';
}

interface ApiPurchase {
  _id: string;
  productId: string;
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

interface PvStatus {
  monthKey: string;
  totalPv: number;
  threshold: number;
  qualified: boolean;
}

interface PinRedemption {
  _id: string;
  pin: string;
  productName: string;
  pv: number;
  redeemedAt: string;
  status: 'active' | 'void';
}

interface LifestyleReward {
  _id: string;
  name: string;
  description: string;
  pointsCost: number;
  imageUrl: string;
  category: string;
  stock: number;
}

const paymentMethods = [
  { id: 'gcash',   name: 'GCash',        account: '09XX-XXXX-XXX',       icon: '💳' },
  { id: 'bank',    name: 'Bank Transfer', account: 'XX-XXXXXX-XXXX',      icon: '🏦' },
  { id: 'paymaya', name: 'PayMaya',       account: 'XXXX-XXXX-XXXX-XXXX', icon: '💰' },
];

function resolveImage(imageUrl: string): string {
  return imageUrl && imageUrl.trim() !== '' ? imageUrl : defaultProductImg;
}

type MainTab = 'shop' | 'pin' | 'rewards' | 'history';
type HistorySubTab = 'purchases' | 'pins';

// ─── Component ───────────────────────────────────────────────────────────────

export default function UnilevelProducts() {
  // Core data
  const [products, setProducts]   = useState<ApiProduct[]>([]);
  const [purchases, setPurchases] = useState<ApiPurchase[]>([]);
  const [pvStatus, setPvStatus]   = useState<PvStatus | null>(null);
  const [loading, setLoading]     = useState(true);

  // Navigation
  const [activeTab, setActiveTab]       = useState<MainTab>('shop');
  const [historyTab, setHistoryTab]     = useState<HistorySubTab>('purchases');

  // Purchase modal
  const [selectedProduct, setSelectedProduct]     = useState<ApiProduct | null>(null);
  const [purchaseQuantity, setPurchaseQuantity]   = useState(1);
  const [selectedPayMethod, setSelectedPayMethod] = useState('gcash');
  const [proofFile, setProofFile]                 = useState<File | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const [submitLoading, setSubmitLoading]         = useState(false);
  const [submitError, setSubmitError]             = useState('');

  // PIN redemption
  const [pinInput, setPinInput]               = useState('');
  const [pinLoading, setPinLoading]           = useState(false);
  const [pinError, setPinError]               = useState('');
  const [pinSuccess, setPinSuccess]           = useState('');
  const [pinHistory, setPinHistory]           = useState<PinRedemption[]>([]);
  const [pinHistoryLoading, setPinHistoryLoading] = useState(false);

  // Lifestyle rewards
  const [rewards, setRewards]               = useState<LifestyleReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardError, setRewardError]       = useState<Record<string, string>>({});
  const [redeemingReward, setRedeemingReward] = useState<string | null>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const token = () => localStorage.getItem('accessToken');
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  const refreshPvAndPurchases = useCallback(() => {
    const h = authHeaders();
    return Promise.all([
      fetch(`${API_BASE_URL}/unilevel-products/my/pv-status`, { headers: h }).then(r => r.json()),
      fetch(`${API_BASE_URL}/unilevel-products/my/purchases`, { headers: h }).then(r => r.json()),
    ]).then(([pvJson, purchasesJson]) => {
      setPvStatus(pvJson?.monthKey ? pvJson : null);
      setPurchases(Array.isArray(purchasesJson) ? purchasesJson : []);
    });
  }, []);

  const refreshData = useCallback(() => {
    const h = authHeaders();
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/unilevel-products`, { headers: h }).then(r => r.json()),
      fetch(`${API_BASE_URL}/unilevel-products/my/pv-status`, { headers: h }).then(r => r.json()),
      fetch(`${API_BASE_URL}/unilevel-products/my/purchases`, { headers: h }).then(r => r.json()),
    ])
      .then(([productsJson, pvJson, purchasesJson]) => {
        setProducts(Array.isArray(productsJson) ? productsJson : []);
        setPvStatus(pvJson?.monthKey ? pvJson : null);
        setPurchases(Array.isArray(purchasesJson) ? purchasesJson : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchPinHistory = useCallback(() => {
    setPinHistoryLoading(true);
    fetch(`${API_BASE_URL}/unilevel-products/my/pin-history`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setPinHistory(Array.isArray(data) ? data : []))
      .catch(() => setPinHistory([]))
      .finally(() => setPinHistoryLoading(false));
  }, []);

  const fetchRewards = useCallback(() => {
    setRewardsLoading(true);
    fetch(`${API_BASE_URL}/unilevel-products/lifestyle-rewards`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRewards(Array.isArray(data) ? data : []))
      .catch(() => setRewards([]))
      .finally(() => setRewardsLoading(false));
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Lazy-load per tab
  useEffect(() => {
    if (activeTab === 'pin') fetchPinHistory();
    if (activeTab === 'rewards') fetchRewards();
  }, [activeTab, fetchPinHistory, fetchRewards]);

  useEffect(() => {
    if (activeTab === 'history' && historyTab === 'pins') fetchPinHistory();
  }, [activeTab, historyTab, fetchPinHistory]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const currentPv   = pvStatus?.totalPv   ?? 0;
  const threshold   = pvStatus?.threshold ?? 1500;
  const qualified   = pvStatus?.qualified ?? false;
  const pctProgress = Math.min(100, Math.round((currentPv / threshold) * 100));

  const totalPurchasePHP = selectedProduct ? selectedProduct.price * purchaseQuantity : 0;
  const totalPurchasePV  = selectedProduct ? selectedProduct.pv    * purchaseQuantity : 0;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openPurchaseModal = (product: ApiProduct) => {
    setSelectedProduct(product);
    setPurchaseQuantity(1);
    setSelectedPayMethod('gcash');
    setProofFile(null);
    setSubmitError('');
    setShowPurchaseModal(true);
    setShowPurchaseSheet(true);
  };

  const closePurchaseModal = () => {
    setShowPurchaseModal(false);
    setShowPurchaseSheet(false);
    setSelectedProduct(null);
    setPurchaseQuantity(1);
    setProofFile(null);
    setSubmitError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setProofFile(e.target.files[0]);
  };

  const handlePurchaseSubmit = async () => {
    if (!selectedProduct || !proofFile) return;
    setSubmitLoading(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      const uploadRes = await fetch(`${API_BASE_URL}/unilevel-products/upload-proof`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson?.message ?? 'File upload failed');

      const purchaseRes = await fetch(`${API_BASE_URL}/unilevel-products/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          productId:     selectedProduct._id,
          quantity:      purchaseQuantity,
          paymentMethod: selectedPayMethod,
          proofImageUrl: uploadJson.url ?? '',
        }),
      });
      const purchaseJson = await purchaseRes.json();
      if (!purchaseRes.ok) throw new Error(purchaseJson?.message ?? 'Purchase submission failed');

      closePurchaseModal();
      refreshData();
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRedeemPin = async () => {
    const pin = pinInput.trim().toUpperCase();
    if (!pin) return;
    setPinLoading(true);
    setPinError('');
    setPinSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/unilevel-products/redeem-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'PIN redemption failed');
      setPinInput('');
      setPinSuccess(json?.message ?? 'PIN redeemed successfully!');
      fetchPinHistory();
      refreshPvAndPurchases();
    } catch (err: any) {
      setPinError(err.message ?? 'Something went wrong');
    } finally {
      setPinLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    setRedeemingReward(rewardId);
    setRewardError(prev => ({ ...prev, [rewardId]: '' }));
    try {
      const res = await fetch(`${API_BASE_URL}/unilevel-products/redeem-lifestyle-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ rewardId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Redemption failed');
      fetchRewards();
      refreshPvAndPurchases();
    } catch (err: any) {
      setRewardError(prev => ({ ...prev, [rewardId]: err.message ?? 'Something went wrong' }));
    } finally {
      setRedeemingReward(null);
    }
  };

  // ─── Tab config ────────────────────────────────────────────────────────────

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'shop',    label: 'Shop',             icon: <ShoppingBag size={14} /> },
    { id: 'pin',     label: 'Redeem PIN',        icon: <KeyRound size={14} /> },
    { id: 'rewards', label: 'Lifestyle Rewards', icon: <Gift size={14} /> },
    { id: 'history', label: 'History',           icon: <History size={14} /> },
  ];

  // ─── Sub-components ────────────────────────────────────────────────────────

  const PurchaseForm = () => (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      {selectedProduct && (
        <div className="flex items-center gap-3 mb-1">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
            <img
              src={resolveImage(selectedProduct.imageUrl)}
              alt={selectedProduct.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{selectedProduct.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.pv} PV earned per unit</p>
            <p className="text-xs font-medium text-slate-600">₱{selectedProduct.price.toLocaleString()} / unit</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPurchaseQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-900 transition-colors text-sm shrink-0"
          >−</button>
          <input
            type="number"
            min="1"
            value={purchaseQuantity}
            onChange={e => setPurchaseQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-center text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            onClick={() => setPurchaseQuantity(q => q + 1)}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-900 transition-colors text-sm shrink-0"
          >+</button>
        </div>
      </div>

      {selectedProduct && (
        <div className="rounded-xl border border-slate-100 px-4 py-3 space-y-2">
          {[
            { label: 'Unit Price', value: `₱${selectedProduct.price.toLocaleString()}` },
            { label: 'Unit PV',    value: `+${selectedProduct.pv} PV` },
            { label: 'Quantity',   value: String(purchaseQuantity) },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{row.label}</span>
              <span className="text-xs font-semibold text-slate-900">{row.value}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Total to Pay</span>
              <span className="text-sm font-semibold text-slate-900">₱{totalPurchasePHP.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-700">PV You'll Earn</span>
              <span className="text-sm font-semibold text-emerald-700">+{totalPurchasePV} PV</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
          Payment Method
        </label>
        <div className="space-y-2">
          {paymentMethods.map(method => (
            <label
              key={method.id}
              htmlFor={`pay-${method.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                selectedPayMethod === method.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                id={`pay-${method.id}`}
                name="purchasePayMethod"
                value={method.id}
                checked={selectedPayMethod === method.id}
                onChange={e => setSelectedPayMethod(e.target.value)}
                className="sr-only"
              />
              <span className="text-base">{method.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{method.name}</p>
                <p className="text-xs text-slate-400">{method.account}</p>
              </div>
              {selectedPayMethod === method.id && (
                <div className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
              )}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
          Payment Proof
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          className="sr-only"
          id="purchaseProofInput"
          accept=".pdf,.jpg,.jpeg,.png"
        />
        <label
          htmlFor="purchaseProofInput"
          className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-5 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
        >
          <Upload size={20} className="text-slate-300 mb-1.5" />
          <p className="text-xs font-medium text-slate-500">Click to upload</p>
          <p className="text-xs text-slate-300 mt-0.5">PNG, JPG, PDF up to 10 MB</p>
        </label>
        {proofFile && (
          <div className="mt-2 flex items-center gap-2 text-emerald-600">
            <CheckCircle size={14} />
            <span className="text-xs font-medium truncate">{proofFile.name}</span>
          </div>
        )}
      </div>

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium text-red-700">{submitError}</p>
        </div>
      )}

      <button
        onClick={handlePurchaseSubmit}
        disabled={!proofFile || submitLoading}
        className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {submitLoading ? 'Submitting…' : 'Submit Purchase'}
      </button>
    </div>
  );

  // ─── Tab panels ────────────────────────────────────────────────────────────

  const ShopPanel = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">Available Products</h2>
        <span className="text-xs text-slate-400">{products.length} products</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border border-slate-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-slate-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No products available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map(product => (
            <div
              key={product._id}
              className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:border-slate-200 hover:shadow-sm transition-all flex flex-col"
            >
              <div className="aspect-square overflow-hidden bg-slate-50">
                <img
                  src={resolveImage(product.imageUrl)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 sm:p-4 flex flex-col flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{product.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">₱{product.price.toLocaleString()}</span>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+{product.pv} PV</span>
                </div>
                {product.features.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {product.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="text-xs text-slate-500 flex items-center gap-1.5">
                        <CheckCircle size={10} className="text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => openPurchaseModal(product)}
                  className="mt-auto pt-3 w-full bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium py-2.5 rounded-lg transition-colors"
                >
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const RedeemPinPanel = () => (
    <div className="max-w-lg mx-auto">
      {/* PIN Input card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-slate-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Redeem a Product PIN</h2>
              <p className="text-xs text-slate-400 mt-0.5">Enter your PIN code to activate and earn PV</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
              PIN Code
            </label>
            <input
              type="text"
              value={pinInput}
              onChange={e => {
                setPinInput(e.target.value.toUpperCase());
                setPinError('');
                setPinSuccess('');
              }}
              onKeyDown={e => e.key === 'Enter' && handleRedeemPin()}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={20}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-300 uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
            />
          </div>

          {pinSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-emerald-700">{pinSuccess}</p>
            </div>
          )}

          {pinError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs font-medium text-red-700">{pinError}</p>
            </div>
          )}

          <button
            onClick={handleRedeemPin}
            disabled={!pinInput.trim() || pinLoading}
            className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium py-3 px-4 rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            {pinLoading ? 'Redeeming…' : 'Redeem PIN'}
          </button>
        </div>
      </div>

      {/* PIN History */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">PIN History</h3>
            <p className="text-xs text-slate-400 mt-0.5">PINs you have redeemed</p>
          </div>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {pinHistory.length} total
          </span>
        </div>
        <div className="px-5 py-4">
          {pinHistoryLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse rounded-xl border border-slate-100 h-16" />
              ))}
            </div>
          ) : pinHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No PINs redeemed yet</p>
          ) : (
            <div className="space-y-3">
              {pinHistory.map(p => (
                <div key={p._id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {p.pin}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {p.status === 'active' ? 'Active' : 'Void'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">{p.productName}</p>
                    <p className="text-xs text-slate-400">{new Date(p.redeemedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-700">+{p.pv} PV</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const LifestyleRewardsPanel = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Lifestyle Rewards</h2>
          <p className="text-xs text-slate-400 mt-0.5">Redeem using your unilevel PV balance</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Your Balance</p>
          <p className="text-sm font-semibold text-slate-900">{currentPv} PV</p>
        </div>
      </div>

      {rewardsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-xl border border-slate-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-slate-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-slate-100 rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div className="text-center py-20">
          <Gift size={36} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">No rewards available yet</p>
          <p className="text-xs text-slate-400 mt-1">Check back soon for exciting lifestyle rewards</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {rewards.map(reward => {
            const canAfford  = currentPv >= reward.pointsCost;
            const inStock    = reward.stock > 0;
            const isRedeeming = redeemingReward === reward._id;
            const err        = rewardError[reward._id];

            return (
              <div
                key={reward._id}
                className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col"
              >
                <div className="aspect-square overflow-hidden bg-slate-50 relative">
                  <img
                    src={resolveImage(reward.imageUrl)}
                    alt={reward.name}
                    className={`w-full h-full object-cover ${!inStock ? 'opacity-40' : ''}`}
                  />
                  {!inStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold bg-white/90 text-slate-600 px-2 py-1 rounded-full">
                        Out of stock
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{reward.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{reward.description}</p>
                  {reward.category && (
                    <span className="mt-1.5 self-start text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {reward.category}
                    </span>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                      {reward.pointsCost.toLocaleString()} PV
                    </span>
                  </div>

                  {err && (
                    <p className="text-xs text-red-600 mt-1.5">{err}</p>
                  )}

                  {!canAfford && inStock && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      Need {(reward.pointsCost - currentPv).toLocaleString()} more PV
                    </p>
                  )}

                  <button
                    onClick={() => handleRedeemReward(reward._id)}
                    disabled={!canAfford || !inStock || isRedeeming}
                    className="mt-auto pt-3 w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-medium py-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {isRedeeming ? 'Redeeming…' : !inStock ? 'Out of Stock' : !canAfford ? 'Not Enough PV' : 'Redeem'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const HistoryPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Sub-tab nav */}
      <div className="flex items-center gap-1 px-4 sm:px-5 py-4 border-b border-slate-100">
        {([
          { id: 'purchases', label: 'Purchases' },
          { id: 'pins',      label: 'PIN History' },
        ] as { id: HistorySubTab; label: string }[]).map(sub => (
          <button
            key={sub.id}
            onClick={() => setHistoryTab(sub.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              historyTab === sub.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {sub.label}
          </button>
        ))}
        <div className="ml-auto">
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1.5">
            <AlertCircle size={11} />
            Admin reviewed
          </span>
        </div>
      </div>

      {/* Purchases sub-tab */}
      {historyTab === 'purchases' && (
        <div className="px-4 sm:px-6 py-5 space-y-3">
          {purchases.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No purchases yet this period</p>
          ) : (
            purchases.map(p => (
              <div
                key={p._id}
                className={`rounded-xl border px-4 py-4 transition-colors ${
                  p.status === 'approved'
                    ? 'border-slate-100 bg-slate-50'
                    : p.status === 'rejected'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.productName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.monthKey} · {p.paymentMethod} · Qty {p.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-700">+{p.totalPv} PV</p>
                    <p className={`text-xs font-medium mt-0.5 ${
                      p.status === 'approved' ? 'text-emerald-600'
                      : p.status === 'rejected' ? 'text-red-600'
                      : 'text-amber-600'
                    }`}>
                      {p.status === 'approved' ? '✓ Approved'
                       : p.status === 'rejected' ? '✕ Rejected'
                       : '⏳ Pending'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Paid</span>
                  <span className="text-xs font-semibold text-slate-900">₱{p.totalPrice.toLocaleString()}</span>
                </div>
                {p.adminNote && (
                  <p className="text-xs text-slate-500 mt-2 italic">Note: {p.adminNote}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* PIN History sub-tab */}
      {historyTab === 'pins' && (
        <div className="px-4 sm:px-6 py-5">
          {pinHistoryLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse rounded-xl border border-slate-100 h-16" />
              ))}
            </div>
          ) : pinHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No PINs redeemed yet</p>
          ) : (
            <div className="space-y-3">
              {pinHistory.map(p => (
                <div key={p._id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {p.pin}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {p.status === 'active' ? 'Active' : 'Void'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">{p.productName}</p>
                    <p className="text-xs text-slate-400">{new Date(p.redeemedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-700">+{p.pv} PV</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Unilevel Products
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Buy products to earn PV · 1,500 PV/month qualifies you for Leadership Bonus
          </p>
        </div>

        {/* PV Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Monthly Unilevel PV</p>
            <p className="text-xl sm:text-2xl font-semibold text-slate-900">{currentPv} PV</p>
            <p className="text-xs text-slate-400 mt-1">Goal: {threshold.toLocaleString()} PV</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
            <p className="text-xs text-slate-400 mb-2">Progress toward 1,500 PV</p>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${qualified ? 'bg-emerald-500' : 'bg-slate-700'}`}
                style={{ width: `${pctProgress}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-slate-700">{pctProgress}% complete</p>
          </div>

          <div className={`rounded-xl border px-4 sm:px-5 py-4 ${
            qualified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-100 bg-amber-50'
          }`}>
            <p className="text-xs text-slate-400 mb-1">Leadership Bonus Status</p>
            <p className={`text-lg font-semibold ${qualified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {qualified ? 'Qualified ✓' : 'Not yet qualified'}
            </p>
            <p className={`text-xs mt-1 ${qualified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {qualified
                ? "You qualify for this month's leadership bonus"
                : `Need ${Math.max(0, threshold - currentPv)} more PV`}
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-1 sm:gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'shop'    && <ShopPanel />}
        {activeTab === 'pin'     && <RedeemPinPanel />}
        {activeTab === 'rewards' && <LifestyleRewardsPanel />}
        {activeTab === 'history' && <HistoryPanel />}

      </div>

      {/* ─── Desktop Purchase Modal ─── */}
      {showPurchaseModal && selectedProduct && (
        <div className="hidden sm:flex fixed inset-0 bg-black/40 backdrop-blur-sm items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-md relative shadow-xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-slate-900">Purchase Product</h3>
              <button
                onClick={closePurchaseModal}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <PurchaseForm />
          </div>
        </div>
      )}

      {/* ─── Mobile Purchase Bottom Sheet ─── */}
      {showPurchaseSheet && selectedProduct && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePurchaseModal}
          />
          <div className="relative bg-white rounded-t-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-semibold text-slate-900">Purchase Product</h2>
              <button
                onClick={closePurchaseModal}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain flex-1">
              <PurchaseForm />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
