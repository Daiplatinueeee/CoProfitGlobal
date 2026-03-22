import { useEffect, useState } from 'react';

// ─── Domain interfaces ────────────────────────────────────────────────────────

interface Member {
  id: string;
  username: string;
  email: string;
  profileImage: string;
  referralCode: string;
  leftLegPoints: number;
  rightLegPoints: number;
}

interface ReferralCounts {
  direct: number;
  indirect: number;
  total: number;
}

interface SpillOverBonus {
  totalPhp: number;
  totalReceivedMembers: number;
}

interface Sign5TierAward {
  tier: string;
  referralsCount: number;
  setsOfFive: number;
  cashSetsPaid: number;
  gcSetsPaid: number;
  cashAmountPhp: number;
  gcPointsAmount: number;
}

interface Sign5Bonus {
  totalCashPhp: number;
  totalGcPoints: number;
  awards: Sign5TierAward[];
}

interface PairingBonus {
  payoutPhp: number;
  pairedPoints: number;
  capLimit: number;
  capUsed: number;
  leftCarryOut: number;
  rightCarryOut: number;
}

interface LeadershipBonus {
  leadershipPhp: number;
  pairingTotalPhp: number;
  rate: number;
  qualified: boolean;
  unilevelPoints: number;
  threshold: number;
  windowStart: string | null;
  windowEnd: string | null;
}

// ─── Component props ──────────────────────────────────────────────────────────

interface MemberDetailsPanelProps {
  selectedMember: Member | null;
  onClose: () => void;
}

// ─── Shared auth headers helper ───────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberDetailsPanel({
  selectedMember,
  onClose,
}: MemberDetailsPanelProps) {
  const BASE = 'http://localhost:3000';
  const id = selectedMember?.id;

  // Referral counts
  const [referralCounts, setReferralCounts] = useState<ReferralCounts | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  // Spill-over bonus
  const [spillOver, setSpillOver] = useState<SpillOverBonus | null>(null);
  const [spillOverLoading, setSpillOverLoading] = useState(false);
  const [spillOverError, setSpillOverError] = useState<string | null>(null);

  // Sign-5 bonus
  const [sign5Bonus, setSign5Bonus] = useState<Sign5Bonus | null>(null);
  const [sign5Loading, setSign5Loading] = useState(false);
  const [sign5Error, setSign5Error] = useState<string | null>(null);

  // Pairing bonus
  const [pairingBonus, setPairingBonus] = useState<PairingBonus | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  // Leadership bonus
  const [leadershipBonus, setLeadershipBonus] = useState<LeadershipBonus | null>(null);
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [leadershipError, setLeadershipError] = useState<string | null>(null);

  // ─── Fetch referral counts ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setReferralLoading(true);
      setReferralError(null);
      setReferralCounts(null);
      try {
        const res = await fetch(`${BASE}/genealogy/referrals/${id}`, {
          method: 'GET',
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`Failed to fetch referral counts (${res.status})`);
        const data = await res.json();
        console.log('referral counts response:', data);

        // Supports: { counts: { direct, indirect } } | { direct, indirect } | { directReferralCount, ... }
        const direct   = data?.counts?.direct   ?? data?.direct   ?? data?.directReferralCount   ?? 0;
        const indirect = data?.counts?.indirect ?? data?.indirect ?? data?.indirectReferralCount ?? 0;
        setReferralCounts({
          direct,
          indirect,
          total: data?.counts?.total ?? data?.total ?? direct + indirect,
        });
      } catch (err: any) {
        setReferralError(err.message ?? 'Failed to load referral data');
      } finally {
        setReferralLoading(false);
      }
    };
    run();
  }, [id]);

  // ─── Fetch spill-over bonus (GET /spill/status/:userId) ──────────────────
  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setSpillOverLoading(true);
      setSpillOverError(null);
      setSpillOver(null);
      try {
        const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
        const res = await fetch(`${BASE}/spill/status/${id}?monthKey=${monthKey}`, {
          method: 'GET',
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`Failed to fetch spill-over bonus (${res.status})`);
        const data = await res.json();
        console.log('spill-over status response:', data);

        // Expected shape: { userId, monthKey, status: { totalPhp, totalReceivedMembers, ... } }
        // Falls back gracefully to flat shapes: { totalPhp } | { amount } | { bonus } | { value }
        const src = data?.status ?? data;
        setSpillOver({
          totalPhp:            src?.totalPhp ?? src?.amount ?? src?.bonus ?? src?.value ?? 0,
          totalReceivedMembers: src?.totalReceivedMembers ?? src?.memberCount ?? 0,
        });
      } catch (err: any) {
        setSpillOverError(err.message ?? 'Failed to load spill-over bonus');
      } finally {
        setSpillOverLoading(false);
      }
    };
    run();
  }, [id]);

  // ─── Fetch Sign-5 bonus (GET /sign5/status/:userId) ──────────────────────
  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setSign5Loading(true);
      setSign5Error(null);
      setSign5Bonus(null);
      try {
        const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
        const res = await fetch(`${BASE}/sign5/status/${id}?monthKey=${monthKey}`, {
          method: 'GET',
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`Failed to fetch Sign-5 bonus (${res.status})`);
        const data = await res.json();
        console.log('sign5 status response:', data);

        // Response: { userId, monthKey, status: { bronzeCount, ... },
        //             awards: [ { tier, referralsCount, setsOfFive, cashSetsPaid,
        //                         gcSetsPaid, cashAmountPhp, gcPointsAmount } ] }
        const awards: Sign5TierAward[] = (data?.awards ?? []).map((a: any) => ({
          tier:           a.tier            ?? '',
          referralsCount: a.referralsCount  ?? 0,
          setsOfFive:     a.setsOfFive      ?? 0,
          cashSetsPaid:   a.cashSetsPaid    ?? 0,
          gcSetsPaid:     a.gcSetsPaid      ?? 0,
          cashAmountPhp:  a.cashAmountPhp   ?? 0,
          gcPointsAmount: a.gcPointsAmount  ?? 0,
        }));
        setSign5Bonus({
          totalCashPhp:  awards.reduce((s, a) => s + a.cashAmountPhp,  0),
          totalGcPoints: awards.reduce((s, a) => s + a.gcPointsAmount, 0),
          awards,
        });
      } catch (err: any) {
        setSign5Error(err.message ?? 'Failed to load Sign-5 bonus');
      } finally {
        setSign5Loading(false);
      }
    };
    run();
  }, [id]);

  // ─── Fetch pairing bonus (GET /pairing/state/:userId) ────────────────────
  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setPairingLoading(true);
      setPairingError(null);
      setPairingBonus(null);
      try {
        const periodKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const res = await fetch(`${BASE}/pairing/state/${id}?periodKey=${periodKey}`, {
          method: 'GET',
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`Failed to fetch pairing bonus (${res.status})`);
        const data = await res.json();
        console.log('pairing state response:', data);

        // Response: { periodKey,
        //   state:  { pairedPoints, payoutPhp, capLimit, capUsed, leftCarryOut, rightCarryOut },
        //   award:  { payoutPhp, pairedPoints, capLimit } }
        // Prefer award.payoutPhp (confirmed payout), fall back to state.
        const src = data?.award ?? data?.state ?? null;
        setPairingBonus({
          payoutPhp:     src?.payoutPhp              ?? 0,
          pairedPoints:  src?.pairedPoints           ?? data?.state?.pairedPoints  ?? 0,
          capLimit:      src?.capLimit               ?? data?.state?.capLimit      ?? 1200,
          capUsed:       data?.state?.capUsed        ?? src?.pairedPoints          ?? 0,
          leftCarryOut:  data?.state?.leftCarryOut   ?? 0,
          rightCarryOut: data?.state?.rightCarryOut  ?? 0,
        });
      } catch (err: any) {
        setPairingError(err.message ?? 'Failed to load pairing bonus');
      } finally {
        setPairingLoading(false);
      }
    };
    run();
  }, [id]);

  // ─── Fetch leadership bonus (GET /leadership/status/:userId) ─────────────
  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setLeadershipLoading(true);
      setLeadershipError(null);
      setLeadershipBonus(null);
      try {
        const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
        const res = await fetch(`${BASE}/leadership/status/${id}?monthKey=${monthKey}`, {
          method: 'GET',
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`Failed to fetch leadership bonus (${res.status})`);
        const data = await res.json();
        console.log('leadership status response:', data);

        // Response from getStatus():
        // { userId, monthKey,
        //   qualification: { unilevelPoints, threshold, qualified, windowStart, windowEnd },
        //   award:         { pairingTotalPhp, rate, leadershipPhp } }
        const qual  = data?.qualification ?? null;
        const award = data?.award         ?? null;
        setLeadershipBonus({
          leadershipPhp:   award?.leadershipPhp   ?? 0,
          pairingTotalPhp: award?.pairingTotalPhp ?? 0,
          rate:            award?.rate            ?? 0.05,
          qualified:       qual?.qualified        ?? false,
          unilevelPoints:  qual?.unilevelPoints   ?? 0,
          threshold:       qual?.threshold        ?? 1500,
          windowStart:     qual?.windowStart      ?? null,
          windowEnd:       qual?.windowEnd        ?? null,
        });
      } catch (err: any) {
        setLeadershipError(err.message ?? 'Failed to load leadership bonus');
      } finally {
        setLeadershipLoading(false);
      }
    };
    run();
  }, [id]);

  if (!selectedMember) return null;

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto shadow-xl">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl text-gray-900">Member Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile card */}
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50">
          <div className="flex flex-col items-center">
            <img
              src={selectedMember.profileImage}
              alt={selectedMember.username}
              className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md mb-4"
            />
            <h4 className="font-semibold text-xl text-gray-900 mb-1">
              {selectedMember.username}
            </h4>
            <p className="text-sm text-gray-600 mb-4">{selectedMember.email}</p>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-blue-200">
              <p className="text-xs text-gray-700 font-medium">
                PIN: {selectedMember.referralCode}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-blue-200/50">
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-center border border-blue-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Left Leg</p>
              <p className="text-2xl font-bold text-blue-600">
                {selectedMember.leftLegPoints}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-center border border-indigo-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Right Leg</p>
              <p className="text-2xl font-bold text-indigo-600">
                {selectedMember.rightLegPoints}
              </p>
            </div>
          </div>
        </div>

        {/* Bonuses */}
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Bonuses
          </h4>
          <div className="space-y-2.5">

            {/* ── Direct Referral ────────────────────────────────────────── */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-green-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Total Direct Referral</p>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-green-600 mb-1">
                {referralLoading ? 'Loading...' : referralError ? '—'
                  : (referralCounts?.direct ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Direct line between leader &amp; downline
              </p>
            </div>

            {/* ── Indirect Referral ──────────────────────────────────────── */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-purple-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Total Indirect Referral</p>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-purple-600 mb-1">
                {referralLoading ? 'Loading...' : referralError ? '—'
                  : (referralCounts?.indirect ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Downline through another leader
              </p>
            </div>

            {/* ── Spill-Over Bonus ───────────────────────────────────────── */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-orange-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Spill Over Bonus</p>
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-orange-600 mb-1">
                {spillOverLoading ? 'Loading...' : spillOverError ? '—'
                  : `₱ ${(spillOver?.totalPhp ?? 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                When downline is given by another leader
              </p>
              {!spillOverLoading && !spillOverError && spillOver && spillOver.totalReceivedMembers > 0 && (
                <div className="text-xs text-orange-700 mt-2 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200">
                  {spillOver.totalReceivedMembers.toLocaleString()} spill-over member
                  {spillOver.totalReceivedMembers !== 1 ? 's' : ''} this month
                </div>
              )}
            </div>

            {/* ── Sign-5 Bonus ───────────────────────────────────────────── */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-blue-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Sign-5 Bonus</p>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-blue-600 mb-1">
                {sign5Loading ? 'Loading...' : sign5Error ? '—'
                  : `₱ ${(sign5Bonus?.totalCashPhp ?? 0).toLocaleString()}`}
              </p>
              {!sign5Loading && !sign5Error && sign5Bonus && sign5Bonus.totalGcPoints > 0 && (
                <p className="text-xs text-blue-500 mb-1">
                  + {sign5Bonus.totalGcPoints.toLocaleString()} GC pts
                </p>
              )}
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Limited to 5 cash sets per tier / month
              </p>
              {!sign5Loading && !sign5Error && sign5Bonus &&
                sign5Bonus.awards.filter((a) => a.setsOfFive > 0).length > 0 && (
                <div className="mt-2 space-y-1">
                  {sign5Bonus.awards
                    .filter((a) => a.setsOfFive > 0)
                    .map((a) => (
                      <div
                        key={a.tier}
                        className="flex items-center justify-between text-xs bg-white/70 px-2.5 py-1.5 rounded-lg border border-blue-100"
                      >
                        <span className="font-medium text-gray-700 capitalize">
                          {a.tier.toLowerCase()}
                        </span>
                        <span className="text-gray-500">
                          {a.referralsCount} ref{a.referralsCount !== 1 ? 's' : ''} · {a.setsOfFive} set{a.setsOfFive !== 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold text-blue-600">
                          ₱ {a.cashAmountPhp.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── Pairing Bonus ──────────────────────────────────────────── */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-cyan-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Pairing Bonus</p>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-cyan-600 mb-1">
                {pairingLoading ? 'Loading...' : pairingError ? '—'
                  : `₱ ${(pairingBonus?.payoutPhp ?? 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                L {selectedMember.leftLegPoints} • R {selectedMember.rightLegPoints}
              </p>
              {!pairingLoading && !pairingError && pairingBonus && (
                <>
                  <div className="text-xs text-amber-700 mt-2 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                    Paired: {pairingBonus.pairedPoints.toLocaleString()} pts / cap {pairingBonus.capLimit.toLocaleString()}
                  </div>
                  {(pairingBonus.leftCarryOut > 0 || pairingBonus.rightCarryOut > 0) && (
                    <div className="text-xs text-gray-500 mt-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                      Carry out — L: {pairingBonus.leftCarryOut.toLocaleString()} • R: {pairingBonus.rightCarryOut.toLocaleString()}
                    </div>
                  )}
                </>
              )}
              {!pairingLoading && !pairingError && !pairingBonus && (
                <div className="text-xs text-amber-700 mt-2 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                  Lowest pair:{' '}
                  {Math.min(selectedMember.leftLegPoints, selectedMember.rightLegPoints).toLocaleString()}
                </div>
              )}
            </div>

            {/* ── Leadership Bonus ───────────────────────────────────────── */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-rose-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Leadership Bonus</p>
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-rose-600 mb-1">
                {leadershipLoading ? 'Loading...' : leadershipError ? '—'
                  : `₱ ${(leadershipBonus?.leadershipPhp ?? 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Monthly bonus for leaders
              </p>
              {!leadershipLoading && !leadershipError && leadershipBonus && (
                <>
                  {/* Qualification badge */}
                  <div className={`text-xs mt-2 px-2.5 py-1.5 rounded-lg border font-medium
                    ${leadershipBonus.qualified
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-gray-500 bg-gray-100 border-gray-200'}`}
                  >
                    {leadershipBonus.qualified ? '✓ Qualified' : '✗ Not qualified'} —{' '}
                    {leadershipBonus.unilevelPoints.toLocaleString()} /{' '}
                    {leadershipBonus.threshold.toLocaleString()} unilevel pts
                  </div>

                  {/* Pairing base + rate — only shown when awarded */}
                  {leadershipBonus.qualified && leadershipBonus.pairingTotalPhp > 0 && (
                    <div className="text-xs text-rose-600 mt-1.5 px-2.5 py-1.5 bg-rose-50 rounded-lg border border-rose-200">
                      {(leadershipBonus.rate * 100).toFixed(0)}% of ₱{' '}
                      {leadershipBonus.pairingTotalPhp.toLocaleString()} pairing total
                    </div>
                  )}

                  {/* Claim window */}
                  {leadershipBonus.windowStart && leadershipBonus.windowEnd && (
                    <div className="text-xs text-gray-400 mt-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                      Window:{' '}
                      {new Date(leadershipBonus.windowStart).toLocaleDateString()} –{' '}
                      {new Date(leadershipBonus.windowEnd).toLocaleDateString()}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}