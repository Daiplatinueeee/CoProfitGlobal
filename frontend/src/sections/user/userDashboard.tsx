import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiFetch';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, TrendingUp, Gift, Lock, Wallet, Leaf,
  Network, AlertCircle, LogOut, ChevronLeft, Construction,
  Combine,
  BanknoteArrowDown,
  HandCoins,
  User,
  Trophy,
} from 'lucide-react';

import Genealogy from '../tabs/Genealogy';
import Pairing from '../tabs/Pairing'
import Payout from '../tabs/Payout';
import Subscription from '../tabs/Subscription';
import ReferalsHierarchy from '../tabs/ReferalsHierarchy';
import WithdrawGC from '../tabs/WithdrawGC';
import UnilevelProducts from '../tabs/UnilevelProducts';
import StairstepProgram from '../tabs/StairstepProgram';
import Transactions from '../tabs/Transactions'
import ViewMyAccount from '../tabs/ViewMyAccount';

import baseImg from '../../assets/products/1-bg-removed-Pacdora.png'
import baseImgCenter from '../../assets/logoWithName.png'
import slideImg1 from '../../assets/products/1-bg-removed-Pacdora.png'
import slideImg2 from '../../assets/products/2-bg-removed-Pacdora.png'
import slideImg3 from '../../assets/products/3-bg-removed-Pacdora.png'
import slideImg4 from '../../assets/products/4-bg-removed-Pacdora.png'
import slideImg5 from '../../assets/products/5-bg-removed-Pacdora.png'

const slideshowImages = [slideImg1, slideImg2, slideImg3, slideImg4, slideImg5];

// ── Types ─────────────────────────────────────────────────────────────────

interface WalletTransaction {
  id: string;
  currency: string;
  type: 'credit' | 'debit';
  amount: number;
  source: 'pairing' | 'sign5' | 'leadership' | 'admin_adjustment' | 'withdrawal' | 'referral_direct' | 'referral_indirect' | 'spillover';
  note: string;
  postedAt: string;
  createdAt: string;
}

interface IncomeBreakdown {
  totalIncome: number;
  pairingBonus: number;
  repeatBinaryBonus: number;
  sign5Bonus: number;
  leadershipBonus: number;
  directReferralBonus: number;
  indirectReferralBonus: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  recentPayouts: WalletTransaction[];
}

interface WalletBalances {
  php: number;
  points: number;
  gc_points: number;
}

interface ReferralCounts {
  direct: number;
  indirect: number;
  total: number;
}

interface ReferralData {
  rootUser: any;
  counts: ReferralCounts;
  direct: any[];
  indirect: any[];
  all: any[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const formatPhp = (amount: number) =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 2 });

// ── Auth helper ───────────────────────────────────────────────────────────

function getAuthContext() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    const str = localStorage.getItem('user');
    if (str) {
      try {
        const obj = JSON.parse(str);
        userId = obj.id ?? obj._id ?? obj.userId;
      } catch { }
    }
  }
  return { userId };
}


// ── Component ─────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Wallet / income state ────────────────────────────────────────────
  const [income, setIncome] = useState<IncomeBreakdown | null>(null);
  const [incomeLoading, setIncomeLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [genealogyRoot, setGenealogyRoot] = useState<{ leftAvailablePoints: number; rightAvailablePoints: number } | null>(null);

  // ── New dynamic state ────────────────────────────────────────────────
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({ php: 0, points: 0, gc_points: 0 });
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referralLoading, setReferralLoading] = useState(true);
  const [sign5Status, setSign5Status] = useState<{
    bronzeCount: number; silverCount: number;
    goldCount: number; platinumCount: number;
    timesTriggered: { bronze: number; silver: number; gold: number; platinum: number };
    monthCashAmountPhp: number;
  } | null>(null);
  const [sign5StatusLoading, setSign5StatusLoading] = useState(true);

  // ── Pairing cap state ────────────────────────────────────────────────
  const [pairingCap, setPairingCap] = useState<{ capUsed: number; capLimit: number; cycle: string } | null>(null);

  // ── Reset loading states whenever the dashboard tab becomes active or refreshes ──
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setIncomeLoading(true);
    setBalancesLoading(true);
    setReferralLoading(true);
    setSign5StatusLoading(true);
  }, [activeTab, refreshKey]);

  useEffect(() => {
    const id = setInterval(() => setSlideIndex(i => (i + 1) % slideshowImages.length), 3000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch current user + genealogy root ──────────────────────────────
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const fetchCurrentUser = async () => {
      try {
        const { userId } = getAuthContext();
        if (!userId) return;

        const res = await apiFetch(`${API_BASE_URL}/users/me`);
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();
        console.log('current user:', data);
        setCurrentUser(data);

        // Fetch genealogy root for left/right leg points
        try {
          const gRes = await apiFetch(`${API_BASE_URL}/genealogy/root/${userId}`);
          if (gRes.ok) {
            const gData = await gRes.json();
            setGenealogyRoot({
              leftAvailablePoints: gData.leftAvailablePoints ?? 0,
              rightAvailablePoints: gData.rightAvailablePoints ?? 0,
            });
          }
        } catch (gErr) {
          console.error('Genealogy root fetch error:', gErr);
        }
      } catch (err) {
        console.error('User fetch error:', err);
        try {
          const str = localStorage.getItem('user');
          if (str) setCurrentUser(JSON.parse(str));
        } catch { }
      }
    };
    fetchCurrentUser();
  }, [activeTab, refreshKey]);

  // ── Fetch wallet transactions (income) ───────────────────────────────
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const fetchIncome = async () => {
      try {
        const { userId } = getAuthContext();
        if (!userId) {
          console.error('Missing userId — cannot fetch income');
          return;
        }

        // Fetch income summary (server-side aggregation — no limit)
        const [summaryRes, txnRes] = await Promise.all([
          apiFetch(`${API_BASE_URL}/wallet/${userId}/income-summary`),
          apiFetch(`${API_BASE_URL}/wallet/${userId}/transactions?limit=10`),
        ]);

        if (!summaryRes.ok) throw new Error('Failed to fetch income summary');

        const summary = await summaryRes.json();
        const txns: WalletTransaction[] = txnRes.ok ? await txnRes.json() : [];
        const recentPayouts = txns.filter(t => t.currency === 'php' && t.type === 'credit').slice(0, 4);

        setIncome({
          totalIncome: summary.totalIncome ?? 0,
          pairingBonus: summary.pairingBonus ?? 0,
          repeatBinaryBonus: summary.repeatBinaryBonus ?? 0,
          sign5Bonus: summary.sign5Bonus ?? 0,
          leadershipBonus: summary.leadershipBonus ?? 0,
          directReferralBonus: summary.directReferralBonus ?? 0,
          indirectReferralBonus: summary.indirectReferralBonus ?? 0,
          today: summary.today ?? 0,
          thisWeek: summary.thisWeek ?? 0,
          thisMonth: summary.thisMonth ?? 0,
          recentPayouts,
        });
      } catch (err) {
        console.error('Income fetch error:', err);
      } finally {
        setIncomeLoading(false);
      }
    };

    fetchIncome();
  }, [activeTab, refreshKey]);

  // ── Fetch wallet balances (PHP, points, gc_points) ───────────────────
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const fetchBalances = async () => {
      try {
        const { userId } = getAuthContext();
        if (!userId) return;

        const res = await apiFetch(`${API_BASE_URL}/wallet/${userId}/balances`);
        if (!res.ok) throw new Error('Failed to fetch balances');

        const data = await res.json();
        const bal = data.balances ?? {};
        setWalletBalances({
          php: bal.php ?? bal.PHP ?? 0,
          points: bal.points ?? bal.POINTS ?? 0,
          gc_points: bal.gc_points ?? bal.GC_POINTS ?? 0,
        });
      } catch (err) {
        console.error('Balances fetch error:', err);
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchBalances();
  }, [activeTab, refreshKey]);

  // ── Fetch referral data ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const fetchReferrals = async () => {
      try {
        const { userId } = getAuthContext();
        if (!userId) return;

        const res = await apiFetch(`${API_BASE_URL}/genealogy/referrals/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch referrals');

        const data: ReferralData = await res.json();
        setReferralData(data);
      } catch (err) {
        console.error('Referral fetch error:', err);
      } finally {
        setReferralLoading(false);
      }
    };
    fetchReferrals();
  }, [activeTab, refreshKey]);

  // ── Fetch current pairing cap ────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const fetchPairingCap = async () => {
      try {
        const { userId } = getAuthContext();
        if (!userId) return;
        const res = await apiFetch(`${API_BASE_URL}/pairing/current-cap/${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        setPairingCap({ capUsed: data.capUsed, capLimit: data.capLimit, cycle: data.cycle });
      } catch (err) {
        console.error('Pairing cap fetch error:', err);
      }
    };
    fetchPairingCap();
  }, [activeTab, refreshKey]);

  // ── Evaluate + fetch Sign-5 status on dashboard load ────────────────────
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const evaluateAndFetchSign5 = async () => {
      try {
        const { userId } = getAuthContext();
        if (!userId) return;
        const monthKey = new Date().toISOString().slice(0, 7);

        // Always evaluate first — idempotent, only credits what hasn't been paid yet.
        await apiFetch(`${API_BASE_URL}/sign5/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, monthKey }),
        });

        // Now fetch the updated status
        const statusRes = await apiFetch(
          `${API_BASE_URL}/sign5/status/${userId}?monthKey=${monthKey}`,
        );
        if (!statusRes.ok) throw new Error('Failed to fetch sign5 status');
        const data = await statusRes.json();
        if (data.status) {
          // Extract timesTriggered and monthly cash total from awards for each tier
          const timesTriggered = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
          let monthCashAmountPhp = 0;
          for (const award of data.awards ?? []) {
            const tier = award.tier?.toLowerCase();
            if (tier && tier in timesTriggered) {
              timesTriggered[tier as keyof typeof timesTriggered] = award.timesTriggered ?? 0;
            }
            monthCashAmountPhp += award.cashAmountPhp ?? 0;
          }
          setSign5Status({
            bronzeCount: data.status.bronzeCount ?? 0,
            silverCount: data.status.silverCount ?? 0,
            goldCount: data.status.goldCount ?? 0,
            platinumCount: data.status.platinumCount ?? 0,
            timesTriggered,
            monthCashAmountPhp,
          });
        } else {
          // New month — no status record yet means 0 earned this month
          setSign5Status(prev => prev
            ? { ...prev, monthCashAmountPhp: 0 }
            : { bronzeCount: 0, silverCount: 0, goldCount: 0, platinumCount: 0, timesTriggered: { bronze: 0, silver: 0, gold: 0, platinum: 0 }, monthCashAmountPhp: 0 }
          );
        }

        // Re-fetch income summary so the sign5Bonus card reflects the new credit
        const summaryRes = await apiFetch(
          `${API_BASE_URL}/wallet/${userId}/income-summary`,
        );
        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          setIncome(prev => prev ? {
            ...prev,
            totalIncome: summary.totalIncome ?? prev.totalIncome,
            sign5Bonus: summary.sign5Bonus ?? prev.sign5Bonus,
            today: summary.today ?? prev.today,
            thisWeek: summary.thisWeek ?? prev.thisWeek,
            thisMonth: summary.thisMonth ?? prev.thisMonth,
          } : prev);
        }
      } catch (err) {
        console.error('Sign5 evaluate/status error:', err);
      } finally {
        setSign5StatusLoading(false);
      }
    };
    evaluateAndFetchSign5();
  }, [activeTab, refreshKey]);

  // ── Sign-5 progress — uses evaluated sign5 status when available,
  //    falls back to genealogy referral counts before first evaluation ──────
  const sign5Progress: Record<string, number> = useMemo(() => {
    if (sign5Status) {
      return {
        bronze: sign5Status.bronzeCount,
        silver: sign5Status.silverCount,
        gold: sign5Status.goldCount,
        platinum: sign5Status.platinumCount,
      };
    }
    // Fallback: count from genealogy referrals for the current month
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const directRefs = referralData?.direct ?? [];
    const counts: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const ref of directRefs) {
      const joinedMonth = (ref.createdAt ?? '').slice(0, 7);
      if (joinedMonth !== currentMonthKey) continue;
      const t = (ref.membershipTier ?? '').toLowerCase();
      if (t in counts) counts[t]++;
    }
    return counts;
  }, [sign5Status, referralData]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) navigate('/');
  }, [navigate]);

  const TIER_META: Record<string, { label: string; price: string; gradient: string; isFree?: boolean }> = {
    free: { label: 'Free', price: '₱0', gradient: 'from-slate-700 via-slate-600 to-slate-500', isFree: true },
    bronze: { label: 'Bronze', price: '₱1,998', gradient: 'from-amber-700 via-amber-500 to-amber-400' },
    silver: { label: 'Silver', price: '₱5,998', gradient: 'from-gray-500 via-gray-400 to-gray-300' },
    gold: { label: 'Gold', price: '₱8,998', gradient: 'from-yellow-600 via-yellow-400 to-yellow-300' },
    platinum: { label: 'Platinum', price: '₱12,998', gradient: 'from-gray-600 via-gray-400 to-gray-300' },
  };

  const tier = TIER_META[currentUser?.membershipTier?.toLowerCase() ?? ''] ?? TIER_META.free;

  // ── Dynamic profile display ──────────────────────────────────────────
  const displayName = currentUser?.name || currentUser?.username || 'User';
  const displayEmail = currentUser?.email || '';

  const menuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'genealogy', label: 'Genealogy', icon: Network },
    { id: 'referral-hierarchy', label: 'Referral Hierarchy', icon: Lock },
    { id: 'pairing-history', label: 'Pairing History', icon: TrendingUp },
    { id: 'payout-system', label: 'Payout System', icon: Wallet  },
    { id: 'subscription', label: 'Subscription', icon: Leaf, underDevelopment: false },
    { id: 'unilevel-package', label: 'Unilevel Products', icon: Combine },
    { id: 'withdraw-gc', label: 'Withdraw GC', icon: BanknoteArrowDown },
    { id: 'transactions', label: 'Transactions', icon: HandCoins},
    { id: 'viewaccount', label: 'View Account', icon: User, },
    { id: 'stairstep', label: 'Stairstep Program', icon: Trophy },
  ], []);

  // ── Skeleton helper ───────────────────────────────────────────────────
  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className ?? ''}`} />
  );

  // ── Dashboard content ─────────────────────────────────────────────────
  const isRefreshing = incomeLoading || balancesLoading || referralLoading || sign5StatusLoading;

  const renderDashboardContent = () => (
    <div className="space-y-6 pb-6 bg-white">

      {/* ── Refresh bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {isRefreshing ? 'Updating...' : `Last updated: ${new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
        </p>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── Total Income Card ─────────────────────────────────────────── */}
      <div className="relative bg-black rounded-3xl shadow-2xl overflow-hidden border border-yellow-500/20">

        {/* ── Mobile layout (< md): stacked ── */}
        <div className="flex flex-col md:hidden">

          {/* Top: income content */}
          <div className="p-6 flex flex-col relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500/70 mb-1">Total Income</p>
            {incomeLoading ? (
              <div className="h-10 w-44 bg-yellow-500/10 animate-pulse rounded-xl mb-4" />
            ) : (
              <p className="text-3xl font-bold text-yellow-400 mb-4 tracking-tight" style={{ textShadow: '0 0 40px rgba(234,179,8,0.4)' }}>
                ₱{formatPhp(income?.totalIncome ?? 0)}
              </p>
            )}

            {/* Today / Week / Month — wraps on very small screens */}
            <div className="flex flex-wrap gap-x-4 gap-y-3">
              {[
                { label: 'Today', value: income?.today ?? 0, cls: 'text-white/80' },
                { label: 'This Week', value: income?.thisWeek ?? 0, cls: 'text-yellow-300' },
                { label: 'This Month', value: income?.thisMonth ?? 0, cls: 'text-yellow-400' },
              ].map(({ label, value, cls }, i, arr) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-yellow-500/50 mb-1">{label}</span>
                    {incomeLoading
                      ? <div className="h-5 w-20 bg-yellow-500/10 animate-pulse rounded" />
                      : <span className={`text-base font-semibold ${cls}`}>₱{formatPhp(value)}</span>
                    }
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-10 bg-yellow-500/20 self-center" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom: user info + decorative image side by side */}
          <div className="flex items-end justify-between border-t border-yellow-500/10 relative overflow-hidden" style={{ minHeight: '120px' }}>
            {/* User info */}
            <div className="flex flex-col gap-1 p-6 z-10">
              <span className="text-base font-semibold text-white">{displayName}</span>
              <span className="text-xs text-white/50 break-all">{displayEmail}</span>
              <span className="text-xs text-yellow-400 font-medium">www.coprofit-global.com</span>
            </div>
            {/* Decorative mascot — faded, flush bottom-right */}
            <img
              src={baseImg}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '110px',
                height: '140px',
                objectFit: 'cover',
                objectPosition: 'top',
                opacity: 0.35,
                maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              }}
            />
          </div>
        </div>

        {/* ── Intermediate layout (md–lg): compact horizontal ── */}
        <div className="hidden md:flex lg:hidden items-stretch" style={{ minHeight: '180px' }}>

          {/* Left: Income Content */}
          <div className="flex-1 min-w-0 p-5 flex flex-col justify-center relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500/70 mb-1">Total Income</p>
            {incomeLoading ? (
              <div className="h-9 w-40 bg-yellow-500/10 animate-pulse rounded-xl mb-3" />
            ) : (
              <p className="text-3xl font-bold text-yellow-400 mb-3 tracking-tight" style={{ textShadow: '0 0 40px rgba(234,179,8,0.4)' }}>
                ₱{formatPhp(income?.totalIncome ?? 0)}
              </p>
            )}

            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {[
                { label: 'Today', value: income?.today ?? 0, cls: 'text-white/80' },
                { label: 'This Week', value: income?.thisWeek ?? 0, cls: 'text-yellow-300' },
                { label: 'This Month', value: income?.thisMonth ?? 0, cls: 'text-yellow-400' },
              ].map(({ label, value, cls }, i, arr) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-yellow-500/50 mb-1">{label}</span>
                    {incomeLoading
                      ? <div className="h-5 w-16 bg-yellow-500/10 animate-pulse rounded" />
                      : <span className={`text-sm font-semibold ${cls}`}>₱{formatPhp(value)}</span>
                    }
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-8 bg-yellow-500/20 self-center" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Right: User Info */}
          <div className="flex flex-col items-start justify-center gap-1 px-5 border-l border-yellow-500/15 relative z-10 shrink-0">
            <span className="text-base font-semibold text-white truncate max-w-35">{displayName}</span>
            <span className="text-xs text-white/50 truncate max-w-35">{displayEmail}</span>
            <span className="text-xs text-yellow-400 font-medium">www.coprofit-global.com</span>
          </div>

          {/* Right: Mascot image — smaller, flush to bottom */}
          <div className="relative shrink-0 self-end z-10 overflow-hidden" style={{ width: '130px', height: '180px' }}>
            <img
              src={baseImg}
              alt="Profile Right"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 10,
                width: '130px',
                height: '170px',
                objectFit: 'cover',
                objectPosition: 'top',
                filter: 'drop-shadow(0 8px 40px rgba(234,179,8,0.35))',
                maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
              }}
            />
          </div>
        </div>

        {/* ── Desktop layout (≥ lg): original horizontal ── */}
        <div className="hidden lg:flex items-stretch" style={{ minHeight: '220px' }}>

          {/* Left: Income Content */}
          <div className="flex-1 p-8 flex flex-col justify-center relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500/70 mb-1">Total Income</p>
            {incomeLoading ? (
              <div className="h-12 w-52 bg-yellow-500/10 animate-pulse rounded-xl mb-4" />
            ) : (
              <p className="text-4xl font-bold text-yellow-400 mb-4 tracking-tight" style={{ textShadow: '0 0 40px rgba(234,179,8,0.4)' }}>
                ₱{formatPhp(income?.totalIncome ?? 0)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-yellow-500/50 mb-1">Today</span>
                {incomeLoading
                  ? <div className="h-6 w-24 bg-yellow-500/10 animate-pulse rounded" />
                  : <span className="text-base xl:text-xl font-semibold text-white/80">₱{formatPhp(income?.today ?? 0)}</span>
                }
              </div>
              <div className="w-px h-10 bg-yellow-500/20" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-yellow-500/50 mb-1">This Week</span>
                {incomeLoading
                  ? <div className="h-6 w-24 bg-yellow-500/10 animate-pulse rounded" />
                  : <span className="text-base xl:text-xl font-semibold text-yellow-300">₱{formatPhp(income?.thisWeek ?? 0)}</span>
                }
              </div>
              <div className="w-px h-10 bg-yellow-500/20" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-yellow-500/50 mb-1">This Month</span>
                {incomeLoading
                  ? <div className="h-6 w-24 bg-yellow-500/10 animate-pulse rounded" />
                  : <span className="text-base xl:text-xl font-semibold text-yellow-400">₱{formatPhp(income?.thisMonth ?? 0)}</span>
                }
              </div>
            </div>
          </div>

          {/* Center: Logo image — flush to bottom, only at xl+ */}
          <div className="hidden xl:flex relative shrink-0 self-end z-10 items-end justify-center" style={{ width: '200px', height: '220px' }}>
            <img
              src={baseImgCenter}
              alt="Profile Center"
              style={{
                position: 'absolute',
                top: 1,
                bottom: 0,
                right: 90,
                width: '200px',
                height: '250px',
                objectFit: 'cover',
                objectPosition: 'top',
              }}
            />
          </div>

          {/* Right: User Info */}
          <div className="flex flex-col items-start justify-center gap-2 px-4 xl:px-8 border-l border-yellow-500/15 relative z-10 min-w-0 shrink-0 max-w-40 xl:max-w-none">
            <span className="text-lg xl:text-xl font-semibold text-white truncate w-full">{displayName}</span>
            <span className="text-xs xl:text-sm text-white/50 truncate w-full">{displayEmail}</span>
            <span className="text-xs xl:text-sm text-yellow-400 font-medium">www.coprofit-global.com</span>
          </div>

          {/* Right: Product slideshow — large, flush to bottom */}
          <div className="relative shrink-0 self-end z-10 overflow-hidden" style={{ width: '160px', height: '220px' }}>
            {slideshowImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Product ${i + 1}`}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '160px',
                  height: '220px',
                  objectFit: 'cover',
                  objectPosition: 'top',
                  filter: 'drop-shadow(0 8px 40px rgba(234,179,8,0.35))',
                  maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                  opacity: i === slideIndex ? 1 : 0,
                  transition: 'opacity 0.8s ease-in-out',
                }}
              />
            ))}
          </div>

        </div>
      </div>

      {/* ── Income Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Pairing Bonus (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl text-gray-900 mb-2">
              ₱{formatPhp(income?.pairingBonus ?? 0)}
            </p>
          }
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Sign-5 Bonus This Month (PHP)</h3>
          {sign5StatusLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl text-gray-900 mb-2">
              ₱{formatPhp(sign5Status?.monthCashAmountPhp ?? 0)}
            </p>
          }
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Leadership Bonus (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl text-gray-900 mb-2">
              ₱{formatPhp(income?.leadershipBonus ?? 0)}
            </p>
          }
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Direct Referrals (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl text-gray-900 mb-2">
              ₱{formatPhp(income?.directReferralBonus ?? 0)}
            </p>
          }
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Indirect Referrals (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl text-gray-900 mb-2">
              ₱{formatPhp(income?.indirectReferralBonus ?? 0)}
            </p>
          }
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Repeat Binary Bonus (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl text-gray-900 mb-2">
              ₱{formatPhp(income?.repeatBinaryBonus ?? 0)}
            </p>
          }
        </div>

        {[
          'Total Income of Stairstep Bonus (PHP)',
        ].map((label) => (
          <div key={label} className="relative bg-white rounded-2xl p-6 border border-amber-100 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">{label}</h3>
              <span className="shrink-0 ml-2 flex items-center gap-1 text-xs font-semibold tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                🚧 Under Development
              </span>
            </div>
            <p className="text-3xl text-gray-900 mb-2">₱0.00</p>
          </div>
        ))}

        {[
          { label: 'Total Income of Royalty Bonus (PHP)', value: '₱0.00' },
          { label: 'Total Income of Unilevel Bonus (Points Value = 1 PHP)', value: '0 PV' },
        ].map(({ label, value }) => (
          <div key={label} className="relative bg-white rounded-2xl p-6 border border-amber-100 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">{label}</h3>
              <span className="shrink-0 ml-2 flex items-center gap-1 text-xs font-semibold tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                🚧 Under Development
              </span>
            </div>
            <p className="text-3xl text-gray-900 mb-2">{value}</p>
          </div>
        ))}

      </div>

      {/* ── Current Package ───────────────────────────────────────────── */}
      {tier.isFree ? (
        /* ── Free Tier Design ── */
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-dashed border-slate-300 bg-white">
          {/* Subtle dot-grid background */}
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

              {/* Left — free tier info */}
              <div className="flex items-center gap-5">
                {/* Lock / free badge icon */}
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Current Package</p>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-3xl sm:text-4xl font-semibold text-slate-700 leading-none">Free</p>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">No Package</span>
                  </div>
                  <p className="text-sm text-slate-400">You haven't subscribed to a package yet.</p>
                </div>
              </div>

              {/* Right — subscribe CTA */}
              <div className="flex flex-col items-start sm:items-end gap-3">
                <button
                  onClick={() => setActiveTab('subscription')}
                  className="group relative px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-medium shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all active:scale-95 whitespace-nowrap overflow-hidden"
                >
                  {/* shimmer sweep */}
                  <span className="absolute inset-0 -skew-x-12 translate-x-[-120%] group-hover:translate-x-[150%] transition-transform duration-700 bg-white/10 w-1/2" />
                  <span className="relative flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Get Started
                  </span>
                </button>
                <p className="text-xs text-slate-400">Start with Bronze at <span className="font-semibold text-slate-600">₱1,998</span></p>
              </div>

            </div>

            {/* Benefits teaser strip */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Unlock with a Package</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: '🤝', label: 'Pairing Bonus' },
                  { icon: '✍️', label: 'Sign-5 Bonus' },
                  { icon: '👑', label: 'Leadership Bonus' },
                  { icon: '💰', label: 'Referral Income' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-base grayscale opacity-50">{icon}</span>
                    <span className="text-xs text-slate-400 font-medium leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier path — all locked */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {(['Bronze', 'Silver', 'Gold', 'Platinum'] as const).map((t) => (
                <div key={t} className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl opacity-40 border border-dashed border-slate-200 bg-slate-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs text-slate-500">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Paid Tier Design (original) ── */
        <div className={`relative bg-linear-to-br ${tier.gradient} rounded-3xl overflow-hidden border border-white/20 shadow-xl`}>
          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

              {/* Left — tier info */}
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/70 mb-1">Current Package</p>
                  <p className="text-3xl sm:text-4xl text-white drop-shadow-sm leading-none mb-2">
                    {tier.label}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Package Value</span>
                    <span className="h-3 w-px bg-white/30" />
                    <span className="text-lg text-white/95">{tier.price}</span>
                  </div>
                </div>
              </div>

              {/* Right — upgrade CTA */}
              <div className="flex flex-col items-start sm:items-end gap-2">
                <button
                  onClick={() => setActiveTab('subscription')}
                  className="px-6 py-3 rounded-2xl bg-white text-gray-900 text-sm shadow-lg hover:bg-white/90 hover:shadow-xl transition-all active:scale-95 whitespace-nowrap"
                >
                  Upgrade Subscription
                </button>
                <p className="text-xs text-white">Unlock higher rewards with a bigger package</p>
              </div>

            </div>

            {/* tier progress strip */}
            <div className="mt-6 pt-5 border-t border-white/20 grid grid-cols-4 gap-2">
              {(['Bronze', 'Silver', 'Gold', 'Platinum'] as const).map((t) => {
                const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
                const currentIdx = tiers.indexOf(tier.label);
                const thisIdx = tiers.indexOf(t);
                const isActive = t === tier.label;
                const isPast = thisIdx < currentIdx;
                return (
                  <div key={t} className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all
                    ${isActive ? 'bg-white/30 border border-white/60' : isPast ? 'opacity-80' : 'opacity-50'}`}>
                    <span className={`text-xs drop-shadow ${isActive ? 'text-white' : 'text-white'}`}>{t}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Referral Stats & Genealogy ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Genealogy — live data */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Genealogy</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Left Leg</p>
              <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-3xl font-bold text-blue-700">{genealogyRoot?.leftAvailablePoints ?? 0}</p>
                <p className="text-xs text-blue-500 mt-1">available points</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Right Leg</p>
              <div className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                <p className="text-3xl font-bold text-purple-700">{genealogyRoot?.rightAvailablePoints ?? 0}</p>
                <p className="text-xs text-purple-500 mt-1">available points</p>
              </div>
            </div>
          </div>

          {/* ── Referral counts — dynamic from /genealogy/referrals ── */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Referral Counts</p>
            {referralLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{referralData?.counts.direct ?? 0}</p>
                  <p className="text-xs text-gray-500">Direct</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{referralData?.counts.indirect ?? 0}</p>
                  <p className="text-xs text-gray-500">Indirect</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{referralData?.counts.total ?? 0}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pairing Bonus — dynamic total from wallet transactions */}
        <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pairing Bonus</h3>

          </div>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm font-medium text-amber-900 mb-1">Real-time Pairing</p>
              <p className="text-xs text-amber-700">Pairs automatically when both legs have points</p>
            </div>
            {/* Pairing cap progress */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {pairingCap ? `${pairingCap.cycle} Cycle Cap` : 'Cycle Cap'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    {pairingCap ? `${pairingCap.capUsed} / ${pairingCap.capLimit}` : '0 / —'}
                  </p>
                </div>
                {pairingCap && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pairingCap.capUsed >= pairingCap.capLimit ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                    {pairingCap.capUsed >= pairingCap.capLimit ? 'Exhausted' : `${pairingCap.capLimit - pairingCap.capUsed} left`}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${pairingCap && pairingCap.capUsed >= pairingCap.capLimit ? 'bg-red-400' : 'bg-amber-400'}`}
                  style={{ width: pairingCap ? `${Math.min((pairingCap.capUsed / pairingCap.capLimit) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700">Total Earned</p>
              {incomeLoading
                ? <Skeleton className="h-8 w-24" />
                : <span className="text-2xl text-gray-900">
                  ₱{formatPhp(income?.pairingBonus ?? 0)}
                </span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Sign-5 Progress — dynamic from referral data ──────────────── */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sign-5 Progress</h3>
            <span className="text-xs text-gray-400">{new Date().toLocaleString('en-PH', { month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="space-y-4">
            {(sign5StatusLoading || referralLoading) ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              [
                { name: 'Bronze', key: 'bronze', color: 'bg-amber-500' },
                { name: 'Silver', key: 'silver', color: 'bg-gray-400' },
                { name: 'Gold', key: 'gold', color: 'bg-yellow-500' },
                { name: 'Platinum', key: 'platinum', color: 'bg-slate-500' },
              ].map(({ name, key, color }) => {
                const count = sign5Progress[key] ?? 0;
                const timesTriggered = sign5Status?.timesTriggered?.[key as keyof NonNullable<typeof sign5Status>['timesTriggered']] ?? 0;
                const TARGET = 5;
                const isExceeding = count >= TARGET;
                const pct = Math.min((count / TARGET) * 100, 100);
                const barColor = isExceeding ? 'bg-green-500' : color;
                return (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{name}</span>
                      <span className={`text-xs font-semibold tabular-nums ${isExceeding ? 'text-green-600' : 'text-gray-500'}`}>
                        {count} / {TARGET}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    {timesTriggered > 0 && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                          {timesTriggered}× Completed
                        </div>
                        <span className="text-[10px] text-green-600 font-medium">this month</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Gift Certificates & Unilevel PV ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gift Certificates — dynamic from wallet gc_points balance */}
        <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Gift Certificates (GC)</h3>
          </div>
          <div className="p-4 bg-linear-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-700 mb-1">Total Earned</p>
                {balancesLoading
                  ? <Skeleton className="h-10 w-16" />
                  : <p className="text-4xl font-bold text-rose-900">{walletBalances.gc_points}</p>
                }
              </div>
              <Gift className="w-12 h-12 text-rose-300" />
            </div>
            <p className="text-xs text-rose-600 mt-3">1 GC per 5 paired points</p>
          </div>
        </div>

        {/* Unilevel PV — dynamic from wallet points balance */}
        <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Unilevel PV</h3>
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">🚧 Under Development</span>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-medium text-indigo-900">Current PV</p>
                {balancesLoading
                  ? <Skeleton className="h-8 w-24" />
                  : <p className="text-3xl font-bold text-indigo-900">{formatPhp(walletBalances.points)}</p>
                }
              </div>
              <p className="text-xs text-indigo-600">Resets every month</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">Requirements</p>
                  <p className="text-xs text-amber-700">Must buy products at least once per month</p>
                  <p className="text-xs text-amber-700 font-semibold mt-1">Deadline: 15th of each month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    const contents: Record<string, React.ReactElement> = {
      'genealogy': <Genealogy />,
      'pairing-history': <Pairing />,
      'payout-system': <Payout />,
      'referral-hierarchy': <ReferalsHierarchy />,
      'withdraw-gc': <WithdrawGC />,
      'subscription': <Subscription />,
      'unilevel-package': <UnilevelProducts />,
      'transactions': <Transactions />,
      'viewaccount': <ViewMyAccount />,
      'stairstep': <StairstepProgram />,
    };
    return contents[activeTab] || <div />;
  };

  const handleLogout = logout;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 bg-white text-gray-900 transition-all duration-300 ease-in-out z-40 ${
        sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
      } overflow-hidden border-r border-gray-100 shrink-0`}>
        <div className="flex flex-col h-full">
          <div className={`border-b border-gray-100 flex items-center justify-between transition-all duration-300 ${sidebarOpen ? 'p-6 min-w-[256px]' : 'p-3 min-w-0 lg:justify-center'}`}>
            {/* Title fades + slides in when open; collapses to zero width when closed so button stays centred */}
            <h1
              className={`text-xl text-gray-900 whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${
                sidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-3 w-0'
              }`}
            >
              CoProfitGlobal.
            </h1>
            {/* Desktop: chevron toggle. Mobile: X close button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {/* Show X on mobile when open, chevron on desktop always */}
              <span className="lg:hidden">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <span className="hidden lg:block">
                <ChevronLeft className={`w-5 h-5 text-gray-600 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 min-w-[256px] lg:min-w-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'dashboard') setRefreshKey(k => k + 1);
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    } ${sidebarOpen ? 'justify-start' : 'justify-center lg:justify-center'}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span
                    className={`text-sm flex-1 text-left whitespace-nowrap transition-all duration-300 ease-in-out ${
                      sidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.underDevelopment && sidebarOpen && (
                    <span className="relative group/tooltip ml-auto shrink-0">
                      <Construction className="w-4 h-4 text-amber-500" />
                      <span className={`
                        pointer-events-none absolute z-50 bottom-full mb-2
                        ${sidebarOpen ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                        w-52 rounded-xl bg-gray-900 text-white text-xs px-3 py-2.5 shadow-xl
                        opacity-0 group-hover/tooltip:opacity-100
                        translate-y-1 group-hover/tooltip:translate-y-0
                        transition-all duration-200
                        before:content-[''] before:absolute before:top-full
                        ${sidebarOpen
                          ? 'before:right-2 before:border-l-transparent before:border-r-transparent'
                          : 'before:left-1/2 before:-translate-x-1/2 before:border-l-transparent before:border-r-transparent'
                        }
                        before:border-4 before:border-t-gray-900 before:border-b-transparent
                      `}>
                        <span className="flex items-center gap-1.5 mb-1 font-semibold text-amber-400">
                          🚧 Under Development
                        </span>
                        <span className="text-gray-300 leading-snug">
                          This tab is still under development! Sit back, relax, and stay tuned, awesome things are coming your way. 🎉
                        </span>
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-gray-100 p-4 space-y-3 min-w-[256px] lg:min-w-0">
        
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm">
                <LogOut className="w-4 h-4 shrink-0" />
                <span
                  className={`whitespace-nowrap transition-all duration-300 ease-in-out ${
                    sidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
                  }`}
                >
                  Logout
                </span>
              </button>
            {/* Copyright Footer */}
            <div className="px-4 py-2.5 bg-transparent text-center overflow-hidden">
              <p
                className={`text-[12px] text-gray-400 text-center leading-relaxed whitespace-nowrap transition-all duration-300 ease-in-out ${
                  sidebarOpen ? 'opacity-100' : 'opacity-0'
                }`}
              >
                v1.0.1 &nbsp;·&nbsp; © 2026 CoProfitGlobal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar with burger icon */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
            aria-label="Open menu"
          >
            {/* Burger icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Active section label */}
          <span className="text-sm font-medium text-gray-700 truncate">
            {menuItems.find(m => m.id === activeTab)?.label ?? 'Dashboard'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'dashboard' ? renderDashboardContent() : renderTabContent()}
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}