import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle, AlertCircle, KeyRound, Gift, ShoppingBag,
  MapPin, Tag, History, Copy, Lock, ShieldCheck, Sparkles,
  TicketCheck, ArrowRight, FlaskConical,
} from 'lucide-react';

import defaultProductImg from '../../assets/logoWithName.png';
import sampleProducts from './json/unilevel.products.data.json';
import sampleLifestyleRewards from './json/unilevel.lifestyle.rewards.json';

import redeem1 from '../../assets/lifestyle rewards/Eat-All-You-Can-Restaurants-in-IT-Park-Cebu-11-1024x683.jpg';

const API_BASE_URL = 'http://localhost:3000';

// ─── Reward Images ────────────────────────────────────────────────────────────
const rewardImages: Record<string, string> = {
  'lr-001': redeem1,
};

// ─── Types ────────────────────────────────────────────────────────────────────

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

type MainTab = 'shop' | 'rewards' | 'my-coupons';

// ─── PIN format validator: 3 uppercase letters + 3 digits ─────────────────────
function formatPinInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = cleaned.replace(/[^A-Z]/g, '').slice(0, 3);
  const digits = cleaned.replace(/[^0-9]/g, '').slice(0, 3);
  return letters + digits;
}

function isPinValid(pin: string): boolean {
  return /^[A-Z]{3}[0-9]{3}$/.test(pin);
}

// ─── Package features list ────────────────────────────────────────────────────
const PACKAGE_FEATURES = [
  'Access to all Unilevel products',
  'Earn PV on every purchase',
  'Leadership Bonus qualification',
  'Lifestyle Rewards redemption',
  'Monthly coupon benefits',
  'Priority member support',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function UnilevelProducts() {
  // ── Purchase simulation ───────────────────────────────────────────────────
  const [hasPurchased, setHasPurchased] = useState(false);

  // ── Core data ─────────────────────────────────────────────────────────────
  const [products] = useState<ApiProduct[]>(sampleProducts as ApiProduct[]);
  const [pvStatus, setPvStatus] = useState<PvStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MainTab>('shop');

  // ── PIN redemption ────────────────────────────────────────────────────────
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // ── Lifestyle rewards ─────────────────────────────────────────────────────
  const [rewards, setRewards] = useState<LifestyleReward[]>(sampleLifestyleRewards as LifestyleReward[]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardError, setRewardError] = useState<Record<string, string>>({});
  const [redeemingReward, setRedeemingReward] = useState<string | null>(null);

  // ── Redemption history + success modal ───────────────────────────────────
  const [rewardRedemptions, setRewardRedemptions] = useState<RewardRedemption[]>([]);
  const [rewardHistoryLoading, setRewardHistoryLoading] = useState(false);
  const [lastRedemption, setLastRedemption] = useState<RewardRedemption | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ─── Auth helpers ─────────────────────────────────────────────────────────

  const token = () => localStorage.getItem('accessToken');
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const refreshPv = useCallback(() => {
    return fetch(`${API_BASE_URL}/unilevel-products/my/pv-status`, { headers: authHeaders() })
      .then(r => r.json())
      .then(pvJson => setPvStatus(pvJson?.monthKey ? pvJson : null));
  }, []);

  const refreshData = useCallback(() => {
    setLoading(true);
    refreshPv().catch(() => { }).finally(() => setLoading(false));
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
    if (activeTab === 'rewards' || activeTab === 'my-coupons') {
      fetchRewards();
      fetchRewardHistory();
    }
  }, [activeTab, fetchRewards, fetchRewardHistory]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const currentPv = pvStatus?.totalPv ?? 0;
  const availablePv = pvStatus?.availablePv ?? 0;

  // ── Closest lifestyle reward goal ─────────────────────────────────────────
  const inStockRewardsSorted = [...rewards].filter(r => r.stock > 0).sort((a, b) => a.pointsCost - b.pointsCost);
  const closestReward = inStockRewardsSorted.find(r => r.pointsCost >= availablePv) ?? inStockRewardsSorted[0] ?? null;
  const rewardGoal = closestReward?.pointsCost ?? 0;
  const pctProgress = rewardGoal > 0 ? Math.min(100, Math.round((availablePv / rewardGoal) * 100)) : 0;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRedeemPin = async () => {
    const pin = pinInput.trim().toUpperCase();
    if (!isPinValid(pin)) {
      setPinError('PIN must be 3 uppercase letters followed by 3 digits (e.g. ABC123).');
      return;
    }
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
        _id: '',
        rewardName: json.reward?.name ?? '',
        pvCost: json.pvSpent ?? 0,
        couponCode: json.couponCode ?? '',
        redeemedAt: new Date().toISOString(),
      });
      setCopiedCode(null);
      fetchRewards();
      fetchRewardHistory();
      refreshPv();
    } catch (err: any) {
      setRewardError(prev => ({ ...prev, [rewardId]: err.message ?? 'Something went wrong' }));
    } finally {
      setRedeemingReward(null);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const formatPrice = (price: number | null | undefined) =>
    !price ? 'N/A' : price.toLocaleString();

  // ─── Tab config ───────────────────────────────────────────────────────────

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'shop', label: 'Shop', icon: <ShoppingBag size={13} /> },
    { id: 'rewards', label: 'Lifestyle Rewards', icon: <Gift size={13} /> },
    { id: 'my-coupons', label: 'My Coupons', icon: <TicketCheck size={13} /> },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PURCHASE GATE ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const PurchaseGate = () => (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">

      {/* Locked hero card */}
      <div className="w-full max-w-lg">

        {/* Light package card */}
        <div className="relative bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 mb-6">

          {/* Decorative background rings */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-slate-200/60 pointer-events-none" />
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border border-slate-200/70 pointer-events-none" />

          {/* Lock badge */}
          <div className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Lock size={14} className="text-slate-400" />
          </div>

          <div className="px-7 py-8">
            {/* Label */}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-5">
              <Sparkles size={11} />
              Unilevel Package
            </span>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-400 text-sm font-medium">₱</span>
                <span className="text-5xl font-bold text-slate-900 tracking-tight">1,500</span>
                <span className="text-slate-400 text-sm font-medium self-end mb-1">PHP</span>
              </div>
              <p className="text-slate-400 text-xs mt-1.5">One-time package purchase · unlocks all Unilevel features</p>
            </div>

            {/* Features */}
            <ul className="space-y-2.5 mb-7">
              {PACKAGE_FEATURES.map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <CheckCircle size={9} className="text-emerald-500" />
                  </span>
                  {feat}
                </li>
              ))}
            </ul>

            {/* Info note */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-3">
              <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-0.5">Package not yet activated</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  You need to purchase the ₱1,500 Unilevel Package to access the shop, redeem PINs, and enjoy lifestyle rewards. Contact your admin or upline to get started.
                </p>
              </div>
            </div>

            {/* CTA — purely visual in this simulation */}
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-slate-100 border border-slate-200 text-slate-400 text-sm font-medium py-3 rounded-xl cursor-not-allowed"
            >
              Third Party Purchase Required
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SHOP PANEL ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const ShopPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Available Products</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''} available`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200 px-3 py-1 rounded-full">
          <ShoppingBag size={11} />
          Product Catalogue
        </span>
      </div>

      {/* ── Table (untouched) ── */}
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
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">Loading…</td>
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
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                    <p className="text-xs text-slate-500 max-w-50 line-clamp-2">{product.description}</p>
                  </td>
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
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">₱{formatPrice(product.price)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">per unit</p>
                  </td>
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ── LIFESTYLE REWARDS PANEL ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const LifestyleRewardsPanel = () => (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Lifestyle Rewards</h2>
          <p className="text-xs text-slate-400 mt-0.5">Redeem using your Unilevel PV balance</p>
        </div>
      </div>

      {rewardsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map(i => (
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
            const canAfford = availablePv >= reward.pointsCost;
            const inStock = reward.stock > 0;
            const isRedeeming = redeemingReward === reward._id;
            const err = rewardError[reward._id];

            return (
              <div key={reward._id} className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
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
                      Need {(reward.pointsCost - availablePv).toLocaleString()} more PV
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

      {/* ── Redemption History (table untouched) ── */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <History size={15} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Redemption History</h3>
        </div>

        {rewardHistoryLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
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
                          {copiedCode === r.couponCode
                            ? <CheckCircle size={12} className="text-emerald-500" />
                            : <Copy size={12} />
                          }
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

      {/* ── Redemption Success Modal ── */}
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
                  {copiedCode === lastRedemption.couponCode
                    ? <CheckCircle size={16} className="text-emerald-500" />
                    : <Copy size={16} />
                  }
                </button>
              </div>
              {copiedCode === lastRedemption.couponCode && (
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ── MY COUPONS PANEL ───────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const MyCouponsPanel = () => (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">My Lifestyle Coupons</h2>
          <p className="text-xs text-slate-400 mt-0.5">All your redeemed reward coupons in one place</p>
        </div>
        <button
          onClick={fetchRewardHistory}
          className="text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {rewardHistoryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : rewardRedemptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
            <TicketCheck size={28} className="text-slate-200" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">No coupons yet</p>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Redeem a lifestyle reward from the Lifestyle Rewards tab to see your coupons here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewardRedemptions.map(r => (
            <div
              key={r._id}
              className="relative bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm group"
            >
              {/* Top accent strip */}
              <div className="h-1 bg-linear-to-r from-violet-400 to-violet-600" />

              {/* Ticket notch decorations */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-5 bg-slate-50 rounded-r-full border-r border-t border-b border-slate-100" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 bg-slate-50 rounded-l-full border-l border-t border-b border-slate-100" />

              <div className="px-6 pt-4 pb-5">
                {/* Reward name */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 truncate">
                  {r.rewardName}
                </p>

                {/* Coupon code */}
                <div className="flex items-center justify-between gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 my-3">
                  <span className="font-mono text-lg font-bold text-violet-700 tracking-widest flex-1 text-center select-all">
                    {r.couponCode}
                  </span>
                  <button
                    onClick={() => handleCopyCoupon(r.couponCode)}
                    title="Copy coupon"
                    className="shrink-0 text-violet-300 hover:text-violet-600 transition-colors"
                  >
                    {copiedCode === r.couponCode
                      ? <CheckCircle size={15} className="text-emerald-500" />
                      : <Copy size={15} />
                    }
                  </button>
                </div>
                {copiedCode === r.couponCode && (
                  <p className="text-xs text-emerald-600 text-center -mt-1 mb-2">Copied!</p>
                )}

                {/* Dashed divider */}
                <div className="border-t border-dashed border-slate-200 my-3" />

                {/* Meta row */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 font-semibold text-violet-600 bg-violet-50 ring-1 ring-violet-100 px-2 py-0.5 rounded-full">
                    {r.pvCost.toLocaleString()} PV
                  </span>
                  <span>
                    {new Date(r.redeemedAt).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ROOT RENDER ───────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-white min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* ── Page Header ── */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                Unilevel Products
              </h1>
              {hasPurchased ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck size={11} />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 ring-1 ring-slate-200 px-2.5 py-0.5 rounded-full">
                  <Lock size={11} />
                  Locked
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {hasPurchased
                ? 'Buy products to earn PV · Redeem PV for exclusive Lifestyle Rewards'
                : 'Purchase the ₱1,500 package to unlock all Unilevel features'}
            </p>
          </div>

          {/* ── Simulation toggle ── */}
          <div className="shrink-0">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <FlaskConical size={13} className="text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-500 hidden sm:block">Simulate Purchase</span>
              <button
                onClick={() => setHasPurchased(v => !v)}
                className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${hasPurchased ? 'bg-emerald-500' : 'bg-slate-300'}`}
                title={hasPurchased ? 'Click to simulate not purchased' : 'Click to simulate purchased'}
              >
                <span
                  className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.75 ${hasPurchased ? 'translate-x-4.75' : 'translate-x-0.75'}`}
                />
              </button>
            </div>
            <p className="text-[10px] text-slate-300 text-center mt-1">Dev only</p>
          </div>
        </div>

        {/* ── Gate or main content ── */}
        {!hasPurchased ? (
          <PurchaseGate />
        ) : (
          <>
            {/* ── PV Status Banner ── */}
            <div className="mb-6 bg-white border border-slate-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">

              {/* Left: PV figures */}
              <div className="flex items-center gap-5 shrink-0">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Monthly PV</p>
                  <p className="text-xl font-bold text-slate-900">{currentPv} <span className="text-sm font-medium text-slate-400">/ 5,000</span></p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Available PV</p>
                  <p className="text-xl font-bold text-violet-700">{availablePv.toLocaleString()}</p>
                </div>
              </div>

              {/* Center: progress bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-400">
                    {closestReward
                      ? <>Progress to <span className="font-medium text-slate-600">{closestReward.name}</span></>
                      : 'Progress to next Lifestyle Reward'}
                  </p>
                  <p className="text-xs font-semibold text-slate-700">{pctProgress}%</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${pctProgress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    style={{ width: `${pctProgress}%` }}
                  />
                </div>
                {closestReward && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {availablePv.toLocaleString()} / {rewardGoal.toLocaleString()} PV needed
                  </p>
                )}
              </div>

              {/* Right: status chip */}
              <div className="shrink-0">
                {pctProgress >= 100 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-3 py-1.5 rounded-full">
                    <Gift size={12} />
                    Ready to Redeem!
                  </span>
                ) : closestReward ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 ring-1 ring-violet-200 px-3 py-1.5 rounded-full">
                    <AlertCircle size={12} />
                    Need {Math.max(0, rewardGoal - availablePv).toLocaleString()} more PV
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 ring-1 ring-slate-200 px-3 py-1.5 rounded-full">
                    <Gift size={12} />
                    No rewards available
                  </span>
                )}
              </div>
            </div>

            {/* ── Inline PIN Redemption ── */}
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl px-5 sm:px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Label */}
                <div className="shrink-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <KeyRound size={14} className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">Redeem Product PIN</p>
                  </div>
                </div>

                {/* Input + button */}
                <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={pinInput}
                      onChange={e => {
                        setPinInput(formatPinInput(e.target.value));
                        setPinError('');
                        setPinSuccess('');
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleRedeemPin()}
                      placeholder="AAA000"
                      maxLength={6}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-mono text-sm tracking-[0.25em] placeholder:text-slate-300 placeholder:tracking-[0.25em] focus:outline-none focus:ring-2 transition-all uppercase ${pinError ? 'border-red-400 focus:ring-red-200' :
                        pinSuccess ? 'border-emerald-400 focus:ring-emerald-200' :
                          'border-slate-200 focus:ring-slate-300/50'
                        }`}
                    />
                    {/* Live format hint */}
                    {pinInput.length > 0 && pinInput.length < 6 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                        {pinInput.length}/6
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRedeemPin}
                    disabled={!isPinValid(pinInput) || pinLoading}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <KeyRound size={14} />
                    {pinLoading ? 'Redeeming…' : 'Redeem PIN'}
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {(pinSuccess || pinError) && (
                <div className={`mt-3 flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${pinSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                  {pinSuccess
                    ? <CheckCircle size={13} className="shrink-0" />
                    : <AlertCircle size={13} className="shrink-0" />
                  }
                  {pinSuccess || pinError}
                </div>
              )}
            </div>

            {/* ── Tab navigation ── */}
            <div className="flex items-center gap-0 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-none">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'my-coupons' && rewardRedemptions.length > 0 && (
                    <span className="ml-0.5 text-[10px] font-bold text-violet-600 bg-violet-50 ring-1 ring-violet-100 px-1.5 py-0.5 rounded-full">
                      {rewardRedemptions.length}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            {activeTab === 'shop' && <ShopPanel />}
            {activeTab === 'rewards' && <LifestyleRewardsPanel />}
            {activeTab === 'my-coupons' && <MyCouponsPanel />}
          </>
        )}
      </div>
    </div>
  );
}