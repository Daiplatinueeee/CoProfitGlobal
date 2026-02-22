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
    {
      id: '1',
      amount: 500,
      date: '02/20/2026',
      time: '14:30',
      status: 'completed',
    },
    {
      id: '2',
      amount: 250,
      date: '02/18/2026',
      time: '09:15',
      status: 'completed',
    },
    {
      id: '3',
      amount: 1000,
      date: '02/15/2026',
      time: '16:45',
      status: 'pending',
    },
    {
      id: '4',
      amount: 100,
      date: '02/10/2026',
      time: '11:20',
      status: 'failed',
    },
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

    // Simulate API call
    setTimeout(() => {
      const now = new Date();
      const dateStr = (now.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                      now.getDate().toString().padStart(2, '0') + '/' + 
                      now.getFullYear();
      const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Withdraw GC</h1>
          <p className="text-slate-600">Manage your GC withdrawals and view your transaction history</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Balance Card */}
          <div className="md:col-span-1 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium mb-2">Total GC Balance</p>
            <p className="text-3xl font-bold text-slate-900">{totalGC.toLocaleString()}</p>
            <p className="text-slate-500 text-xs mt-2">Available for withdrawal</p>
          </div>

          {/* Withdrawal Form */}
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Initiate Withdrawal</h2>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-2">
                  Withdrawal Amount
                </label>
                <div className="relative">
                  <input
                    id="amount"
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="Enter amount to withdraw"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
                    max={totalGC}
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 text-sm font-medium">GC</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Max: {totalGC.toLocaleString()} GC
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !withdrawalAmount}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
            </form>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Withdrawal History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {withdrawalHistory.length > 0 ? (
                  withdrawalHistory.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">
                          {record.amount.toLocaleString()} GC
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                        {record.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                        {record.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span
                            className={`text-sm font-medium ${
                              record.status === 'completed'
                                ? 'text-green-700'
                                : record.status === 'pending'
                                  ? 'text-yellow-700'
                                  : 'text-red-700'
                            }`}
                          >
                            {getStatusLabel(record.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No withdrawal history
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}