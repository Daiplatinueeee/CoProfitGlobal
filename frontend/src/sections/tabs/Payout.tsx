import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:3000';

interface WithdrawalRecord {
  id: string;
  amount: number;
  vat: number;
  totalAmount: number;
  paymentMethod: string;
  accountName: string;
  notes: string;
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

function Payout() {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: '',
    accountName: '',
    notes: '',
  });
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawals, setWithdrawals]           = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading]                   = useState(true);

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
        fetch(`${API_BASE_URL}/withdrawal/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const balJson  = await balRes.json();
      const histJson = await histRes.json();

      setAvailableBalance(balJson?.balances?.php ?? 0);
      setWithdrawals(Array.isArray(histJson) ? histJson : []);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (
    e: { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/withdrawal`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount:        parseFloat(formData.amount),
          paymentMethod: formData.paymentMethod,
          accountName:   formData.accountName,
          notes:         formData.notes,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json?.message ?? 'Failed to submit request.');
      } else {
        setSubmitSuccess('Withdrawal request submitted successfully.');
        setFormData({ amount: '', paymentMethod: '', accountName: '', notes: '' });
        await fetchData();
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalWithdrawn = withdrawals
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.totalAmount, 0);

  const totalPending = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + w.totalAmount, 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Payout Management</h1>
          <p className="text-sm text-slate-400 mt-1">Request and track your withdrawal history</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Withdrawn',    value: `₱${totalWithdrawn.toLocaleString()}`,      sub: 'Completed withdrawals' },
            { label: 'Total Pending',      value: `₱${totalPending.toLocaleString()}`,         sub: 'Awaiting processing' },
            { label: 'Available Balance',  value: `₱${availableBalance.toLocaleString()}`,     sub: 'Ready to withdraw' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Request Withdrawal Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Request Withdrawal</h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill in your payout details</p>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300"
                    required
                    min={1}
                  />
                  {formData.amount && !isNaN(parseFloat(formData.amount)) && (
                    <p className="text-xs text-slate-400 mt-1">
                      +10% VAT = ₱{Math.floor(parseFloat(formData.amount) * 0.10).toLocaleString()} &nbsp;|&nbsp;
                      Total deducted: ₱{Math.floor(parseFloat(formData.amount) * 1.10).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900"
                    required
                  >
                    <option value="">Select a method</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="wallet">Digital Wallet</option>
                    <option value="check">Check</option>
                    <option value="crypto">Cryptocurrency</option>
                  </select>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Account Name</label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Enter account name"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Instructions or Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Add any special instructions..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300 resize-none"
                  />
                </div>

                {submitError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>
                )}
                {submitSuccess && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{submitSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>

          {/* Withdrawal History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Withdrawal History</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{withdrawals.length} record{withdrawals.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {withdrawals.filter((w) => w.status === 'completed').length} completed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Method</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">VAT</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Total</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Loading…</td>
                      </tr>
                    ) : withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
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
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">
                              {new Date(w.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(w.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-slate-500 capitalize">{w.paymentMethod}</td>
                          <td className="px-6 py-4 text-right text-slate-900">₱{w.amount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-slate-500">₱{w.vat.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-900">₱{w.totalAmount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(w.status)}`}>
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
    </div>
  );
}

export default Payout;
