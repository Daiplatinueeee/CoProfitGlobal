import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ReferralCounts {
  direct: number;
  indirect: number;
  total: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  username: string;
  referrals: number;
  earnings: number;
  avatar: string | null;
  membershipTier: string;
  referralCounts?: ReferralCounts;
}

function avatarUrl(name: string, bg: string, size = 128) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true&size=${size}&rounded=true`;
}

const PODIUM_ORDER = [1, 0, 2]; // 2nd | 1st | 3rd

const podiumMeta = [
  {
    label: '2nd',
    ringClass: 'ring-2 ring-slate-200',
    avatarSize: 'w-14 h-14 sm:w-16 sm:h-16',
    blockClass: 'h-14 sm:h-16 bg-slate-50 border border-slate-200',
    nameSize: 'text-xs sm:text-sm',
  },
  {
    label: '1st',
    ringClass: 'ring-4 ring-amber-300',
    avatarSize: 'w-16 h-16 sm:w-20 sm:h-20',
    blockClass: 'h-20 sm:h-24 bg-amber-50 border border-amber-200',
    nameSize: 'text-sm sm:text-base',
  },
  {
    label: '3rd',
    ringClass: 'ring-2 ring-orange-200',
    avatarSize: 'w-12 h-12 sm:w-14 sm:h-14',
    blockClass: 'h-10 bg-orange-50 border border-orange-100',
    nameSize: 'text-xs sm:text-sm',
  },
];

const medals = ['🥇', '🥈', '🥉'];
const medalBadgeClass = [
  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
];

export default function Leaderboards() {
  const [activeTab] = useState<'referrals' | 'earnings'>('earnings');
  const [data, setData]                   = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [referralMap, setReferralMap]     = useState<Record<string, ReferralCounts>>({});
  const [referralsLoading, setReferralsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`${API_BASE_URL}/leaderboard?sortBy=${activeTab}&limit=50`)
      .then((res) => res.json())
      .then((json) => {
        setData(Array.isArray(json.entries) ? json.entries : []);
        setTotalParticipants(json.totalParticipants ?? 0);
      })
      .catch(() => { setData([]); setTotalParticipants(0); })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (data.length === 0) return;
    setReferralsLoading(true);

    Promise.all(
      data.map((entry) =>
        apiFetch(`${API_BASE_URL}/genealogy/referrals/${entry.userId}`)
          .then((res) => res.json())
          .then((json) => ({
            userId: entry.userId,
            counts: (json.counts ?? { direct: 0, indirect: 0, total: 0 }) as ReferralCounts,
          }))
          .catch(() => ({ userId: entry.userId, counts: { direct: 0, indirect: 0, total: 0 } as ReferralCounts }))
      )
    )
      .then((results) => {
        const map: Record<string, ReferralCounts> = {};
        results.forEach(({ userId, counts }) => { map[userId] = counts; });
        setReferralMap(map);
      })
      .finally(() => setReferralsLoading(false));
  }, [data]);

  const top3 = data.slice(0, 3);
  const totalEarnings  = data.reduce((s, e) => s + e.earnings, 0);
  const totalReferrals = data.reduce((s, e) => {
    const rc = referralMap[e.userId];
    return s + (rc?.total ?? e.referrals);
  }, 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Leaderboards</h1>
          <p className="text-sm text-slate-400 mt-1">Top performers ranked by referrals and earnings</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Participants', value: totalParticipants.toLocaleString(), sub: 'Active members' },
            { label: 'Total Referrals',    value: totalReferrals.toLocaleString(),    sub: 'Combined network' },
            { label: 'Total Earnings',     value: `₱${totalEarnings.toLocaleString()}`, sub: 'All time payouts' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Podium Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-5 sm:mb-6">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Hall of Fame</h2>
            <p className="text-xs text-slate-400 mt-0.5">Top 3 performers this period</p>
          </div>

          <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-8 sm:pb-10">
            {loading ? (
              <p className="text-center text-sm text-slate-400 py-8">Loading…</p>
            ) : top3.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">No data yet</p>
            ) : (
              <div className="flex items-end justify-center gap-4 sm:gap-6 md:gap-10">
                {PODIUM_ORDER.map((dataIdx, podIdx) => {
                  const entry = top3[dataIdx];
                  const meta  = podiumMeta[podIdx];
                  if (!entry) return null;
                  const imgSrc = entry.avatar || avatarUrl(entry.name, 'f59e0b');

                  return (
                    <div key={entry.rank} className="flex flex-col items-center gap-2 sm:gap-3 flex-1 max-w-30 sm:max-w-37.5">
                      {/* Avatar */}
                      <div className={`rounded-full ${meta.ringClass} relative`}>
                        <img
                          src={imgSrc}
                          alt={entry.name}
                          className={`${meta.avatarSize} rounded-full object-cover block`}
                        />
                        <span className="absolute -bottom-1 -right-1 text-base sm:text-lg leading-none" aria-label={`${dataIdx === 0 ? '1st' : dataIdx === 1 ? '2nd' : '3rd'} place`}>
                          {medals[dataIdx]}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="text-center px-1">
                        <p className={`${meta.nameSize} font-semibold text-slate-900 leading-snug line-clamp-2`}>{entry.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">₱{entry.earnings.toLocaleString()}</p>
                      </div>

                      {/* Podium block */}
                      <div className={`w-full rounded-xl flex items-center justify-center ${meta.blockClass}`}>
                        <span className="text-xs font-semibold text-slate-400">{meta.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rankings Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Full Rankings</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {data.length} shown of {totalParticipants.toLocaleString()} participants
              </p>
            </div>
            {referralsLoading && (
              <span className="text-xs text-slate-300 animate-pulse shrink-0">Loading referrals…</span>
            )}
          </div>

          {loading ? (
            <p className="text-center text-sm text-slate-400 py-12">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">No data yet</p>
          ) : (
            <>
              {/* Mobile: Card List */}
              <div className="block sm:hidden divide-y divide-slate-50">
                {data.map((entry, i) => {
                  const imgSrc = entry.avatar || avatarUrl(entry.name, '94a3b8');
                  const rc     = referralMap[entry.userId];
                  return (
                    <div key={entry.rank} className="px-4 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <span className={`text-sm font-bold w-6 shrink-0 ${i < 3 ? 'text-slate-900' : 'text-slate-300'}`}>
                          #{i + 1}
                        </span>
                        {/* Avatar */}
                        <img src={imgSrc} alt={entry.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        {/* Name + earnings */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{entry.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-green-600">{rc?.direct ?? 0} direct</span>
                            {' · '}
                            <span className="text-blue-500">{rc?.indirect ?? 0} indirect</span>
                          </p>
                        </div>
                        {/* Right side */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-slate-900">₱{entry.earnings.toLocaleString()}</p>
                          {i < 3 ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${medalBadgeClass[i]}`}>
                              {medals[i]}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tablet+: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide w-16">Rank</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Member</th>
                      <th className="text-right px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Direct</th>
                      <th className="text-right px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">Indirect</th>
                      <th className="text-right px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">Total Refs</th>
                      <th className="text-right px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Earnings</th>
                      <th className="text-center px-4 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Award</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.map((entry, i) => {
                      const imgSrc = entry.avatar || avatarUrl(entry.name, '94a3b8');
                      const rc     = referralMap[entry.userId];
                      return (
                        <tr key={entry.rank} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-4 sm:px-6 py-3.5">
                            <span className={`text-sm font-semibold ${i < 3 ? 'text-slate-900' : 'text-slate-300'}`}>
                              #{i + 1}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <img src={imgSrc} alt={entry.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              <span className="font-medium text-slate-900 truncate">{entry.name}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right">
                            {referralsLoading && !rc ? (
                              <span className="inline-block w-8 h-3 bg-slate-100 rounded animate-pulse" />
                            ) : (
                              <span className="font-medium text-green-600">{rc?.direct ?? 0}</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right hidden md:table-cell">
                            {referralsLoading && !rc ? (
                              <span className="inline-block w-8 h-3 bg-slate-100 rounded animate-pulse" />
                            ) : (
                              <span className="font-medium text-blue-500">{rc?.indirect ?? 0}</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right text-slate-700 font-medium hidden md:table-cell">
                            {referralsLoading && !rc ? (
                              <span className="inline-block w-8 h-3 bg-slate-100 rounded animate-pulse" />
                            ) : (
                              rc?.total ?? entry.referrals
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right font-semibold text-slate-900">
                            ₱{entry.earnings.toLocaleString()}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            {i < 3 ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${medalBadgeClass[i]}`}>
                                {medals[i]} {['Gold', 'Silver', 'Bronze'][i]}
                              </span>
                            ) : (
                              <span className="text-slate-200 text-xs select-none">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}