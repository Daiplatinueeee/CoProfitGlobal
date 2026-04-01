import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, TrendingUp, Gift, Lock, Wallet, ShoppingBag,
  Network, Download, AlertCircle, LogOut, ChevronLeft, Construction,
} from 'lucide-react';

import Genealogy from '../tabs/Genealogy';
import Pairing from '../tabs/Pairing'
import Payout from '../tabs/Payout';
import Subscription from '../tabs/Subscription';
import ReferalsHierarchy from '../tabs/ReferalsHierarchy';
import WithdrawGC from '../tabs/WithdrawGC';
import UnilevelProducts from '../tabs/UnilevelProducts';
import PayoutHistory from '../tabs/PayoutHistory'

// ── Types ─────────────────────────────────────────────────────────────────

interface WalletTransaction {
  id: string;
  currency: string;
  type: 'credit' | 'debit';
  amount: number;
  source: 'pairing' | 'sign5' | 'leadership' | 'admin_adjustment' | 'withdrawal';
  note: string;
  postedAt: string;
  createdAt: string;
}

interface IncomeBreakdown {
  totalIncome: number;
  pairingBonus: number;
  sign5Bonus: number;
  leadershipBonus: number;
  recentPayouts: WalletTransaction[];
  transactions: WalletTransaction[];
}

interface WalletBalances {
  php: number;
  points: number;
  gc_points: number;
}

interface ReferralCounts {
  direct: number;
  indirect: number;
  spillover: number;
  total: number;
}

interface ReferralData {
  rootUser: any;
  counts: ReferralCounts;
  direct: any[];
  indirect: any[];
  spillover: any[];
  all: any[];
}

const API_BASE_URL = 'http://localhost:3000';

const formatPhp = (amount: number) =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 2 });

// ── Auth helper ───────────────────────────────────────────────────────────

function getAuthContext() {
  const token = localStorage.getItem('accessToken');
  let userId = localStorage.getItem('userId');
  if (!userId) {
    const str = localStorage.getItem('user');
    if (str) {
      try {
        const obj = JSON.parse(str);
        userId = obj.id ?? obj._id ?? obj.userId;
      } catch {}
    }
  }
  return { token, userId };
}

// ── Period income helpers ─────────────────────────────────────────────────

function sumCredits(transactions: WalletTransaction[], from: Date) {
  return transactions
    .filter(t => t.type === 'credit' && new Date(t.postedAt) >= from)
    .reduce((acc, t) => acc + t.amount, 0);
}

function getPeriodIncome(transactions: WalletTransaction[]) {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    today: sumCredits(transactions, startOfToday),
    thisWeek: sumCredits(transactions, startOfWeek),
    thisMonth: sumCredits(transactions, startOfMonth),
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setProfileModalOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const navigate = useNavigate();

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

  // ── Fetch current user + genealogy root ──────────────────────────────
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { token, userId } = getAuthContext();
        if (!token || !userId) return;

        const res = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();
        console.log('current user:', data);
        setCurrentUser(data);

        // Fetch genealogy root for left/right leg points
        try {
          const gRes = await fetch(`${API_BASE_URL}/genealogy/root/${userId}`, {
            headers: { 'Content-Type': 'application/json' },
          });
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
  }, []);

  // ── Fetch wallet transactions (income) ───────────────────────────────
  useEffect(() => {
    const fetchIncome = async () => {
      try {
        const { token, userId } = getAuthContext();
        if (!token || !userId) {
          console.error('Missing token or userId — cannot fetch income');
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/wallet/${userId}/transactions?limit=200`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!res.ok) throw new Error('Failed to fetch transactions');

        const txns: WalletTransaction[] = await res.json();

        const phpCredits = txns.filter(
          (t) => t.currency === 'php' && t.type === 'credit',
        );

        const sum = (source: WalletTransaction['source']) =>
          phpCredits
            .filter((t) => t.source === source)
            .reduce((acc, t) => acc + t.amount, 0);

        const pairingBonus = sum('pairing');
        const sign5Bonus = sum('sign5');
        const leadershipBonus = sum('leadership');
        const totalIncome = pairingBonus + sign5Bonus + leadershipBonus;

        const recentPayouts = phpCredits.slice(0, 4);

        setIncome({
          totalIncome,
          pairingBonus,
          sign5Bonus,
          leadershipBonus,
          recentPayouts,
          transactions: phpCredits,
        });
      } catch (err) {
        console.error('Income fetch error:', err);
      } finally {
        setIncomeLoading(false);
      }
    };

    fetchIncome();
  }, []);

  // ── Fetch wallet balances (PHP, points, gc_points) ───────────────────
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const { token, userId } = getAuthContext();
        if (!token || !userId) return;

        const res = await fetch(
          `${API_BASE_URL}/wallet/${userId}/balances`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error('Failed to fetch balances');

        const data = await res.json();
        const bal = data.balances ?? {};
        setWalletBalances({
          php:       bal.php       ?? bal.PHP       ?? 0,
          points:    bal.points    ?? bal.POINTS    ?? 0,
          gc_points: bal.gc_points ?? bal.GC_POINTS ?? 0,
        });
      } catch (err) {
        console.error('Balances fetch error:', err);
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchBalances();
  }, []);

  // ── Fetch referral data ──────────────────────────────────────────────
  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const { token, userId } = getAuthContext();
        if (!token || !userId) return;

        const res = await fetch(
          `${API_BASE_URL}/genealogy/referrals/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
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
  }, []);

  // ── Period income (Today / This Week / This Month) ───────────────────
  const periodIncome = useMemo(
    () => getPeriodIncome(income?.transactions ?? []),
    [income],
  );

  // ── Sign-5 progress: count direct referrals by tier for current month only ──
  const sign5Progress = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const directRefs = referralData?.direct ?? [];
    const tierCounts: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const ref of directRefs) {
      const joinedMonth = (ref.createdAt ?? '').slice(0, 7);
      if (joinedMonth !== currentMonthKey) continue;
      const t = (ref.membershipTier ?? '').toLowerCase();
      if (t in tierCounts) tierCounts[t]++;
    }
    return tierCounts;
  }, [referralData]);

  // ── Existing effects ─────────────────────────────────────────────────
  useEffect(() => {
    const hasDisabledModal = localStorage.getItem('disableWelcomeModal');
    if (!hasDisabledModal) setShowWelcomeModal(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) navigate('/');
  }, [navigate]);

  const handleCloseWelcomeModal = () => {
    if (dontShowAgain) localStorage.setItem('disableWelcomeModal', 'true');
    setShowWelcomeModal(false);
  };

  const TIER_META: Record<string, { label: string; price: string; gradient: string }> = {
    bronze: { label: 'Bronze', price: '₱1,998', gradient: 'from-amber-700 via-amber-500 to-amber-400' },
    silver: { label: 'Silver', price: '₱5,998', gradient: 'from-gray-500 via-gray-400 to-gray-300' },
    gold: { label: 'Gold', price: '₱8,998', gradient: 'from-yellow-600 via-yellow-400 to-yellow-300' },
    platinum: { label: 'Platinum', price: '₱12,998', gradient: 'from-gray-600 via-gray-400 to-gray-300' },
  };

  const tier = TIER_META[currentUser?.membershipTier?.toLowerCase() ?? ''] ?? TIER_META.bronze;

  // ── Dynamic profile display ──────────────────────────────────────────
  const displayName = currentUser?.name || currentUser?.username || 'User';
  const displayEmail = currentUser?.email || '';
  const profileInitials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const menuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'genealogy', label: 'Genealogy', icon: Network },
    { id: 'referal-hierarchy', label: 'Referal Hierarchy', icon: Lock },
    { id: 'pairing-history', label: 'Pairing History', icon: TrendingUp },
    { id: 'payout-system', label: 'Payout System', icon: Wallet, underDevelopment: true },
    { id: 'subscription', label: 'Subscription', icon: ShoppingBag, underDevelopment: true },
    { id: 'unilevel-package', label: 'Unilevel Products', icon: Download, underDevelopment: true },
    { id: 'withdraw-gc', label: 'Withdraw GC', icon: Download, underDevelopment: true },
    { id: 'payout-history', label: 'Payout History', icon: Download, underDevelopment: true },
  ], []);

  // ── Skeleton helper ───────────────────────────────────────────────────
  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className ?? ''}`} />
  );

  // ── Dashboard content ─────────────────────────────────────────────────
  const renderDashboardContent = () => (
    <div className="space-y-6 pb-6 bg-white">

      {/* ── Total Income Card ─────────────────────────────────────────── */}
      <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100 shadow-lg">
        <p className="text-sm font-medium text-blue-600 mb-2">Total Income</p>

        {incomeLoading ? (
          <Skeleton className="h-9 w-52 mb-4" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 mb-4">
            ₱{formatPhp(income?.totalIncome ?? 0)}
          </p>
        )}

        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">Today</span>
            {incomeLoading
              ? <Skeleton className="h-7 w-28" />
              : <span className="text-2xl font-semibold text-gray-900">
                ₱{formatPhp(periodIncome.today)}
              </span>
            }
          </div>
          <div className="w-px h-12 bg-blue-200" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">This Week</span>
            {incomeLoading
              ? <Skeleton className="h-7 w-28" />
              : <span className="text-2xl font-semibold text-blue-600">
                ₱{formatPhp(periodIncome.thisWeek)}
              </span>
            }
          </div>
          <div className="w-px h-12 bg-blue-200" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">This Month</span>
            {incomeLoading
              ? <Skeleton className="h-7 w-28" />
              : <span className="text-2xl font-semibold text-indigo-600">
                ₱{formatPhp(periodIncome.thisMonth)}
              </span>
            }
          </div>
        </div>
      </div>

      {/* ── Income Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Pairing Bonus (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl font-bold text-gray-900 mb-2">
              ₱{formatPhp(income?.pairingBonus ?? 0)}
            </p>
          }
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Sign-5 Bonus (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl font-bold text-gray-900 mb-2">
              ₱{formatPhp(income?.sign5Bonus ?? 0)}
            </p>
          }
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Leadership Bonus (PHP)</h3>
          {incomeLoading
            ? <Skeleton className="h-9 w-32 mb-2" />
            : <p className="text-3xl font-bold text-gray-900 mb-2">
              ₱{formatPhp(income?.leadershipBonus ?? 0)}
            </p>
          }
        </div>

        {[
          'Total Income of Direct Referrals (PHP)',
          'Total Income of Indirect Referrals (PHP)',
          'Total Income of Sales Match Bonus (PHP)',
          'Total Income of Repeat Binary Bonus (PHP)',
          'Total Income of Stairstep Bonus (PHP)',
        ].map((label) => (
          <div key={label} className="relative bg-white rounded-2xl p-6 border border-amber-100 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">{label}</h3>
              <span className="shrink-0 ml-2 flex items-center gap-1 text-xs font-semibold tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                🚧 Under Development
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
          </div>
        ))}

        {[
          { label: 'Total Income of Royalty Bonus (PHP)', value: '₱0.00' },
          { label: 'Total Income of Unilevel Bonus (Points Value = 1 PHP)', value: '0 PV - ₱0.00' },
        ].map(({ label, value }) => (
          <div key={label} className="relative bg-white rounded-2xl p-6 border border-amber-100 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">{label}</h3>
              <span className="shrink-0 ml-2 flex items-center gap-1 text-xs font-semibold tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                🚧 Under Development
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          </div>
        ))}

      </div>

      {/* ── Current Package ───────────────────────────────────────────── */}
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
                  <p className="text-lg font-bold text-gray-800">{referralData?.counts.spillover ?? 0}</p>
                  <p className="text-xs text-gray-500">Spillover</p>
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
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700">Total Earned</p>
              {incomeLoading
                ? <Skeleton className="h-8 w-24" />
                : <span className="text-2xl font-bold text-gray-900">
                    ₱{formatPhp(income?.pairingBonus ?? 0)}
                  </span>
              }
            </div>
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
            <p className="text-xs text-rose-600 mt-3">1 GC per 5 pairs</p>
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

      {/* ── Sign-5 Progress — dynamic from referral data ──────────────── */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sign-5 Progress</h3>
            <span className="text-xs text-gray-400">{new Date().toLocaleString('en-PH', { month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="space-y-3">
            {referralLoading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              [
                { name: 'Bronze',   key: 'bronze',   color: 'bg-amber-500' },
                { name: 'Silver',   key: 'silver',   color: 'bg-gray-400' },
                { name: 'Gold',     key: 'gold',     color: 'bg-yellow-500' },
                { name: 'Platinum', key: 'platinum',  color: 'bg-slate-500' },
              ].map(({ name, key, color }) => {
                const count = sign5Progress[key] ?? 0;
                const TARGET = 5;
                const pct = Math.min((count / TARGET) * 100, 100);
                return (
                  <div key={name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{name}</span>
                      <span className="text-xs text-gray-400">{count} / {TARGET}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    const contents: Record<string, React.ReactElement> = {
      genealogy: <Genealogy />,
      'pairing-history': <Pairing />,
      'payout-system': <Payout />,
      'referal-hierarchy': <ReferalsHierarchy />,
      'withdraw-gc': <WithdrawGC />,
      subscription: <Subscription />,
      'unilevel-package': <UnilevelProducts />,
      'payout-history': <PayoutHistory />,
    };
    return contents[activeTab] || <div />;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl text-gray-900 mb-2">Welcome!</h2>
            </div>
            <p className="text-gray-700 text-center mb-6 leading-relaxed">
              Thank you for joining CoProfitGlobal! We're grateful to have you as part of our community.
              Your success is our mission, and we're here to support you every step of the way.
            </p>
            <div className="flex items-center gap-3 mb-6 bg-gray-50 p-4 rounded-lg">
              <input
                type="checkbox" id="dontShowAgain" checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="dontShowAgain" className="text-sm text-gray-700 cursor-pointer">
                Do not show this message again
              </label>
            </div>
            <button
              onClick={handleCloseWelcomeModal}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 bg-white text-gray-900 sidebar-smooth z-40 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } overflow-hidden border-r border-gray-100`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h1 className={`text-xl text-gray-900 ${sidebarOpen ? 'block' : 'hidden'}`}>CoProfitGlobal.</h1>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft className={`w-5 h-5 text-gray-600 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    } ${sidebarOpen ? 'justify-start' : 'justify-center lg:justify-center'}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="text-sm flex-1 text-left">{item.label}</span>}
                  {item.underDevelopment && (
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

          <div className={`border-t border-gray-100 p-4 space-y-3 ${sidebarOpen ? 'block' : 'hidden lg:flex lg:flex-col'}`}>
            <button
              onClick={() => setProfileModalOpen(true)}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition active:bg-gray-100 ${sidebarOpen ? 'w-full' : 'w-full lg:justify-center'}`}
            >
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-yellow-500">{profileInitials}</span>
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                </div>
              )}
            </button>
            {sidebarOpen ? (
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            ) : (
              <button onClick={handleLogout} className="w-full flex items-center justify-center p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' ? renderDashboardContent() : renderTabContent()}
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}