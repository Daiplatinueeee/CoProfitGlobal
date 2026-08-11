import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import {
  Gift, TicketCheck, CheckCircle, Copy, MapPin,
  Sparkles, Wallet,
} from 'lucide-react';

import redeem1 from '../../assets/lifestyle rewards/Eat-All-You-Can-Restaurants-in-IT-Park-Cebu-11-1024x683.jpg';
import redeem2 from '../../assets/lifestyle rewards/staycation-ideas.jpg';
import redeem3 from '../../assets/lifestyle rewards/Android_phone.jpg';
import redeem4 from '../../assets/lifestyle rewards/macbook-6_hgfm.jpg';
import redeem5 from '../../assets/lifestyle rewards/yamaha-mio-aerox-31196.avif';
import redeem6 from '../../assets/lifestyle rewards/sedan.jpg';
import redeem7 from '../../assets/lifestyle rewards/syv.jpg';
import redeem8 from '../../assets/lifestyle rewards/house.webp';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Reward images, keyed by level ────────────────────────────────────────────
const levelImages: Record<number, string> = {
  1: redeem1,
  2: redeem2,
  3: redeem3,
  4: redeem4,
  5: redeem5,
  6: redeem6,
  7: redeem7,
  8: redeem8,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GcRewardLevel {
  level: number;
  name: string;
  gcCost: number;
}

interface GcRedemption {
  _id: string;
  level: number;
  rewardName: string;
  gcCost: number;
  couponCode: string;
  redeemedAt: string;
}

type MainTab = 'rewards' | 'my-coupons';

// Local fallback for the 8 levels — the backend (`/gc-rewards/my/status`) is the
// source of truth for cost validation, but we keep the display list here so the
// cards always render even if that call is slow or unavailable.
const DEFAULT_LEVELS: GcRewardLevel[] = [
  { level: 1, name: 'Eat All You Can',    gcCost: 8 },
  { level: 2, name: 'Staycation for 2',   gcCost: 25 },
  { level: 3, name: 'Gadget / Cellphone', gcCost: 80 },
  { level: 4, name: 'Macbook',            gcCost: 250 },
  { level: 5, name: 'Motorcycle',         gcCost: 500 },
  { level: 6, name: 'Sedan Car',          gcCost: 5000 },
  { level: 7, name: 'SUV / Pick Up',      gcCost: 10000 },
  { level: 8, name: 'House and Lot',      gcCost: 25000 },
];

function formatGc(n: number) {
  return n.toLocaleString('en-PH');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LifestyleRewards() {
  const [activeTab, setActiveTab] = useState<MainTab>('rewards');

  const [gcBalance, setGcBalance] = useState(0);
  const [levels, setLevels] = useState<GcRewardLevel[]>(DEFAULT_LEVELS);
  const [loading, setLoading] = useState(true);

  const [redemptions, setRedemptions] = useState<GcRedemption[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [redeemingLevel, setRedeemingLevel] = useState<number | null>(null);
  const [rewardError, setRewardError] = useState<Record<number, string>>({});
  const [lastCoupon, setLastCoupon] = useState<{ rewardName: string; couponCode: string; gcSpent: number } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchStatus = useCallback(() => {
    setLoading(true);
    apiFetch(`${API_BASE_URL}/gc-rewards/my/status`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setGcBalance(data.gcBalance ?? 0);
          if (Array.isArray(data.levels) && data.levels.length > 0) {
            setLevels(data.levels);
          }
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    apiFetch(`${API_BASE_URL}/gc-rewards/my/history`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setRedemptions(Array.isArray(data) ? data : []))
      .catch(() => setRedemptions([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => { fetchStatus(); fetchHistory(); }, [fetchStatus, fetchHistory]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
  const nextLevel = sortedLevels.find(l => l.gcCost > gcBalance) ?? null;
  const goal = nextLevel?.gcCost ?? sortedLevels[sortedLevels.length - 1]?.gcCost ?? 0;
  const pctProgress = goal > 0 ? Math.min(100, Math.round((gcBalance / goal) * 100)) : 100;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRedeem = async (level: number) => {
    setRedeemingLevel(level);
    setRewardError(prev => ({ ...prev, [level]: '' }));
    try {
      const res = await apiFetch(`${API_BASE_URL}/gc-rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Redemption failed');
      setLastCoupon({
        rewardName: json.rewardName ?? '',
        couponCode: json.couponCode ?? '',
        gcSpent: json.gcSpent ?? 0,
      });
      setGcBalance(json.remainingGc ?? gcBalance);
      setCopiedCode(null);
      fetchHistory();
    } catch (err: any) {
      setRewardError(prev => ({ ...prev, [level]: err.message ?? 'Something went wrong' }));
    } finally {
      setRedeemingLevel(null);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'rewards', label: 'Lifestyle Rewards', icon: <Gift size={13} /> },
    { id: 'my-coupons', label: 'My Coupons', icon: <TicketCheck size={13} /> },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ── REWARDS PANEL ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const RewardsPanel = () => (
    <div>
      {loading ? (
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sortedLevels.map(reward => {
            const canAfford = gcBalance >= reward.gcCost;
            const isRedeeming = redeemingLevel === reward.level;
            const err = rewardError[reward.level];

            return (
              <div key={reward.level} className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
                <div className="aspect-video overflow-hidden bg-linear-to-br from-amber-50 to-orange-100 relative flex items-center justify-center">
                  {levelImages[reward.level] ? (
                    <img src={levelImages[reward.level]} alt={reward.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gift size={40} className="text-orange-300" />
                  )}
                  <span className="absolute top-2 left-2 text-xs font-semibold text-white bg-slate-900/80 px-2 py-0.5 rounded-full shadow-sm">
                    Level {reward.level}
                  </span>
                  <span className="absolute top-2 right-2 text-xs font-semibold text-violet-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
                    {formatGc(reward.gcCost)} GC
                  </span>
                </div>

                <div className="p-4 flex flex-col flex-1 gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{reward.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Convert {formatGc(reward.gcCost)} GC into this reward</p>
                  </div>

                  {err && <p className="text-xs text-red-600">{err}</p>}
                  {!canAfford && (
                    <p className="text-xs text-amber-600">
                      Need {formatGc(reward.gcCost - gcBalance)} more GC
                    </p>
                  )}

                  <button
                    onClick={() => handleRedeem(reward.level)}
                    disabled={!canAfford || isRedeeming}
                    className="mt-auto w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-medium py-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {isRedeeming ? 'Redeeming…' : !canAfford ? 'Not Enough GC' : 'Redeem with GC'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Redemption Success Modal ── */}
      {lastCoupon && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-sm shadow-xl">
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Reward Redeemed!</h3>
              <p className="text-xs text-slate-400 mt-1">{lastCoupon.rewardName}</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center mb-2">Your Coupon Code</p>
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                <span className="flex-1 font-mono text-base font-bold text-violet-700 tracking-widest text-center">
                  {lastCoupon.couponCode}
                </span>
                <button
                  onClick={() => handleCopyCoupon(lastCoupon.couponCode)}
                  className="shrink-0 text-violet-400 hover:text-violet-600 transition-colors"
                  title="Copy"
                >
                  {copiedCode === lastCoupon.couponCode
                    ? <CheckCircle size={16} className="text-emerald-500" />
                    : <Copy size={16} />
                  }
                </button>
              </div>
              {copiedCode === lastCoupon.couponCode && (
                <p className="text-xs text-emerald-600 text-center mt-1.5">Copied to clipboard!</p>
              )}
              <p className="text-xs text-slate-400 text-center mt-3">
                {formatGc(lastCoupon.gcSpent)} GC used · Present this code on-site to claim your reward
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setLastCoupon(null)}
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
          onClick={fetchHistory}
          className="text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ── Claim reminder ── */}
      <div className="mb-5 flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 border border-amber-200">
        <MapPin size={15} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-700">Claim on-site</p>
          <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
            These coupons can only be claimed on-site. Visit the office and present your coupon code to redeem your reward in person.
          </p>
        </div>
      </div>

      {historyLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : redemptions.length === 0 ? (
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
          {redemptions.map(r => (
            <div key={r._id} className="relative bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              {/* Reward image */}
              {levelImages[r.level] ? (
                <div className="aspect-video overflow-hidden bg-slate-100">
                  <img src={levelImages[r.level]} alt={r.rewardName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-linear-to-br from-violet-50 to-violet-100 flex flex-col items-center justify-center gap-1">
                  <Gift size={36} className="text-violet-300" />
                  <span className="text-xs font-medium text-violet-400">Level {r.level}</span>
                </div>
              )}

              {/* Ticket notch decorations */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-5 bg-slate-50 rounded-r-full border-r border-t border-b border-slate-100" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-5 bg-slate-50 rounded-l-full border-l border-t border-b border-slate-100" />

              <div className="px-6 pt-4 pb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 truncate">
                  Level {r.level} · {r.rewardName}
                </p>

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

                <div className="border-t border-dashed border-slate-200 my-3" />

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 font-semibold text-violet-600 bg-violet-50 ring-1 ring-violet-100 px-2 py-0.5 rounded-full">
                    {formatGc(r.gcCost)} GC
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
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Lifestyle Rewards
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 ring-1 ring-violet-200 px-2.5 py-0.5 rounded-full">
              <Sparkles size={11} />
              8 Levels
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Convert your GC (Gift Certificates) into exclusive lifestyle rewards — from an Eat-All-You-Can treat to a House and Lot.
          </p>
        </div>

        {/* ── GC Balance Banner ── */}
        <div className="mb-6 bg-white border border-slate-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
              <Wallet size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Available GC Balance</p>
              <p className="text-xl font-bold text-violet-700">{loading ? '—' : formatGc(gcBalance)} <span className="text-sm font-medium text-slate-400">GC</span></p>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-100 hidden sm:block" />

          {/* Progress toward next level */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-slate-400">
                {nextLevel
                  ? <>Progress to <span className="font-medium text-slate-600">Level {nextLevel.level} · {nextLevel.name}</span></>
                  : 'You can afford every reward level 🎉'}
              </p>
              <p className="text-xs font-semibold text-slate-700">{pctProgress}%</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${pctProgress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                style={{ width: `${pctProgress}%` }}
              />
            </div>
            {nextLevel && (
              <p className="text-[10px] text-slate-400 mt-1">
                {formatGc(gcBalance)} / {formatGc(goal)} GC needed
              </p>
            )}
          </div>
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
              {tab.id === 'my-coupons' && redemptions.length > 0 && (
                <span className="ml-0.5 text-[10px] font-bold text-violet-600 bg-violet-50 ring-1 ring-violet-100 px-1.5 py-0.5 rounded-full">
                  {redemptions.length}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'rewards' && <RewardsPanel />}
        {activeTab === 'my-coupons' && <MyCouponsPanel />}
      </div>
    </div>
  );
}
