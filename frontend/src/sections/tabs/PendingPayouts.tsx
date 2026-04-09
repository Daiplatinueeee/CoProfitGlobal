import { useState } from 'react';
import { Clock, Check, X } from 'lucide-react';

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

const INITIAL_DATA: WithdrawalRecord[] = [
  {
    id: '1',
    amount: 2000,
    vat: 200,
    totalAmount: 2200,
    paymentMethod: 'bank',
    accountName: 'Maria Santos',
    notes: 'Please process ASAP',
    status: 'pending',
    createdAt: '2026-04-08T16:45:00Z',
  },
  {
    id: '2',
    amount: 1500,
    vat: 150,
    totalAmount: 1650,
    paymentMethod: 'wallet',
    accountName: 'Maria Santos',
    notes: '',
    status: 'pending',
    createdAt: '2026-04-07T10:30:00Z',
  },
  {
    id: '3',
    amount: 5000,
    vat: 500,
    totalAmount: 5500,
    paymentMethod: 'bank',
    accountName: 'Maria Santos',
    notes: 'BDO savings account',
    status: 'pending',
    createdAt: '2026-04-05T08:15:00Z',
  },
  {
    id: '4',
    amount: 800,
    vat: 80,
    totalAmount: 880,
    paymentMethod: 'check',
    accountName: 'Maria Santos',
    notes: '',
    status: 'pending',
    createdAt: '2026-04-03T13:55:00Z',
  },
  {
    id: '5',
    amount: 3200,
    vat: 320,
    totalAmount: 3520,
    paymentMethod: 'wallet',
    accountName: 'Maria Santos',
    notes: 'GCash number on file',
    status: 'pending',
    createdAt: '2026-04-01T17:20:00Z',
  },
];

function PendingPayouts() {
  const [records, setRecords] = useState<WithdrawalRecord[]>(INITIAL_DATA);

  const pendingRecords = records.filter((w) => w.status === 'pending');
  const totalHeld  = pendingRecords.reduce((sum, w) => sum + w.totalAmount, 0);
  const totalVat   = pendingRecords.reduce((sum, w) => sum + w.vat, 0);
  const oldestDate = pendingRecords.length
    ? new Date(pendingRecords[pendingRecords.length - 1].createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : '—';

  const handleApprove = (id: string) => {
    setRecords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: 'completed' } : w))
    );
  };

  const handleDecline = (id: string) => {
    setRecords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: 'rejected' } : w))
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Pending Payouts</h1>
          <p className="text-sm text-slate-400 mt-1">Payout requests currently awaiting processing</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Pending Requests',
              value: `${pendingRecords.length}`,
              sub: 'Awaiting admin approval',
            },
            {
              label: 'Total Amount Held',
              value: `₱${totalHeld.toLocaleString()}`,
              sub: `Incl. ₱${totalVat.toLocaleString()} VAT`,
            },
            {
              label: 'Oldest Request',
              value: oldestDate,
              sub: 'Earliest pending submission',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          {/* Card Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pending Requests</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {pendingRecords.length} record{pendingRecords.length !== 1 ? 's' : ''} awaiting action
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              All Pending
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Method</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Account</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">VAT</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Total</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
                        <p className="text-slate-400 text-sm">No pending payouts</p>
                        <p className="text-slate-300 text-xs">All requests have been processed</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingRecords.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {new Date(w.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(w.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-500 capitalize">{w.paymentMethod}</td>
                      <td className="px-6 py-4 text-slate-500">{w.accountName}</td>
                      <td className="px-6 py-4 text-right text-slate-900">₱{w.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-slate-500">₱{w.vat.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">₱{w.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(w.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecline(w.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Decline
                          </button>
                        </div>
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
  );
}

export default PendingPayouts;