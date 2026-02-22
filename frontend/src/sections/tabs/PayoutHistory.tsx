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
  withdraw: {
    label: 'Withdraw',
    color: 'bg-blue-50 border-blue-200',
    icon: TrendingUp,
    textColor: 'text-blue-700',
  },
  sign5_bonus: {
    label: 'Sign5 Bonus',
    color: 'bg-purple-50 border-purple-200',
    icon: Gift,
    textColor: 'text-purple-700',
  },
  leadership_bonus: {
    label: 'Leadership Bonus',
    color: 'bg-amber-50 border-amber-200',
    icon: Award,
    textColor: 'text-amber-700',
  },
  direct_referral: {
    label: 'Direct Referral',
    color: 'bg-green-50 border-green-200',
    icon: Users,
    textColor: 'text-green-700',
  },
  indirect_referral: {
    label: 'Indirect Referral',
    color: 'bg-cyan-50 border-cyan-200',
    icon: Users,
    textColor: 'text-cyan-700',
  },
  pairing_bonus: {
    label: 'Pairing Bonus',
    color: 'bg-pink-50 border-pink-200',
    icon: Zap,
    textColor: 'text-pink-700',
  },
};

export default function PayoutHistory() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('')


  const [transactions] = useState<PayoutTransaction[]>([
    {
      id: '1',
      type: 'pairing_bonus',
      amount: 500,
      date: '2025-02-20',
      status: 'completed',
      details: 'Pairing bonus from left leg and right leg pairing',
    },
    {
      id: '2',
      type: 'direct_referral',
      amount: 1200,
      date: '2025-02-18',
      status: 'completed',
      details: 'Commissions from 3 direct referrals',
    },
    {
      id: '3',
      type: 'withdraw',
      amount: 5000,
      date: '2025-02-15',
      status: 'completed',
      details: 'Bank transfer withdrawal',
    },
    {
      id: '4',
      type: 'leadership_bonus',
      amount: 2500,
      date: '2025-02-10',
      status: 'completed',
      details: 'Monthly leadership bonus for tier 3',
    },
    {
      id: '5',
      type: 'sign5_bonus',
      amount: 3000,
      date: '2025-02-08',
      status: 'completed',
      details: '5 pairing bonuses (5/5 cap reached)',
    },
    {
      id: '6',
      type: 'indirect_referral',
      amount: 800,
      date: '2025-02-05',
      status: 'completed',
      details: 'Commissions from indirect network',
    },
    {
      id: '7',
      type: 'pairing_bonus',
      amount: 600,
      date: '2025-02-01',
      status: 'completed',
      details: 'Pairing bonus from balanced network',
    },
    {
      id: '8',
      type: 'withdraw',
      amount: 3000,
      date: '2025-01-28',
      status: 'completed',
      details: 'GCash withdrawal',
    },
    {
      id: '9',
      type: 'direct_referral',
      amount: 1500,
      date: '2025-01-25',
      status: 'completed',
      details: 'Commissions from 2 direct referrals',
    },
    {
      id: '10',
      type: 'leadership_bonus',
      amount: 2500,
      date: '2025-01-20',
      status: 'pending',
      details: 'Monthly leadership bonus for tier 3',
    },
  ]);

  const filteredTransactions = selectedFilter === 'all'
    ? transactions
    : transactions.filter(t => t.type === selectedFilter);

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.status === 'completed' ? t.amount : 0), 0);
  const pendingAmount = filteredTransactions.reduce((sum, t) => sum + (t.status === 'pending' ? t.amount : 0), 0);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Transactions' },
    { value: 'withdraw', label: 'Withdraws' },
    { value: 'sign5_bonus', label: 'Sign5 Bonus' },
    { value: 'leadership_bonus', label: 'Leadership Bonus' },
    { value: 'direct_referral', label: 'Direct Referral' },
    { value: 'indirect_referral', label: 'Indirect Referral' },
    { value: 'pairing_bonus', label: 'Pairing Bonus' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-4 md:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-gray-900">Payout History</h1>
          <p className="text-gray-600 mt-2">Track all your bonuses and withdrawals</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <p className="text-gray-600 text-sm font-medium mb-2">Total Completed</p>
            <p className="text-3xl font-semibold text-gray-900">₱{totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
            <p className="text-orange-700 text-sm font-medium mb-2">Pending Amount</p>
            <p className="text-3xl font-semibold text-gray-900">₱{pendingAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search payouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-700 mb-3">Filter by type</p>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const config = payoutTypeConfig[transaction.type];
              const IconComponent = config.icon;

              return (
                <div
                  key={transaction.id}
                  className={`rounded-xl border p-4 transition-colors ${config.color}`}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === transaction.id ? null : transaction.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 grow">
                        <div className={`p-2 rounded-lg ${config.color.replace('bg-', 'bg-').replace('50', '100')}`}>
                          <IconComponent className={`w-5 h-5 ${config.textColor}`} />
                        </div>
                        <div className="grow">
                          <p className="font-semibold text-gray-900 text-sm">{config.label}</p>
                          <p className="text-xs text-gray-600">{new Date(transaction.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₱{transaction.amount.toLocaleString()}</p>
                          <p className={`text-xs font-medium ${
                            transaction.status === 'completed'
                              ? 'text-green-700'
                              : transaction.status === 'pending'
                                ? 'text-orange-700'
                                : 'text-red-700'
                          }`}>
                            {transaction.status === 'completed' && 'Completed'}
                            {transaction.status === 'pending' && 'Pending'}
                            {transaction.status === 'failed' && 'Failed'}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedId === transaction.id ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {expandedId === transaction.id && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Details:</span> {transaction.details}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No transactions found for this filter.</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-4">Bonus Types</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Direct Referral</p>
              <p className="text-xs text-gray-600">Commission from your direct downline members</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Indirect Referral</p>
              <p className="text-xs text-gray-600">Commissions from network members below your direct referrals</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Pairing Bonus</p>
              <p className="text-xs text-gray-600">Bonus earned when left and right legs are balanced (max 5/day)</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Leadership Bonus</p>
              <p className="text-xs text-gray-600">Monthly bonus for maintaining your team structure and tier level</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Sign5 Bonus</p>
              <p className="text-xs text-gray-600">Special bonus when you complete 5 successful pairings (5/5 cap)</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Withdraw</p>
              <p className="text-xs text-gray-600">Your cash withdrawals from your available balance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}