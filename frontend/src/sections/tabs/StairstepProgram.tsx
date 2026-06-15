import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import {
  Trophy, Star, Gem, Crown, Globe,
  Users, Wallet, CheckCircle, Lock, ChevronRight,
  TrendingUp, Gift, Zap, Shield,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getUserId(): string | null {
  let id = localStorage.getItem('userId');
  if (!id) {
    const str = localStorage.getItem('user');
    if (str) {
      try { id = JSON.parse(str)?.id ?? JSON.parse(str)?._id ?? null; } catch { id = null; }
    }
  }
  return id;
}

// ─── Rank definitions ─────────────────────────────────────────────────────────

interface RankDef {
  rank: number;
  title: string;
  directSponsors: number;
  accumulatedIncome: number;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  icon: React.ReactNode;
  benefits: string[];
}

const RANKS: RankDef[] = [
  {
    rank: 1,
    title: 'Global Ambassador',
    directSponsors: 60,
    accumulatedIncome: 1_000_000,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    ringColor: 'ring-yellow-300',
    icon: <Globe size={20} />,
    benefits: [
      'Maximum commission rates across all levels',
      'Exclusive Global Ambassador rewards & perks',
      'VIP access to all company events',
      'Dedicated corporate support line',
      'Annual luxury incentive trip',
    ],
  },
  {
    rank: 2,
    title: 'Diamond Executive',
    directSponsors: 35,
    accumulatedIncome: 599_000,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    ringColor: 'ring-cyan-300',
    icon: <Gem size={20} />,
    benefits: [
      'Premium leadership bonus multiplier',
      'Diamond Executive recognition badge',
      'Priority payout processing',
      'Quarterly leadership masterclass access',
      'Enhanced Sign-5 qualification',
    ],
  },
  {
    rank: 3,
    title: 'Elite Builder',
    directSponsors: 20,
    accumulatedIncome: 299_000,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    ringColor: 'ring-violet-300',
    icon: <Crown size={20} />,
    benefits: [
      'Increased indirect referral bonus rate',
      'Elite Builder status on leaderboard',
      'Monthly bonus eligibility boost',
      'Access to elite mentorship resources',
    ],
  },
  {
    rank: 4,
    title: 'Rising Star',
    directSponsors: 10,
    accumulatedIncome: 99_000,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    ringColor: 'ring-orange-300',
    icon: <Star size={20} />,
    benefits: [
      'Direct referral bonus enhancement',
      'Rising Star recognition badge',
      'Leadership bonus eligibility',
      'Early access to new product launches',
    ],
  },
  {
    rank: 5,
    title: 'Distributor',
    directSponsors: 0,
    accumulatedIncome: 0,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    ringColor: 'ring-slate-200',
    icon: <Trophy size={20} />,
    benefits: [
      'Access to all Unilevel products',
      'Earn PV on every purchase',
      'Direct referral commission',
      'Binary pairing bonus',
    ],
  },
];

// Sorted highest to lowest for display (1 → 5)
const RANKS_DISPLAY = [...RANKS].sort((a, b) => a.rank - b.rank);

function formatPhp(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 0)}k`;
  return n.toLocaleString();
}

function getCurrentRank(directSponsors: number, totalIncome: number): RankDef {
  // Check ranks from highest (1) to lowest (5), return first one user qualifies for
  for (const r of RANKS_DISPLAY) {
    if (directSponsors >= r.directSponsors && totalIncome >= r.accumulatedIncome) {
      return r;
    }
  }
  return RANKS.find(r => r.rank === 5)!;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StairstepProgram() {
  const [directSponsors, setDirectSponsors] = useState<number | null>(null);
  const [totalIncome, setTotalIncome] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    const userId = getUserId();
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      apiFetch(`${API_BASE_URL}/genealogy/referrals/${userId}`).then(r => r.ok ? r.json() : null),
      apiFetch(`${API_BASE_URL}/wallet/${userId}/income-summary`).then(r => r.ok ? r.json() : null),
    ])
      .then(([referralData, incomeData]) => {
        setDirectSponsors(referralData?.counts?.direct ?? 0);
        setTotalIncome(incomeData?.totalIncome ?? 0);
      })
      .catch(() => {
        setDirectSponsors(0);
        setTotalIncome(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sponsors = directSponsors ?? 0;
  const income = totalIncome ?? 0;
  const currentRank = getCurrentRank(sponsors, income);
  const nextRank = RANKS_DISPLAY.find(r => r.rank < currentRank.rank) ?? null;

  // Progress toward next rank
  const sponsorPct = nextRank
    ? Math.min(100, Math.round((sponsors / nextRank.directSponsors) * 100))
    : 100;
  const incomePct = nextRank
    ? Math.min(100, Math.round((income / nextRank.accumulatedIncome) * 100))
    : 100;

  return (
    <div className="bg-white min-h-screen">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Stairstep Program
            </h1>
            {!loading && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ${currentRank.bgColor} ${currentRank.color} ${currentRank.ringColor}`}>
                {currentRank.title}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Advance through ranks by growing your network and accumulating income
          </p>
        </div>

        {/* ── Current rank hero ── */}
        {loading ? (
          <div className="rounded-2xl border border-slate-100 p-6 mb-6 animate-pulse space-y-4">
            <div className="h-5 bg-slate-100 rounded w-1/3" />
            <div className="h-10 bg-slate-100 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
          </div>
        ) : (
          <div className={`rounded-2xl border ${currentRank.borderColor} ${currentRank.bgColor} p-6 mb-6`}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white shadow-sm border ${currentRank.borderColor} ${currentRank.color}`}>
                {currentRank.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-widest mb-0.5 ${currentRank.color}`}>
                  Current Rank {currentRank.rank}
                </p>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">{currentRank.title}</h2>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700">
                      <span className="font-bold text-slate-900">{sponsors.toLocaleString()}</span>
                      <span className="text-slate-400"> direct sponsors</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700">
                      <span className="font-bold text-slate-900">₱{income.toLocaleString()}</span>
                      <span className="text-slate-400"> accumulated income</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress to next rank */}
            {nextRank && (
              <div className="mt-5 pt-5 border-t border-white/60">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={13} className={currentRank.color} />
                  <p className="text-xs font-semibold text-slate-700">
                    Progress to <span className={currentRank.color}>{nextRank.title}</span> (Rank {nextRank.rank})
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Direct sponsors bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users size={11} /> Direct Sponsors
                      </span>
                      <span className="font-semibold text-slate-700">
                        {sponsors} / {nextRank.directSponsors}
                      </span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${sponsorPct >= 100 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        style={{ width: `${sponsorPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {sponsorPct >= 100
                        ? '✓ Requirement met'
                        : `${nextRank.directSponsors - sponsors} more needed`}
                    </p>
                  </div>
                  {/* Accumulated income bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Wallet size={11} /> Accumulated Income
                      </span>
                      <span className="font-semibold text-slate-700">
                        ₱{formatPhp(income)} / ₱{formatPhp(nextRank.accumulatedIncome)}
                      </span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${incomePct >= 100 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        style={{ width: `${incomePct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {incomePct >= 100
                        ? '✓ Requirement met'
                        : `₱${formatPhp(nextRank.accumulatedIncome - income)} more needed`}
                    </p>
                  </div>
                </div>
                {sponsorPct >= 100 && incomePct >= 100 && (
                  <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700">
                      You meet all requirements for {nextRank.title}! Contact your admin to upgrade.
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentRank.rank === 1 && (
              <div className="mt-5 pt-5 border-t border-white/60 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">
                  You have reached the highest rank — Global Ambassador!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── All ranks ladder ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Shield size={14} className="text-slate-400" />
            All Ranks
          </h3>

          {RANKS_DISPLAY.map((rankDef) => {
            const isCurrentRank = rankDef.rank === currentRank.rank;
            const isAchieved = rankDef.rank >= currentRank.rank;
            const isExpanded = expandedRank === rankDef.rank;
            const isLocked = rankDef.rank < currentRank.rank;

            return (
              <div
                key={rankDef.rank}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isCurrentRank
                    ? `${rankDef.borderColor} ${rankDef.bgColor} shadow-sm`
                    : isLocked
                    ? 'border-slate-100 bg-slate-50/50 opacity-60'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <button
                  className="w-full text-left px-5 py-4 flex items-center gap-4"
                  onClick={() => setExpandedRank(isExpanded ? null : rankDef.rank)}
                >
                  {/* Rank number */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border ${
                    isCurrentRank
                      ? `${rankDef.bgColor} ${rankDef.color} ${rankDef.borderColor}`
                      : isAchieved
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {isAchieved && !isCurrentRank ? <CheckCircle size={14} /> : rankDef.rank}
                  </div>

                  {/* Icon + title */}
                  <div className={`shrink-0 ${isCurrentRank ? rankDef.color : isLocked ? 'text-slate-300' : 'text-slate-400'}`}>
                    {rankDef.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isCurrentRank ? 'text-slate-900' : isLocked ? 'text-slate-400' : 'text-slate-700'}`}>
                      {rankDef.title}
                      {isCurrentRank && (
                        <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${rankDef.bgColor} ${rankDef.color}`}>
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {rankDef.directSponsors === 0
                        ? 'No requirements'
                        : `${rankDef.directSponsors} direct sponsors · ₱${formatPhp(rankDef.accumulatedIncome)} income`}
                    </p>
                  </div>

                  {/* Lock or chevron */}
                  <div className="shrink-0">
                    {isLocked
                      ? <Lock size={14} className="text-slate-300" />
                      : <ChevronRight
                          size={14}
                          className={`text-slate-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                    }
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Requirements */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Requirements</p>
                        {rankDef.directSponsors === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                            No requirements — all members start here
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                sponsors >= rankDef.directSponsors ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {sponsors >= rankDef.directSponsors
                                  ? <CheckCircle size={11} />
                                  : <Users size={11} />
                                }
                              </div>
                              <span className="text-xs text-slate-600">
                                <span className="font-semibold">{rankDef.directSponsors}</span> direct sponsors
                                {!loading && (
                                  <span className={`ml-1 ${sponsors >= rankDef.directSponsors ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    (you have {sponsors})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                income >= rankDef.accumulatedIncome ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {income >= rankDef.accumulatedIncome
                                  ? <CheckCircle size={11} />
                                  : <Wallet size={11} />
                                }
                              </div>
                              <span className="text-xs text-slate-600">
                                ₱<span className="font-semibold">{rankDef.accumulatedIncome.toLocaleString()}</span> accumulated income
                                {!loading && (
                                  <span className={`ml-1 ${income >= rankDef.accumulatedIncome ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    (you have ₱{income.toLocaleString()})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Benefits */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Benefits</p>
                        <div className="space-y-1.5">
                          {rankDef.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Zap size={11} className={`shrink-0 mt-0.5 ${rankDef.color}`} />
                              <span className="text-xs text-slate-600">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── How it works ── */}
        <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Gift size={14} className="text-slate-400" />
            How Ranking Works
          </h3>
          <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
            <p>• Your rank is determined by two factors: <span className="font-medium text-slate-700">direct sponsors</span> (people you personally recruited) and <span className="font-medium text-slate-700">accumulated income</span> (total PHP earned in your wallet).</p>
            <p>• You must meet <span className="font-medium text-slate-700">both</span> requirements to qualify for a rank — meeting only one is not sufficient.</p>
            <p>• Once qualified, contact your admin to have your rank officially updated.</p>
            <p>• Ranks are permanent once achieved and do not regress.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
