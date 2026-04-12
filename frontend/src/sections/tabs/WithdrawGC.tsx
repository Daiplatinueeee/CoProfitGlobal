import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, X } from 'lucide-react';

const API_BASE_URL = 'https://coprofitglobal-production.up.railway.app';

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'pending':   return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    case 'rejected':  return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    default:          return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'pending':   return <Clock className="w-3.5 h-3.5" />;
    case 'rejected':  return <AlertCircle className="w-3.5 h-3.5" />;
    default:          return null;
  }
};

export default function WithdrawGC() {
  const [gcBalance, setGcBalance]               = useState<number>(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [submitting, setSubmitting]             = useState(false);
  const [submitError, setSubmitError]           = useState('');
  const [submitSuccess, setSubmitSuccess]       = useState('');
  const [withdrawals, setWithdrawals]           = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [showFormSheet, setShowFormSheet]       = useState(false);

  const token  = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId') ?? (() => {
    try { return JSON.parse(localStorage.getItem('user') ?? '{}')?.id ?? ''; } catch { return ''; }
  })();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, histRes] = await Promise.all([
        fetch(`${API_BASE_URL}/wallet/${userId}/balances`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/withdrawal/my?currency=gc_points`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const balJson  = await balRes.json();
      const histJson = await histRes.json();
      setGcBalance(balJson?.balances?.gc_points ?? 0);
      setWithdrawals(Array.isArray(histJson) ? histJson : []);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleWithdraw = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      setSubmitError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/withdrawal`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, currency: 'gc_points' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json?.message ?? 'Failed to submit request.');
      } else {
        setSubmitSuccess('GC withdrawal request submitted successfully.');
        setWithdrawalAmount('');
        setShowFormSheet(false);
        await fetchData();
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const completedTotal = withdrawals.filter((w) => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);
  const pendingTotal   = withdrawals.filter((w) => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);

  /* ─── Withdrawal Form (shared) ─── */
  const WithdrawalForm = () => (
    <form onSubmit={handleWithdraw} className="px-4 sm:px-6 py-5 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
          Withdrawal Amount
        </label>
        <input
          type="number"
          value={withdrawalAmount}
          onChange={(e) => setWithdrawalAmount(e.target.value)}
          placeholder="Enter amount"
          disabled={submitting}
          max={gcBalance}
          min={1}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-slate-400 mt-1.5">Max: {gcBalance.toLocaleString()} GC</p>
      </div>

      {submitError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{submitError}</p>
      )}
      {submitSuccess && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">{submitSuccess}</p>
      )}

      <button
        type="submit"
        disabled={submitting || !withdrawalAmount}
        className="w-full bg-slate-900 hover:bg-slate-700 active:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
        ) : (
          'Withdraw GC'
        )}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Withdraw GC</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your GC withdrawals and view your transaction history</p>
          </div>
          {/* Mobile CTA */}
          <button
            onClick={() => setShowFormSheet(true)}
            className="lg:hidden shrink-0 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            + Withdraw
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'GC Balance',      value: gcBalance.toLocaleString(),       sub: 'Available for withdrawal' },
            { label: 'Total Withdrawn', value: completedTotal.toLocaleString(),  sub: 'Completed withdrawals' },
            { label: 'Total Pending',   value: pendingTotal.toLocaleString(),     sub: 'Awaiting processing' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">
                {stat.value} <span className="text-sm font-medium text-slate-400">GC</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

          {/* Desktop: Withdrawal Form Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden sticky top-6">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Initiate Withdrawal</h2>
                <p className="text-xs text-slate-400 mt-0.5">Enter the amount you want to withdraw</p>
              </div>
              <WithdrawalForm />
            </div>
          </div>

          {/* Withdrawal History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Withdrawal History</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {withdrawals.length} record{withdrawals.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {withdrawals.filter((w) => w.status === 'completed').length} completed
                </span>
              </div>

              {/* Mobile: Card List */}
              <div className="block sm:hidden divide-y divide-slate-50">
                {loading ? (
                  <div className="px-4 py-12 text-center text-sm text-slate-400">Loading…</div>
                ) : withdrawals.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
                      <p className="text-slate-400 text-sm">No withdrawal records yet</p>
                      <p className="text-slate-300 text-xs">Submit a request to get started</p>
                    </div>
                  </div>
                ) : (
                  withdrawals.map((w) => (
                    <div key={w.id} className="px-4 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {w.amount.toLocaleString()} <span className="text-slate-400 font-normal text-xs">GC</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(w.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            {' · '}
                            {new Date(w.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(w.status)}`}>
                          {getStatusIcon(w.status)}
                          {w.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tablet+: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">Time</th>
                      <th className="text-center px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
                    ) : withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
                            <p className="text-slate-400 text-sm">No withdrawal records yet</p>
                            <p className="text-slate-300 text-xs">Submit a request to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-4 sm:px-6 py-4 font-semibold text-slate-900">
                            {w.amount.toLocaleString()} <span className="text-slate-400 font-normal text-xs">GC</span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-slate-500">
                            {new Date(w.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-slate-500 hidden md:table-cell">
                            {new Date(w.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(w.status)}`}>
                              {getStatusIcon(w.status)}
                              {w.status}
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

      {/* Mobile: Bottom Sheet */}
      {showFormSheet && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFormSheet(false)} />
          <div className="relative bg-white rounded-t-2xl w-full max-h-[90dvh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Initiate Withdrawal</h2>
                <p className="text-xs text-slate-400 mt-0.5">Enter the amount you want to withdraw</p>
              </div>
              <button
                onClick={() => setShowFormSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain flex-1">
              <WithdrawalForm />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}