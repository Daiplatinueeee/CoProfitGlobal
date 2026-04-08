import { useState } from 'react';

import maria from '../../assets/celso.webp';
import juan from '../../assets/celso.webp';
import ana from '../../assets/elmer-whitebg-removebg-preview.png';
import carlo from '../../assets/celso.webp';
import liza from '../../assets/ms1.jpg';
import marco from '../../assets/pk1.jpeg';
import rosa from '../../assets/ms2.jpg';
import diego from '../../assets/pk3.jpeg';
import elena from '../../assets/glende.webp';
import felix from '../../assets/ms1.webp';

interface LeaderboardEntry {
  rank: number;
  name: string;
  referrals: number;
  earnings: number;
  avatar: string;
}

const leaderboardData: LeaderboardEntry[] = [
  { rank: 1, name: 'Maria Santos', referrals: 48, earnings: 124500, avatar: maria },
  { rank: 2, name: 'Juan dela Cruz', referrals: 41, earnings: 98300, avatar: juan },
  { rank: 3, name: 'Ana Reyes', referrals: 37, earnings: 87600, avatar: ana },
  { rank: 4, name: 'Carlo Mendoza', referrals: 33, earnings: 74200, avatar: carlo },
  { rank: 5, name: 'Liza Fernandez', referrals: 29, earnings: 68900, avatar: liza },
  { rank: 6, name: 'Marco Villanueva', referrals: 26, earnings: 61400, avatar: marco },
  { rank: 7, name: 'Rosa Aquino', referrals: 22, earnings: 54800, avatar: rosa },
  { rank: 8, name: 'Diego Castillo', referrals: 19, earnings: 47300, avatar: diego },
  { rank: 9, name: 'Elena Torres', referrals: 16, earnings: 39700, avatar: elena },
  { rank: 10, name: 'Felix Bautista', referrals: 14, earnings: 33100, avatar: felix },
];

const PODIUM_ORDER = [1, 0, 2]; // 2nd | 1st | 3rd

const podiumMeta = [
  {
    label: '2nd',
    ringClass: 'ring-2 ring-slate-200',
    avatarSize: 'w-16 h-16',
    blockClass: 'h-16 bg-slate-50 border border-slate-200',
    nameSize: 'text-sm',
  },
  {
    label: '1st',
    ringClass: 'ring-4 ring-amber-300',
    avatarSize: 'w-20 h-20',
    blockClass: 'h-24 bg-amber-50 border border-amber-200',
    nameSize: 'text-base',
  },
  {
    label: '3rd',
    ringClass: 'ring-2 ring-orange-200',
    avatarSize: 'w-14 h-14',
    blockClass: 'h-10 bg-orange-50 border border-orange-100',
    nameSize: 'text-sm',
  },
];

const medals = ['🥇', '🥈', '🥉'];
const medalBadgeClass = [
  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
];

export default function Leaderboards() {
  const [activeTab] = useState<'referrals' | 'earnings'>('referrals');

  const sorted = [...leaderboardData].sort((a, b) =>
    activeTab === 'referrals' ? b.referrals - a.referrals : b.earnings - a.earnings
  );

  const top3 = sorted.slice(0, 3);

  const totalEarnings = leaderboardData.reduce((s, e) => s + e.earnings, 0);
  const totalReferrals = leaderboardData.reduce((s, e) => s + e.referrals, 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Leaderboards</h1>
          <p className="text-sm text-slate-400 mt-1">Top performers ranked by referrals and earnings</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Participants', value: leaderboardData.length.toString(), sub: 'Active members' },
            { label: 'Total Referrals', value: totalReferrals.toLocaleString(), sub: 'Combined network' },
            { label: 'Total Earnings', value: `₱${totalEarnings.toLocaleString()}`, sub: 'All time payouts' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Podium card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Hall of Fame</h2>
            <p className="text-xs text-slate-400 mt-0.5">Top 3 performers this period</p>
          </div>

          <div className="px-6 pt-8 pb-10">
            <div className="flex items-end justify-center gap-6 sm:gap-10">
              {PODIUM_ORDER.map((dataIdx, podIdx) => {
                const entry = top3[dataIdx];
                const meta = podiumMeta[podIdx];
                if (!entry) return null;

                return (
                  <div key={entry.rank} className="flex flex-col items-center gap-3 flex-1 max-w-37.5">

                    {/* Avatar */}
                    <div className={`rounded-full ${meta.ringClass} relative`}>
                      <img
                        src={entry.avatar}
                        alt={entry.name}
                        className={`${meta.avatarSize} rounded-full object-cover block`}
                      />
                      {/* Medal badge */}
                      <span
                        className="absolute -bottom-1 -right-1 text-lg leading-none"
                        aria-label={`${dataIdx === 0 ? '1st' : dataIdx === 1 ? '2nd' : '3rd'} place`}
                      >
                        {medals[dataIdx]}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="text-center">
                      <p className={`${meta.nameSize} font-semibold text-slate-900 leading-snug`}>{entry.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">₱{entry.earnings.toLocaleString()}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{entry.referrals} referrals</p>
                    </div>

                    {/* Podium block */}
                    <div className={`w-full rounded-xl flex items-center justify-center ${meta.blockClass}`}>
                      <span className="text-xs font-semibold text-slate-400">{meta.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Full Rankings</h2>
              <p className="text-xs text-slate-400 mt-0.5">{leaderboardData.length} participants</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide w-16">Rank</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Member</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Referrals</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Earnings</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Award</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((entry, i) => (
                  <tr key={entry.rank} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-3.5">
                      <span className={`text-sm font-semibold ${i < 3 ? 'text-slate-900' : 'text-slate-300'}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={entry.avatar}
                          alt={entry.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <span className="font-medium text-slate-900">{entry.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-700 font-medium">{entry.referrals}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-900">₱{entry.earnings.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-center">
                      {i < 3 ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${medalBadgeClass[i]}`}>
                          {medals[i]} {['Gold', 'Silver', 'Bronze'][i]}
                        </span>
                      ) : (
                        <span className="text-slate-200 text-xs select-none">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}