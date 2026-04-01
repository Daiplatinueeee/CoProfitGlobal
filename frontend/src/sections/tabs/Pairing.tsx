import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:3000';

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

const TIER_COLORS: Record<string, string> = {
  bronze:   'bg-orange-100 text-orange-700',
  silver:   'bg-slate-100 text-slate-600',
  gold:     'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

function TierBadge({ tier }: { tier: string }) {
  const cls = TIER_COLORS[tier?.toLowerCase()] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${cls}`}>
      {tier}
    </span>
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

  if (loading) return <div className="text-center py-16 text-slate-500">Loading...</div>;
  if (error)   return <div className="text-center py-16 text-red-500">{error}</div>;
  if (history.length === 0) return <div className="text-center py-16 text-slate-400">No pairing records found.</div>;

  return (
    <div className="space-y-4">
      {history.map(({ award, state }) => {
        const { date, time } = formatDateTime(award.createdAt);
        const leftPoints  = state?.leftAvailable  ?? award.pairedPoints;
        const rightPoints = state?.rightAvailable ?? award.pairedPoints;

        return (
          <div
            key={award.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-slate-200"
          >
            <div className="mb-4 pb-4 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                {date} • {time}
              </p>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {award.cycle}
              </span>
            </div>

            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Left Leg</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">{leftPoints.toLocaleString()}</span>
                    <span className="text-sm text-slate-500">pts</span>
                  </div>
                  {state && <p className="text-xs text-slate-400 mt-1">Carry out: {state.leftCarryOut.toLocaleString()}</p>}
                </div>
              </div>

              <div className="text-2xl text-slate-300 font-light">|</div>

              <div className="flex-1">
                <div className="bg-green-50 rounded-lg p-5 border border-green-100">
                  <p className="text-xs font-semibold text-green-600 uppercase mb-2">Right Leg</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">{rightPoints.toLocaleString()}</span>
                    <span className="text-sm text-slate-500">pts</span>
                  </div>
                  {state && <p className="text-xs text-slate-400 mt-1">Carry out: {state.rightCarryOut.toLocaleString()}</p>}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center min-w-fit">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Paired Points</p>
                <p className="text-sm font-bold text-slate-700 mb-2">{award.pairedPoints.toLocaleString()} pts</p>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Payout</p>
                <div className="bg-linear-to-br from-purple-100 to-purple-50 rounded-lg px-6 py-4 border border-purple-200">
                  <p className="text-2xl font-bold text-purple-600">₱{formatPhp(award.payoutPhp)}</p>
                </div>
                {state && <p className="text-xs text-slate-400 mt-2">Cap: {state.capUsed}/{state.capLimit}</p>}
              </div>
            </div>
          </div>
        );
      })}
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

  if (loading) return <div className="text-center py-16 text-slate-500">Loading...</div>;
  if (error)   return <div className="text-center py-16 text-red-500">{error}</div>;
  if (history.length === 0) return <div className="text-center py-16 text-slate-400">No downline pairing records found.</div>;

  return (
    <div className="space-y-4">
      {history.map(({ award, username, membershipTier, depth, position }) => {
        const { date, time } = formatDateTime(award.createdAt);

        return (
          <div
            key={award.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-slate-200"
          >
            {/* Header */}
            <div className="mb-4 pb-4 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                {date} • {time}
              </p>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {award.cycle}
              </span>
            </div>

            {/* Member + Tree info + Payout */}
            <div className="flex items-center justify-between gap-6">
              {/* Member info */}
              <div className="flex-1">
                <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Member</p>
                  <p className="text-lg font-bold text-slate-900 mb-2">{username}</p>
                  <TierBadge tier={membershipTier} />
                </div>
              </div>

              <div className="text-2xl text-slate-300 font-light">|</div>

              {/* Tree depth */}
              <div className="flex-1">
                <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Tree Position</p>
                  <p className="text-3xl font-bold text-indigo-600">Level {depth}</p>
                  {position && (
                    <p className="text-xs text-slate-500 mt-1 capitalize">{position} leg</p>
                  )}
                </div>
              </div>

              {/* Payout */}
              <div className="flex flex-col items-center justify-center min-w-fit">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Paired Points</p>
                <p className="text-sm font-bold text-slate-700 mb-2">{award.pairedPoints.toLocaleString()} pts</p>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Payout</p>
                <div className="bg-linear-to-br from-purple-100 to-purple-50 rounded-lg px-6 py-4 border border-purple-200">
                  <p className="text-2xl font-bold text-purple-600">₱{formatPhp(award.payoutPhp)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

function Pairing() {
  const [activeTab, setActiveTab] = useState<'mine' | 'downline'>('mine');

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg">
      <h2 className="text-3xl font-semibold text-slate-900 mb-6">Pairing History</h2>

      {/* Tab Toggle */}
      <div className="flex gap-2 mb-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'mine'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          My Pairings
        </button>
        <button
          onClick={() => setActiveTab('downline')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'downline'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Downline Pairings
        </button>
      </div>

      {activeTab === 'mine'     && <MyPairings />}
      {activeTab === 'downline' && <DownlinePairings />}
    </div>
  );
}

export default Pairing;
