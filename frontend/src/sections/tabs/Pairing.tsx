import { useEffect, useState } from 'react';

const API_BASE_URL = 'https://coprofitglobal-production.up.railway.app';

function getAuthContext() {
  const token = localStorage.getItem('accessToken');
  let userId = localStorage.getItem('userId');
  if (!userId) {
    const str = localStorage.getItem('user');
    if (str) {
      try {
        const obj = JSON.parse(str);
        userId = obj.id ?? obj._id ?? obj.userId;
      } catch {}
    }
  }
  return { token, userId };
}

interface PairingAward {
  id: string;
  periodKey: string;
  cycle: string;
  membershipTier: string;
  pairedPoints: number;
  payoutPhp: number;
  ratePhpPerPoint: number;
  capLimit: number;
  gcAwarded: number;
  createdAt: string;
}

interface PairingState {
  leftAvailable: number;
  rightAvailable: number;
  leftCarryOut: number;
  rightCarryOut: number;
  capLimit: number;
  capUsed: number;
}

interface MyPairingEntry {
  award: PairingAward;
  state: PairingState | null;
}

interface DownlinePairingEntry {
  award: PairingAward;
  username: string;
  membershipTier: string;
  depth: number;
  position: string | null;
}

function formatPhp(amount: number) {
  return amount.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

const TIER_STYLES: Record<string, string> = {
  bronze:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  silver:   'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  gold:     'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  platinum: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
};

function TierBadge({ tier }: { tier: string }) {
  const cls = TIER_STYLES[tier?.toLowerCase()] ?? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {tier}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-64 bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading pairing data...</p>
      </div>
    </div>
  );
}

// ── My Pairings ───────────────────────────────────────────────────────────

function MyPairings() {
  const [history, setHistory] = useState<MyPairingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const { token, userId } = getAuthContext();
        if (!token || !userId) { setError('Not authenticated.'); setLoading(false); return; }

        const res = await fetch(`${API_BASE_URL}/pairing/history/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch pairing history (${res.status})`);
        setHistory(await res.json());
      } catch (err: any) {
        setError(err.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-center py-16 text-red-400 text-sm">{error}</div>;

  const totalPaired = history.reduce((sum, { award }) => sum + award.pairedPoints, 0);
  const totalPayout = history.reduce((sum, { award }) => sum + award.payoutPhp, 0);
  const totalGc = history.reduce((sum, { award }) => sum + award.gcAwarded, 0);
  const thisMonth = history.filter(({ award }) =>
    (award.createdAt ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7)
  ).length;

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Records', value: history.length },
          { label: 'This Month', value: thisMonth },
          { label: 'Total Points Paired', value: totalPaired.toLocaleString() },
          { label: 'Total GC Awarded', value: totalGc },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">My Pairing History</h2>
            <p className="text-xs text-slate-400 mt-0.5">{history.length} record{history.length !== 1 ? 's' : ''} found</p>
          </div>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            ₱{formatPhp(totalPayout)} total
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Cycle</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Left Leg</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Right Leg</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Paired Points</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Payout</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">
                        ✦
                      </div>
                      <p className="text-slate-400 text-sm">No pairing records yet</p>
                      <p className="text-slate-300 text-xs">Records will appear once pairings are processed</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map(({ award, state }) => {
                  const { date, time } = formatDateTime(award.createdAt);
                  const leftPoints = state?.leftAvailable ?? award.pairedPoints;
                  const rightPoints = state?.rightAvailable ?? award.pairedPoints;

                  return (
                    <tr
                      key={award.id}
                      className="hover:bg-slate-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <p className="text-slate-900 font-medium">{date}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{time}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{award.cycle}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-blue-600">{leftPoints.toLocaleString()} pts</p>
                        {state && <p className="text-xs text-slate-400 mt-0.5">Carry: {state.leftCarryOut.toLocaleString()}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-green-600">{rightPoints.toLocaleString()} pts</p>
                        {state && <p className="text-xs text-slate-400 mt-0.5">Carry: {state.rightCarryOut.toLocaleString()}</p>}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {award.pairedPoints.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {award.gcAwarded > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            +{award.gcAwarded} GC
                          </span>
                        ) : (
                          <span className="font-medium text-slate-900">₱{formatPhp(award.payoutPhp)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {state ? `${state.capUsed}/${state.capLimit}` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Downline Pairings ─────────────────────────────────────────────────────

function DownlinePairings() {
  const [history, setHistory] = useState<DownlinePairingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const { token, userId } = getAuthContext();
        if (!token || !userId) { setError('Not authenticated.'); setLoading(false); return; }

        const res = await fetch(`${API_BASE_URL}/pairing/downline-history/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch downline history (${res.status})`);
        setHistory(await res.json());
      } catch (err: any) {
        setError(err.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-center py-16 text-red-400 text-sm">{error}</div>;

  const totalPaired = history.reduce((sum, { award }) => sum + award.pairedPoints, 0);
  const totalPayout = history.reduce((sum, { award }) => sum + award.payoutPhp, 0);
  const uniqueMembers = new Set(history.map(h => h.username)).size;
  const thisMonth = history.filter(({ award }) =>
    (award.createdAt ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7)
  ).length;

  const getInitials = (username: string) => username?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Records', value: history.length },
          { label: 'This Month', value: thisMonth },
          { label: 'Unique Members', value: uniqueMembers },
          { label: 'Total Points Paired', value: totalPaired.toLocaleString() },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Downline Pairing History</h2>
            <p className="text-xs text-slate-400 mt-0.5">{history.length} record{history.length !== 1 ? 's' : ''} from {uniqueMembers} member{uniqueMembers !== 1 ? 's' : ''}</p>
          </div>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            ₱{formatPhp(totalPayout)} total
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Member</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Cycle</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Tree Position</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Paired Points</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">
                        ✦
                      </div>
                      <p className="text-slate-400 text-sm">No downline pairing records found</p>
                      <p className="text-slate-300 text-xs">Records will appear once your downline generates pairings</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map(({ award, username, membershipTier, depth, position }) => {
                  const { date, time } = formatDateTime(award.createdAt);

                  return (
                    <tr
                      key={award.id}
                      className="hover:bg-slate-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
                            {getInitials(username)}
                          </div>
                          <span className="font-medium text-slate-900">{username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <TierBadge tier={membershipTier} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-900">{date}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{time}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{award.cycle}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">Level {depth}</p>
                        {position && (
                          <p className="text-xs text-slate-400 mt-0.5 capitalize">{position} leg</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {award.pairedPoints.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {award.gcAwarded > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            +{award.gcAwarded} GC
                          </span>
                        ) : (
                          <span className="font-medium text-slate-900">₱{formatPhp(award.payoutPhp)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

function Pairing() {
  const [activeTab, setActiveTab] = useState<'mine' | 'downline'>('mine');

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-6xl mx-auto px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Pairing History</h1>
          <p className="text-sm text-slate-400 mt-1">Track binary pairing rewards across your network</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-8 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'mine'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            My Pairings
          </button>
          <button
            onClick={() => setActiveTab('downline')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'downline'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Downline Pairings
          </button>
        </div>

        {activeTab === 'mine'     && <MyPairings />}
        {activeTab === 'downline' && <DownlinePairings />}

      </div>
    </div>
  );
}

export default Pairing;