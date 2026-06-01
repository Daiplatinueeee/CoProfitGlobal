import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import { ChevronDown, ChevronLeft, ChevronRight, TrendingUp, Gift, Users, Award, Zap, AlertTriangle, ArrowUpCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface PayoutTransaction {
  id: string;
  type: 'withdraw' | 'sign5_bonus' | 'leadership_bonus' | 'direct_referral' | 'indirect_referral' | 'pairing_bonus' | 'pairing_flush' | 'pairing_cap_reached' | 'gc_reward' | 'tier_upgrade';
  amount: number;
  currency: 'php' | 'gc_points' | string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  details?: string;
}

type FilterType = 'all' | PayoutTransaction['type'];

const payoutTypeConfig: Record<PayoutTransaction['type'], { label: string; icon: any; badge: string }> = {
  withdraw:            { label: 'Withdraw',           icon: TrendingUp,    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  sign5_bonus:         { label: 'Sign5 Bonus',         icon: Gift,          badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  leadership_bonus:    { label: 'Leadership Bonus',    icon: Award,         badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  direct_referral:     { label: 'Direct Referral',     icon: Users,         badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  indirect_referral:   { label: 'Indirect Referral',   icon: Users,         badge: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' },
  pairing_bonus:       { label: 'Pairing Bonus',       icon: Zap,           badge: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200' },
  pairing_flush:       { label: 'Points Flushed',      icon: AlertTriangle, badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  pairing_cap_reached: { label: 'Pairing Cap Reached', icon: AlertTriangle, badge: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  gc_reward:           { label: 'GC Reward',            icon: Gift,          badge: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  tier_upgrade:        { label: 'Package Upgrade',      icon: ArrowUpCircle, badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
};

function mapTransaction(t: any): PayoutTransaction | null {
  const currency: string = t.currency ?? 'php';

  if (t.source === 'pairing' && currency === 'gc_points') {
    return { id: t.id, type: 'gc_reward', amount: t.amount, currency, date: t.createdAt ?? t.postedAt, status: 'completed', details: t.note ?? '' };
  }

  const SOURCE_MAP: Record<string, PayoutTransaction['type']> = {
    pairing:              'pairing_bonus',
    pairing_flush:        'pairing_flush',
    pairing_cap_reached:  'pairing_cap_reached',
    sign5:                'sign5_bonus',
    leadership:           'leadership_bonus',
    referral_direct:      'direct_referral',
    referral_indirect:    'indirect_referral',
    withdrawal:           'withdraw',
    tier_upgrade:         'tier_upgrade',
  };

  const type = SOURCE_MAP[t.source];
  if (!type) return null;

  // For pairing bonuses, append cap info from meta if the note doesn't already include it
  let details = t.note ?? '';
  if (type === 'pairing_bonus' && t.meta?.capLimit != null && t.meta?.capUsed != null) {
    if (!details.includes('cap ')) {
      details += ` | cap ${t.meta.capUsed}/${t.meta.capLimit}`;
    }
  }

  return { id: t.id, type, amount: t.amount, currency, date: t.createdAt ?? t.postedAt, status: 'completed', details };
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'pending':   return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    default:          return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  }
};

export default function Transactions() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState('');

  const [transactions, setTransactions]     = useState<PayoutTransaction[]>([]);
  const [loading, setLoading]               = useState(true);
  const [currentPage, setCurrentPage]       = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    const userId = localStorage.getItem('userId') ?? (() => {
      try { return JSON.parse(localStorage.getItem('user') ?? '{}')?.id ?? ''; } catch { return ''; }
    })();

    apiFetch(`${API_BASE_URL}/wallet/${userId}/transactions?limit=200`)
      .then((res) => res.json())
      .then((json: any[]) => {
        if (!Array.isArray(json)) return;
        const mapped: PayoutTransaction[] = json
          .map(mapTransaction)
          .filter((t): t is PayoutTransaction => t !== null);
        setTransactions(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = transactions
    .filter((t) => selectedFilter === 'all' || t.type === selectedFilter)
    .filter((t) =>
      searchQuery.trim() === '' ||
      payoutTypeConfig[t.type].label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.details ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const pagedTransactions = filteredTransactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const FLUSH_TYPES = new Set<PayoutTransaction['type']>(['pairing_flush', 'pairing_cap_reached']);
  const totalCompleted = filteredTransactions.reduce((sum, t) => sum + (t.status === 'completed' && t.type !== 'gc_reward' && !FLUSH_TYPES.has(t.type) ? t.amount : 0), 0);
  const totalPending   = filteredTransactions.reduce((sum, t) => sum + (t.status === 'pending'   && t.type !== 'gc_reward' ? t.amount : 0), 0);
  const totalGc        = filteredTransactions.reduce((sum, t) => sum + (t.type === 'gc_reward' ? t.amount : 0), 0);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all',               label: 'All' },
    { value: 'withdraw',          label: 'Withdraw' },
    { value: 'sign5_bonus',       label: 'Sign5 Bonus' },
    { value: 'leadership_bonus',  label: 'Leadership' },
    { value: 'direct_referral',   label: 'Direct Ref.' },
    { value: 'indirect_referral', label: 'Indirect Ref.' },
    { value: 'pairing_bonus',     label: 'Pairing' },
    { value: 'gc_reward',         label: 'GC Reward' },
    { value: 'pairing_flush',        label: 'Flushed' },
    { value: 'pairing_cap_reached',  label: 'Cap Reached' },
    { value: 'tier_upgrade',      label: 'Upgrade' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-400 mt-1">Track all your bonuses and withdrawals</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total Completed</p>
            <p className="text-lg sm:text-2xl font-semibold text-slate-900">₱{totalCompleted.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Across all payout types</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total Pending</p>
            <p className="text-lg sm:text-2xl font-semibold text-slate-900">₱{totalPending.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting processing</p>
          </div>
          <div className="bg-white rounded-xl border border-teal-100 px-4 sm:px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total GC Earned</p>
            <p className="text-lg sm:text-2xl font-semibold text-teal-700">{totalGc.toLocaleString()} GC</p>
            <p className="text-xs text-slate-400 mt-1">Gift certificates rewarded</p>
          </div>
        </div>

        {/* Transaction List Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Transactions</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredTransactions.length} record{filteredTransactions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full shrink-0">
                {filteredTransactions.filter((t) => t.status === 'completed').length} completed
              </span>
            </div>

            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300"
            />

            {/* Filter pills — horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-none">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { setSelectedFilter(option.value); setCurrentPage(1); }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedFilter === option.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="px-4 sm:px-6 py-12 text-center text-sm text-slate-400">Loading…</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="px-4 sm:px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
                  <p className="text-slate-400 text-sm">No transactions found</p>
                  <p className="text-slate-300 text-xs">Try adjusting your filters or search</p>
                </div>
              </div>
            ) : (
              pagedTransactions.map((transaction) => {
                const config        = payoutTypeConfig[transaction.type];
                const IconComponent = config.icon;
                const isExpanded    = expandedId === transaction.id;

                return (
                  <div key={transaction.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : transaction.id)}
                      className="w-full text-left px-4 sm:px-6 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{config.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(transaction.date).toLocaleString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${transaction.type === 'gc_reward' ? 'text-teal-700' : transaction.type === 'pairing_flush' || transaction.type === 'pairing_cap_reached' ? 'text-orange-600' : 'text-slate-900'}`}>
                              {transaction.type === 'gc_reward'
                                ? `${transaction.amount.toLocaleString()} GC`
                                : transaction.type === 'pairing_flush' || transaction.type === 'pairing_cap_reached'
                                  ? `${transaction.amount.toLocaleString()} pts`
                                  : `₱${transaction.amount.toLocaleString()}`}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </button>

                    {isExpanded && transaction.details && (
                      <div className="px-4 sm:px-6 pb-4 pt-0">
                        <div className="ml-11 bg-slate-50 rounded-lg px-4 py-3">
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Details: </span>
                            {transaction.details}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredTransactions.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Showing{' '}
                <span className="font-medium text-slate-600">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredTransactions.length)}
                </span>{' '}
                of <span className="font-medium text-slate-600">{filteredTransactions.length}</span> records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-xs font-medium text-slate-600 px-1">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 sm:mt-10 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Bonus Types</h2>
            <p className="text-xs text-slate-400 mt-0.5">Understanding your payout categories</p>
          </div>
          {/* 1 col on mobile, 2 col on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-slate-50 sm:divide-y-0">
            {([
              { type: 'direct_referral',   desc: 'Commission from your direct downline members' },
              { type: 'indirect_referral', desc: 'Commissions from network members below your direct referrals' },
              { type: 'pairing_bonus',     desc: 'Bonus earned when left and right legs are balanced' },
              { type: 'leadership_bonus',  desc: 'Monthly bonus for maintaining your team structure and tier level' },
              { type: 'sign5_bonus',       desc: 'Special bonus when you complete 5 successful pairings' },
              { type: 'withdraw',          desc: 'Your cash withdrawals from your available balance' },
              { type: 'pairing_flush',        desc: 'Volume points cleared at the end of an AM/PM cycle (midnight or noon) when leftover points were not paired' },
              { type: 'pairing_cap_reached',  desc: 'Points discarded because the pairing cap for the current cycle was already exhausted — no PHP payout was issued' },
              { type: 'gc_reward',         desc: 'Gift Certificate earned at every 5th cumulative paired point (1, 2, 3, 4, GC, 6, 7, 8, 9, GC…)' },
              { type: 'tier_upgrade',      desc: 'Recorded when you upgrade your membership package to a higher tier' },
            ] as { type: PayoutTransaction['type']; desc: string }[]).map(({ type, desc }) => {
              const config = payoutTypeConfig[type];
              return (
                <div key={type} className="px-4 sm:px-6 py-4 flex items-start gap-3 border-b border-slate-50 last:border-0 sm:border-b-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 shrink-0 ${config.badge}`}>
                    {config.label}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}