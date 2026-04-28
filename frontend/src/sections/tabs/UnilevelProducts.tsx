import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, X, AlertCircle, KeyRound, Gift, ShoppingBag, MapPin, Tag, History, Copy } from 'lucide-react';

import defaultProductImg from '../../assets/pk1.jpeg';
import sampleProducts from './json/unilevel.products.data.json';
import sampleLifestyleRewards from './json/unilevel.lifestyle.rewards.json';

import redeem1 from '../../assets/lifestyle rewards/Eat-All-You-Can-Restaurants-in-IT-Park-Cebu-11-1024x683.jpg'

const API_BASE_URL = 'http://localhost:3000';

// ─── Reward Images ────────────────────────────────────────────────────────────
const rewardImages: Record<string, string> = {
  'lr-001': redeem1,
};

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

interface PvStatus {
  monthKey: string;
  totalPv: number;
  availablePv: number;
  threshold: number;
  qualified: boolean;
}

interface RewardRedemption {
  _id: string;
  rewardName: string;
  pvCost: number;
  couponCode: string;
  redeemedAt: string;
}

interface LifestyleReward {
  _id: string;
  name: string;
  description: string;
  pointsCost: number;
  imageUrl: string;
  category: string;
  stock: number;
  partner?: string;
  location?: string;
  validUntil?: string;
  couponCode?: string;
  terms?: string;
}

function resolveImage(imageUrl: string): string {
  return imageUrl && imageUrl.trim() !== '' ? imageUrl : defaultProductImg;
}

type MainTab = 'shop' | 'rewards';

// ─── Component ───────────────────────────────────────────────────────────────

export default function UnilevelProducts() {
  // Core data — use sample data for products
  const [products] = useState<ApiProduct[]>(sampleProducts as ApiProduct[]);
  const [pvStatus, setPvStatus]   = useState<PvStatus | null>(null);
  const [loading, setLoading]     = useState(false);

  // Navigation
  const [activeTab, setActiveTab]   = useState<MainTab>('shop');

  // PIN redemption modal
  const [showPinModal, setShowPinModal] = useState(false);

  // PIN redemption
  const [pinInput, setPinInput]   = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError]   = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Lifestyle rewards
  const [rewards, setRewards]               = useState<LifestyleReward[]>(sampleLifestyleRewards as LifestyleReward[]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardError, setRewardError]       = useState<Record<string, string>>({});
  const [redeemingReward, setRedeemingReward] = useState<string | null>(null);

  // Reward redemption history + success modal
  const [rewardRedemptions, setRewardRedemptions]       = useState<RewardRedemption[]>([]);
  const [rewardHistoryLoading, setRewardHistoryLoading] = useState(false);
  const [lastRedemption, setLastRedemption]             = useState<RewardRedemption | null>(null);
  const [copiedCode, setCopiedCode]                     = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const token = () => localStorage.getItem('accessToken');
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  const refreshPv = useCallback(() => {
    return fetch(`${API_BASE_URL}/unilevel-products/my/pv-status`, { headers: authHeaders() })
      .then(r => r.json())
      .then(pvJson => setPvStatus(pvJson?.monthKey ? pvJson : null));
  }, []);

  const refreshData = useCallback(() => {
    setLoading(true);
    refreshPv()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshPv]);

  const fetchRewards = useCallback(() => {
    setRewardsLoading(true);
    fetch(`${API_BASE_URL}/unilevel-products/lifestyle-rewards`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRewards(Array.isArray(data) && data.length > 0 ? data : sampleLifestyleRewards as LifestyleReward[]))
      .catch(() => setRewards(sampleLifestyleRewards as LifestyleReward[]))
      .finally(() => setRewardsLoading(false));
  }, []);

  const fetchRewardHistory = useCallback(() => {
    setRewardHistoryLoading(true);
    fetch(`${API_BASE_URL}/unilevel-products/my/reward-history`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRewardRedemptions(Array.isArray(data) ? data : []))
      .catch(() => setRewardRedemptions([]))
      .finally(() => setRewardHistoryLoading(false));
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    if (activeTab === 'rewards') {
      fetchRewards();
      fetchRewardHistory();
    }
  }, [activeTab, fetchRewards, fetchRewardHistory]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const currentPv   = pvStatus?.totalPv     ?? 0;
  const availablePv = pvStatus?.availablePv ?? 0;
  const threshold   = pvStatus?.threshold   ?? 1500;
  const qualified   = pvStatus?.qualified   ?? false;
  const pctProgress = Math.min(100, Math.round((currentPv / threshold) * 100));

  // ─── Handlers ──────────────────────────────────────────────────────────────

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
      refreshPv();
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
      setLastRedemption({
        _id:        '',
        rewardName: json.reward?.name ?? '',
        pvCost:     json.pvSpent ?? 0,
        couponCode: json.couponCode ?? '',
        redeemedAt: new Date().toISOString(),
      });
      setCopiedCode(false);
      fetchRewards();
      fetchRewardHistory();
      refreshPv();
    } catch (err: any) {
      setRewardError(prev => ({ ...prev, [rewardId]: err.message ?? 'Something went wrong' }));
    } finally {
      setRedeemingReward(null);
    }
  };

  // ─── Tab config ────────────────────────────────────────────────────────────

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'shop',    label: 'Shop',             icon: <ShoppingBag size={14} /> },
    { id: 'rewards', label: 'Lifestyle Rewards', icon: <Gift size={14} /> },
  ];

  // ─── Sub-components ────────────────────────────────────────────────────────

  const ShopPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Available Products</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''} available`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPinInput('');
              setPinError('');
              setPinSuccess('');
              setShowPinModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 active:scale-95 transition-all duration-150 shadow-sm whitespace-nowrap"
          >
            <KeyRound size={13} />
            Redeem PIN
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Product Name
              </th>
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">
                Description
              </th>
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                Features
              </th>
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Price
              </th>
              <th className="text-center px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                PV
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                      <ShoppingBag size={18} />
                    </div>
                    <p className="text-slate-400 text-sm">No products available yet</p>
                    <p className="text-slate-300 text-xs">Products will appear here</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product._id} className="hover:bg-slate-50 transition-colors duration-150">

                  {/* Product Name with image */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={resolveImage(product.imageUrl)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="font-medium text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                        {product.name}
                      </p>
                    </div>
                  </td>

                  {/* Description */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                    <p className="text-xs text-slate-500 max-w-50 line-clamp-2">
                      {product.description}
                    </p>
                  </td>

                  {/* Features */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                    <div className="flex flex-col gap-0.5">
                      {product.features.slice(0, 3).map((f, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs text-slate-500">
                          <CheckCircle size={9} className="text-emerald-500 shrink-0" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">
                      ₱{product.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">per unit</p>
                  </td>

                  {/* PV badge */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                      +{product.pv} PV
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const LifestyleRewardsPanel = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Lifestyle Rewards</h2>
          <p className="text-xs text-slate-400 mt-0.5">Redeem using your unilevel PV balance</p>
        </div>
      </div>

      {rewardsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl border border-slate-100 overflow-hidden animate-pulse">
              <div className="aspect-video bg-slate-100" />
              <div className="p-4 space-y-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rewards.map(reward => {
            const canAfford   = availablePv >= reward.pointsCost;
            const inStock     = reward.stock > 0;
            const isRedeeming = redeemingReward === reward._id;
            const err         = rewardError[reward._id];

            return (
              <div
                key={reward._id}
                className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col"
              >
                {/* Image / banner */}
                <div className="aspect-video overflow-hidden bg-linear-to-br from-amber-50 to-orange-100 relative flex items-center justify-center">
                  {rewardImages[reward._id] ? (
                    <img
                      src={rewardImages[reward._id]}
                      alt={reward.name}
                      className={`w-full h-full object-cover ${!inStock ? 'opacity-40' : ''}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-orange-300">
                      <Gift size={40} />
                      <span className="text-xs font-medium text-orange-400">{reward.category}</span>
                    </div>
                  )}
                  {!inStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                      <span className="text-xs font-semibold bg-white/90 text-slate-600 px-2 py-1 rounded-full shadow">
                        Out of stock
                      </span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-xs font-semibold text-violet-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
                    {reward.pointsCost.toLocaleString()} PV
                  </span>
                </div>

                <div className="p-4 flex flex-col flex-1 gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{reward.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{reward.description}</p>
                  </div>

                  {/* Partner / Location info */}
                  {reward.partner && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Tag size={11} className="text-slate-400 shrink-0" />
                      <span>{reward.partner}</span>
                    </div>
                  )}
                  {reward.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span>{reward.location}</span>
                    </div>
                  )}

                  {/* Terms */}
                  {reward.terms && (
                    <p className="text-xs text-slate-400 italic line-clamp-2">{reward.terms}</p>
                  )}

                  {reward.category && (
                    <span className="self-start text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {reward.category}
                    </span>
                  )}

                  {err && <p className="text-xs text-red-600">{err}</p>}

                  {!canAfford && inStock && (
                    <p className="text-xs text-amber-600">
                      Need {(reward.pointsCost - availablePv).toLocaleString()} more PHP
                    </p>
                  )}

                  <button
                    onClick={() => handleRedeemReward(reward._id)}
                    disabled={!canAfford || !inStock || isRedeeming}
                    className="mt-auto w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-medium py-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {isRedeeming ? 'Redeeming…' : !inStock ? 'Out of Stock' : !canAfford ? 'Not Enough PV' : 'Redeem Coupon'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Redemption History ─── */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <History size={15} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Redemption History</h3>
        </div>

        {rewardHistoryLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rewardRedemptions.length === 0 ? (
          <div className="rounded-xl border border-slate-100 py-10 text-center">
            <Gift size={28} className="mx-auto mb-2 text-slate-200" />
            <p className="text-xs text-slate-400">No rewards redeemed yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Reward</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden sm:table-cell">Coupon Code</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">PV Used</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rewardRedemptions.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-800">{r.rewardName}</p>
                      {/* Coupon shown inline on mobile */}
                      <p className="text-xs font-mono text-violet-600 mt-0.5 sm:hidden">{r.couponCode}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                          {r.couponCode}
                        </span>
                        <button
                          onClick={() => handleCopyCoupon(r.couponCode)}
                          className="text-slate-300 hover:text-slate-500 transition-colors"
                          title="Copy coupon code"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-violet-700">{r.pvCost.toLocaleString()} PV</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-xs text-slate-400">
                        {new Date(r.redeemedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Redemption Success Modal ─── */}
      {lastRedemption && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-sm shadow-xl">
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Reward Redeemed!</h3>
              <p className="text-xs text-slate-400 mt-1">{lastRedemption.rewardName}</p>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center mb-2">Your Coupon Code</p>
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                <span className="flex-1 font-mono text-base font-bold text-violet-700 tracking-widest text-center">
                  {lastRedemption.couponCode}
                </span>
                <button
                  onClick={() => handleCopyCoupon(lastRedemption.couponCode)}
                  className="shrink-0 text-violet-400 hover:text-violet-600 transition-colors"
                  title="Copy"
                >
                  {copiedCode ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
              {copiedCode && (
                <p className="text-xs text-emerald-600 text-center mt-1.5">Copied to clipboard!</p>
              )}
              <p className="text-xs text-slate-400 text-center mt-3">
                {lastRedemption.pvCost.toLocaleString()} PV used · Present this code to the partner to claim your reward
              </p>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setLastRedemption(null)}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const PinModalPanel = () => (
    <>
      {/* ─── Redeem PIN Modal ─── */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-md relative shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-slate-400" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Redeem a Product PIN</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Enter your PIN code to activate and earn PV</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPinError('');
                  setPinSuccess('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
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
        </div>
      )}
    </>
  );

  return (
    <div className="bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Unilevel Products
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Buy products to earn PV · 1,500 PHP/month qualifies you for Leadership Bonus
          </p>
        </div>

        {/* PV Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Monthly Unilevel PV</p>
            <p className="text-xl sm:text-2xl font-semibold text-slate-900">{currentPv} PV</p>
            <p className="text-xs text-slate-400 mt-1">Goal: {threshold.toLocaleString()} PHP</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
            <p className="text-xs text-slate-400 mb-2">Progress toward 1,500 PHP</p>
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
                : `Need ${Math.max(0, threshold - currentPv)} more PHP`}
            </p>
          </div>
        </div>

        {/* ── Tab nav — underline style matching reference image ── */}
        <div className="flex items-center gap-0 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'shop'    && <ShopPanel />}
        {activeTab === 'rewards' && <LifestyleRewardsPanel />}

      </div>

      <PinModalPanel />
    </div>
  );
}
