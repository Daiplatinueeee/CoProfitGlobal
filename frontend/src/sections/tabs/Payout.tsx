import { useState } from 'react';

function Payout() {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: '',
    accountName: '',
    notes: '',
  });

  const [withdrawals] = useState([
    {
      id: 1,
      date: '2025-02-20',
      time: '03:45 PM',
      requestedDate: '2025-02-20',
      requestAmount: 5000,
      vat: 500,
      totalAmount: 5500,
      status: 'completed',
    },
    {
      id: 2,
      date: '2025-02-18',
      time: '11:20 AM',
      requestedDate: '2025-02-18',
      requestAmount: 3500,
      vat: 350,
      totalAmount: 3850,
      status: 'completed',
    },
    {
      id: 3,
      date: '2025-02-15',
      time: '02:15 PM',
      requestedDate: '2025-02-15',
      requestAmount: 2000,
      vat: 200,
      totalAmount: 2200,
      status: 'pending',
    },
    {
      id: 4,
      date: '2025-02-12',
      time: '09:30 AM',
      requestedDate: '2025-02-12',
      requestAmount: 7500,
      vat: 750,
      totalAmount: 8250,
      status: 'completed',
    },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Withdrawal request submitted:', formData);
    setFormData({ amount: '', paymentMethod: '', accountName: '', notes: '' });
  };

  const totalWithdrawn = withdrawals
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.totalAmount, 0);

  const totalPending = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + w.totalAmount, 0);

  const availableCurrent = 25000 - totalWithdrawn - totalPending;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-semibold text-slate-900 mb-8">Payout Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Withdrawn */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow">
          <p className="text-sm font-semibold text-slate-500 uppercase mb-2 tracking-wide">
            Total Withdrawn
          </p>
          <p className="text-4xl font-bold text-blue-600 mb-1">${totalWithdrawn.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Completed withdrawals</p>
        </div>

        {/* Total Pending */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow">
          <p className="text-sm font-semibold text-slate-500 uppercase mb-2 tracking-wide">
            Total Pending
          </p>
          <p className="text-4xl font-bold text-yellow-600 mb-1">${totalPending.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Awaiting processing</p>
        </div>

        {/* Available Current */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow">
          <p className="text-sm font-semibold text-slate-500 uppercase mb-2 tracking-wide">
            Available Current
          </p>
          <p className="text-4xl font-bold text-green-600 mb-1">${availableCurrent.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Ready to withdraw</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Withdrawal Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Request Withdrawal</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Account Name</label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleInputChange}
                  placeholder="Enter account name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Instructions/Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Instructions or Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any special instructions..."
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Withdrawal History</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Date & Time</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Requested</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">Amount</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">VAT</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">Total</th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900">
                        <div className="font-semibold">{withdrawal.date}</div>
                        <div className="text-xs text-slate-500">{withdrawal.time}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{withdrawal.requestedDate}</td>
                      <td className="px-6 py-4 text-right text-slate-900 font-semibold">
                        ${withdrawal.requestAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900 font-semibold">
                        ${withdrawal.vat.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900 font-bold">
                        ${withdrawal.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeColor(
                            withdrawal.status
                          )}`}
                        >
                          {withdrawal.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payout;