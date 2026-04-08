import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface WithdrawalRecord {
  id: string;
  amount: number;
  date: string;
  time: string;
  status: 'pending' | 'completed' | 'failed';
}

export default function WithdrawGC() {
  const [totalGC] = useState<number>(5000);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRecord[]>([
    { id: '1', amount: 500, date: '02/20/2026', time: '14:30', status: 'completed' },
    { id: '2', amount: 250, date: '02/18/2026', time: '09:15', status: 'completed' },
    { id: '3', amount: 1000, date: '02/15/2026', time: '16:45', status: 'pending' },
    { id: '4', amount: 100, date: '02/10/2026', time: '11:20', status: 'failed' },
  ]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > totalGC) {
      alert('Insufficient GC balance');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const now = new Date();
      const dateStr =
        (now.getMonth() + 1).toString().padStart(2, '0') +
        '/' +
        now.getDate().toString().padStart(2, '0') +
        '/' +
        now.getFullYear();
      const timeStr =
        now.getHours().toString().padStart(2, '0') +
        ':' +
        now.getMinutes().toString().padStart(2, '0');

      const newRecord: WithdrawalRecord = {
        id: Date.now().toString(),
        amount,
        date: dateStr,
        time: timeStr,
        status: 'pending',
      };

      setWithdrawalHistory([newRecord, ...withdrawalHistory]);
      setWithdrawalAmount('');
      setLoading(false);
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
      case 'failed':
        return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      default:
        return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5" />;
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const completedTotal = withdrawalHistory
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingTotal = withdrawalHistory
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Withdraw GC</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your GC withdrawals and view your transaction history</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'GC Balance', value: totalGC.toLocaleString(), sub: 'Available for withdrawal' },
            { label: 'Total Withdrawn', value: completedTotal.toLocaleString(), sub: 'Completed withdrawals' },
            { label: 'Total Pending', value: pendingTotal.toLocaleString(), sub: 'Awaiting processing' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value} <span className="text-sm font-medium text-slate-400">GC</span></p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Withdrawal Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Initiate Withdrawal</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Enter the amount you want to withdraw</p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Withdrawal Amount
                  </label>
                  <div className="relative">
                    <input
                      id="amount"
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="Enter amount"
                      disabled={loading}
                      max={totalGC}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-medium">GC</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Max: {totalGC.toLocaleString()} GC</p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleWithdraw}
                  disabled={loading || !withdrawalAmount}
                  className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Withdraw GC'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Withdrawal History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Withdrawal History</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{withdrawalHistory.length} record{withdrawalHistory.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {withdrawalHistory.filter((r) => r.status === 'completed').length} completed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Time</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {withdrawalHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">
                              ✦
                            </div>
                            <p className="text-slate-400 text-sm">No withdrawal records yet</p>
                            <p className="text-slate-300 text-xs">Submit a request to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      withdrawalHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {record.amount.toLocaleString()} <span className="text-slate-400 font-normal text-xs">GC</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{record.date}</td>
                          <td className="px-6 py-4 text-slate-500">{record.time}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                              {getStatusIcon(record.status)}
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}