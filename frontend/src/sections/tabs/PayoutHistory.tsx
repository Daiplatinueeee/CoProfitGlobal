import { useState } from 'react';
import { ChevronDown, TrendingUp, Gift, Users, Award, Zap } from 'lucide-react';

interface PayoutTransaction {
  id: string;
  type: 'withdraw' | 'sign5_bonus' | 'leadership_bonus' | 'direct_referral' | 'indirect_referral' | 'pairing_bonus';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  details?: string;
}

type FilterType = 'all' | 'withdraw' | 'sign5_bonus' | 'leadership_bonus' | 'direct_referral' | 'indirect_referral' | 'pairing_bonus';

const payoutTypeConfig = {
  withdraw: { label: 'Withdraw', icon: TrendingUp, badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  sign5_bonus: { label: 'Sign5 Bonus', icon: Gift, badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  leadership_bonus: { label: 'Leadership Bonus', icon: Award, badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  direct_referral: { label: 'Direct Referral', icon: Users, badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  indirect_referral: { label: 'Indirect Referral', icon: Users, badge: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' },
  pairing_bonus: { label: 'Pairing Bonus', icon: Zap, badge: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200' },
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'pending': return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    default: return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  }
};

export default function PayoutHistory() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [transactions] = useState<PayoutTransaction[]>([
    { id: '1', type: 'pairing_bonus', amount: 500, date: '2025-02-20', status: 'completed', details: 'Pairing bonus from left leg and right leg pairing' },
    { id: '2', type: 'direct_referral', amount: 1200, date: '2025-02-18', status: 'completed', details: 'Commissions from 3 direct referrals' },
    { id: '3', type: 'withdraw', amount: 5000, date: '2025-02-15', status: 'completed', details: 'Bank transfer withdrawal' },
    { id: '4', type: 'leadership_bonus', amount: 2500, date: '2025-02-10', status: 'completed', details: 'Monthly leadership bonus for tier 3' },
    { id: '5', type: 'sign5_bonus', amount: 3000, date: '2025-02-08', status: 'completed', details: '5 pairing bonuses (5/5 cap reached)' },
    { id: '6', type: 'indirect_referral', amount: 800, date: '2025-02-05', status: 'completed', details: 'Commissions from indirect network' },
    { id: '7', type: 'pairing_bonus', amount: 600, date: '2025-02-01', status: 'completed', details: 'Pairing bonus from balanced network' },
    { id: '8', type: 'withdraw', amount: 3000, date: '2025-01-28', status: 'completed', details: 'GCash withdrawal' },
    { id: '9', type: 'direct_referral', amount: 1500, date: '2025-01-25', status: 'completed', details: 'Commissions from 2 direct referrals' },
    { id: '10', type: 'leadership_bonus', amount: 2500, date: '2025-01-20', status: 'pending', details: 'Monthly leadership bonus for tier 3' },
  ]);

  const filteredTransactions = transactions
    .filter((t) => selectedFilter === 'all' || t.type === selectedFilter)
    .filter((t) =>
      searchQuery.trim() === '' ||
      payoutTypeConfig[t.type].label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.details ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalCompleted = filteredTransactions.reduce((sum, t) => sum + (t.status === 'completed' ? t.amount : 0), 0);
  const totalPending = filteredTransactions.reduce((sum, t) => sum + (t.status === 'pending' ? t.amount : 0), 0);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'withdraw', label: 'Withdraw' },
    { value: 'sign5_bonus', label: 'Sign5 Bonus' },
    { value: 'leadership_bonus', label: 'Leadership Bonus' },
    { value: 'direct_referral', label: 'Direct Referral' },
    { value: 'indirect_referral', label: 'Indirect Referral' },
    { value: 'pairing_bonus', label: 'Pairing Bonus' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Payout History</h1>
          <p className="text-sm text-slate-400 mt-1">Track all your bonuses and withdrawals</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total Completed</p>
            <p className="text-2xl font-semibold text-slate-900">₱{totalCompleted.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Across all payout types</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total Pending</p>
            <p className="text-2xl font-semibold text-slate-900">₱{totalPending.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting processing</p>
          </div>
        </div>

        {/* Transaction List Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Transactions</h2>
                <p className="text-xs text-slate-400 mt-0.5">{filteredTransactions.length} record{filteredTransactions.length !== 1 ? 's' : ''}</p>
              </div>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                {filteredTransactions.filter((t) => t.status === 'completed').length} completed
              </span>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300"
            />

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFilter(option.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
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

          {/* Transaction Rows */}
          <div className="divide-y divide-slate-50">
            {filteredTransactions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">
                    ✦
                  </div>
                  <p className="text-slate-400 text-sm">No transactions found</p>
                  <p className="text-slate-300 text-xs">Try adjusting your filters or search</p>
                </div>
              </div>
            ) : (
              filteredTransactions.map((transaction) => {
                const config = payoutTypeConfig[transaction.type];
                const IconComponent = config.icon;
                const isExpanded = expandedId === transaction.id;

                return (
                  <div key={transaction.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : transaction.id)}
                      className="w-full text-left px-6 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: icon + label + date */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{config.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(transaction.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Right: amount + status + chevron */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">₱{transaction.amount.toLocaleString()}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>
                    </button>

                    {isExpanded && transaction.details && (
                      <div className="px-6 pb-4 pt-0">
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
        </div>

        {/* Legend */}
        <div className="mt-10 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Bonus Types</h2>
            <p className="text-xs text-slate-400 mt-0.5">Understanding your payout categories</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y divide-slate-50 sm:divide-y-0">
            {[
              { type: 'direct_referral', desc: 'Commission from your direct downline members' },
              { type: 'indirect_referral', desc: 'Commissions from network members below your direct referrals' },
              { type: 'pairing_bonus', desc: 'Bonus earned when left and right legs are balanced (max 5/day)' },
              { type: 'leadership_bonus', desc: 'Monthly bonus for maintaining your team structure and tier level' },
              { type: 'sign5_bonus', desc: 'Special bonus when you complete 5 successful pairings (5/5 cap)' },
              { type: 'withdraw', desc: 'Your cash withdrawals from your available balance' },
            ].map(({ type, desc }) => {
              const config = payoutTypeConfig[type as keyof typeof payoutTypeConfig];
              return (
                <div key={type} className="px-6 py-4 flex items-start gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${config.badge}`}>
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