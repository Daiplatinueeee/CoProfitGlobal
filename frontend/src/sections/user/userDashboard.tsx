import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, TrendingUp, Gift, Lock, Wallet, ShoppingBag,
  Network, Download, Clock, AlertCircle, Copy, LogOut, ChevronLeft,
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
  totalIncome:      number;
  pairingBonus:     number;
  sign5Bonus:       number;
  leadershipBonus:  number;
  recentPayouts:    WalletTransaction[];
  transactions:     WalletTransaction[];
}

const API_BASE_URL = 'http://localhost:3000';

const formatPhp = (amount: number) =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 2 });

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
    today:     sumCredits(transactions, startOfToday),
    thisWeek:  sumCredits(transactions, startOfWeek),
    thisMonth: sumCredits(transactions, startOfMonth),
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const [sidebarOpen, setSidebarOpen]           = useState(true);
  const [activeTab, setActiveTab]               = useState('dashboard');
  const [, setProfileModalOpen]                 = useState(false);
  const [profilePicture]                        = useState('CP');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [dontShowAgain, setDontShowAgain]       = useState(false);
  const navigate = useNavigate();

  // ── Wallet / income state ────────────────────────────────────────────
  const [income, setIncome]               = useState<IncomeBreakdown | null>(null);
  const [incomeLoading, setIncomeLoading] = useState(true);

  useEffect(() => {
    const fetchIncome = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        let userId = localStorage.getItem('userId');
        if (!userId) {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const userObj = JSON.parse(userStr);
            userId = userObj.id ?? userObj._id ?? userObj.userId;
          }
        }

        console.log('resolved userId:', userId);

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

        // Only count PHP credits
        const phpCredits = txns.filter(
          (t) => t.currency === 'php' && t.type === 'credit',
        );

        const sum = (source: WalletTransaction['source']) =>
          phpCredits
            .filter((t) => t.source === source)
            .reduce((acc, t) => acc + t.amount, 0);

        const pairingBonus    = sum('pairing');
        const sign5Bonus      = sum('sign5');
        const leadershipBonus = sum('leadership');
        const totalIncome     = pairingBonus + sign5Bonus + leadershipBonus;

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

  // ── Period income (Today / This Week / This Month) ───────────────────
  const periodIncome = useMemo(
    () => getPeriodIncome(income?.transactions ?? []),
    [income],
  );

  // ── Existing effects ─────────────────────────────────────────────────
  useEffect(() => {
    const hasDisabledModal = localStorage.getItem('disableWelcomeModal');
    if (!hasDisabledModal) setShowWelcomeModal(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) navigate('/');
  }, [navigate]);

  const referralLink = "https://coprofitglobal.com/mlm/referral.php?ref=FOUNDER";

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      alert("Referral link copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleCloseWelcomeModal = () => {
    if (dontShowAgain) localStorage.setItem('disableWelcomeModal', 'true');
    setShowWelcomeModal(false);
  };

  const menuItems = useMemo(() => [
    { id: 'dashboard',          label: 'Dashboard',         icon: Home },
    { id: 'genealogy',          label: 'Genealogy',         icon: Network },
    { id: 'referal-hierarchy',  label: 'Referal Hierarchy', icon: Lock },
    { id: 'pairing-history',    label: 'Pairing History',   icon: TrendingUp },
    { id: 'payout-system',      label: 'Payout System',     icon: Wallet },
    { id: 'subscription',       label: 'Subscription',      icon: ShoppingBag },
    { id: 'unilevel-package',   label: 'Unilevel Products', icon: Download },
    { id: 'withdraw-gc',        label: 'Withdraw GC',       icon: Download },
    { id: 'payout-history',     label: 'Payout History',    icon: Download },
  ], []);

  // ── Skeleton helper ───────────────────────────────────────────────────
  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className ?? ''}`} />
  );

  const sourceLabel: Record<string, string> = {
    pairing:          'Pairing Bonus',
    sign5:            'Sign-5 Bonus',
    leadership:       'Leadership Bonus',
    admin_adjustment: 'Admin Adjustment',
    withdrawal:       'Withdrawal',
  };

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

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Direct Referrals (PHP)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Indirect Referrals (PHP)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Sales Match Bonus (PHP)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Repeat Binary Bonus (PHP)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Stairstep Bonus (PHP)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Royalty Bonus (PHP)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Income of Unilevel Bonus (Points Value = 1 PHP)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">0 PV - ₱0.00</p>
        </div>

      </div>

      {/* ── Current Package ───────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-gray-600 via-gray-400 to-gray-300 rounded-3xl p-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/95 mb-2">Current Package</p>
            <p className="text-3xl sm:text-4xl font-bold mb-2 bg-linear-to-r from-gray-200 via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Platinum
            </p>
            <p className="text-lg sm:text-xl font-semibold text-white/95">₱12,998.00</p>
          </div>
          <button
            onClick={() => setActiveTab('subscription')}
            className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-all active:scale-95"
          >
            Upgrade Subscription
          </button>
        </div>
      </div>

      {/* ── Referral Stats & Genealogy ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Referral Stats</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">TBA</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900">0</p>
                <span className="text-sm text-gray-500">TBA</span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Your Referral Link</p>
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200">
                <code className="text-xs font-mono text-slate-700 flex-1 break-all">{referralLink}</code>
                <button onClick={handleCopyReferral} className="p-2 hover:bg-gray-200 rounded transition">
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Genealogy</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Left Leg</p>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded border border-blue-200">
                <div>
                  <p className="text-2xl font-bold text-blue-900">0</p>
                  <p className="text-xs text-blue-700">positions available</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Right Leg</p>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded border border-purple-200">
                <div>
                  <p className="text-2xl font-bold text-purple-900">68</p>
                  <p className="text-xs text-purple-700">positions available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pairing Bonus & Gift Certificates ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Bonus</h3>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-sm font-medium text-amber-900 mb-1">Real-time Pairing</p>
              <p className="text-xs text-amber-700">Pairs automatically when both legs have points</p>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">Total Earned</p>
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

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gift Certificates (GC)</h3>
          <div className="space-y-4">
            <div className="p-4 bg-linear-to-r from-rose-50 to-pink-50 rounded border border-rose-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-rose-700 mb-1">Total Earned</p>
                  <p className="text-4xl font-bold text-rose-900">69</p>
                </div>
                <Gift className="w-12 h-12 text-rose-300" />
              </div>
              <p className="text-xs text-rose-700 mt-3">1 GC per 5 pairs</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sign-5 & Unilevel PV ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign-5 Progress (This Month)</h3>
          <div className="space-y-3">
            {[
              { name: 'Bronze 0',   progress: 100 },
              { name: 'Silver 0',   progress: 75 },
              { name: 'Gold 0',     progress: 40 },
              { name: 'Platinum 0', progress: 10 },
            ].map((tier, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900">{tier.name}</span>
                  <span className="text-xs text-gray-500">{tier.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${tier.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unilevel PV</h3>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded border border-indigo-200">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-medium text-indigo-900">Current PV</p>
                <p className="text-3xl font-bold text-indigo-900">88.750</p>
              </div>
              <p className="text-xs text-indigo-700">Resets every month</p>
            </div>
            <div className="p-4 bg-amber-50 rounded border border-amber-200">
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

      {/* ── Pending Withdrawals & Recent Payouts ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Withdrawals</h3>
          <div className="space-y-4">
            <div className="p-4 bg-sky-50 rounded border border-sky-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sky-700 mb-1">Amount Pending</p>
                  <p className="text-3xl font-bold text-sky-900">₱0.00</p>
                </div>
                <Wallet className="w-10 h-10 text-sky-300" />
              </div>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition">
              Request Withdrawal
            </button>
          </div>
        </div>

        {/* ── Recent Payouts — from real wallet transactions ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payouts</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {incomeLoading ? (
              [1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : (income?.recentPayouts ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No payouts yet</p>
            ) : (
              income!.recentPayouts.map((txn) => (
                <div key={txn.id} className="p-3 bg-emerald-50 rounded border border-emerald-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-emerald-900 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(txn.createdAt).toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true,
                        })}
                      </p>
                      <p className="text-sm font-medium text-emerald-900 mt-1">
                        {sourceLabel[txn.source] ?? txn.source}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-emerald-900 whitespace-nowrap ml-2">
                      +₱{formatPhp(txn.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );

  const renderTabContent = () => {
    const contents: Record<string, React.ReactElement> = {
      genealogy:           <Genealogy />,
      'pairing-history':   <Pairing />,
      'payout-system':     <Payout />,
      'referal-hierarchy': <ReferalsHierarchy />,
      'withdraw-gc':       <WithdrawGC />,
      subscription:        <Subscription />,
      'unilevel-package':  <UnilevelProducts />,
      'payout-history':    <PayoutHistory />,
    };
    return contents[activeTab] || <div />;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
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
      <div className={`fixed lg:static inset-y-0 left-0 bg-white text-gray-900 sidebar-smooth z-40 ${
        sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } ${sidebarOpen ? 'justify-start' : 'justify-center lg:justify-center'}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="text-sm">{item.label}</span>}
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
                <span className="text-sm font-bold text-yellow-500">{profilePicture}</span>
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">CoProfitGlobal</p>
                  <p className="text-xs text-gray-500 truncate">coprofitglobal@gmail.com</p>
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