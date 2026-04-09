import { useState } from 'react';
import { Clock, Check, X } from 'lucide-react';

interface WithdrawalRecord {
  id: string;
  amount: number;
  date: string;
  time: string;
  status: 'pending' | 'completed' | 'failed';
}

const INITIAL_DATA: WithdrawalRecord[] = [
  { id: '1', amount: 1000, date: '04/08/2026', time: '16:45', status: 'pending' },
  { id: '2', amount: 750,  date: '04/07/2026', time: '10:30', status: 'pending' },
  { id: '3', amount: 2500, date: '04/05/2026', time: '08:15', status: 'pending' },
  { id: '4', amount: 300,  date: '04/03/2026', time: '13:55', status: 'pending' },
  { id: '5', amount: 600,  date: '04/01/2026', time: '17:20', status: 'pending' },
];

function PendingWithdrawGC() {
  const [records, setRecords] = useState<WithdrawalRecord[]>(INITIAL_DATA);

  const pendingRecords = records.filter((r) => r.status === 'pending');
  const totalPendingGC = pendingRecords.reduce((sum, r) => sum + r.amount, 0);
  const oldestDate = pendingRecords.length
    ? pendingRecords[pendingRecords.length - 1].date
    : '—';

  const handleApprove = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'completed' } : r))
    );
  };

  const handleDecline = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'failed' } : r))
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Pending GC Withdrawals</h1>
          <p className="text-sm text-slate-400 mt-1">GC withdrawal requests currently awaiting processing</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Pending Requests',
              value: `${pendingRecords.length}`,
              valueSuffix: '',
              sub: 'Awaiting admin approval',
            },
            {
              label: 'Total GC Held',
              value: totalPendingGC.toLocaleString(),
              valueSuffix: 'GC',
              sub: 'Combined pending amount',
            },
            {
              label: 'Oldest Request',
              value: oldestDate,
              valueSuffix: '',
              sub: 'Earliest pending submission',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">
                {stat.value}{' '}
                {stat.valueSuffix && (
                  <span className="text-sm font-medium text-slate-400">{stat.valueSuffix}</span>
                )}
              </p>
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">#</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Time</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
                        <p className="text-slate-400 text-sm">No pending GC withdrawals</p>
                        <p className="text-slate-300 text-xs">All requests have been processed</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 text-slate-400 text-xs">{index + 1}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {record.amount.toLocaleString()}{' '}
                        <span className="text-slate-400 font-normal text-xs">GC</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{record.date}</td>
                      <td className="px-6 py-4 text-slate-500">{record.time}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(record.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecline(record.id)}
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

export default PendingWithdrawGC;