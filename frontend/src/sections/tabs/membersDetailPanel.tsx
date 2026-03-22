import { useEffect, useState } from 'react';

interface Member {
  id: string;
  username: string;
  email: string;
  profileImage: string;
  referralCode: string;
  leftLegPoints: number;
  rightLegPoints: number;
  directReferralBonus?: number;
  indirectReferralBonus?: number;
  spillOverBonus?: number;
  sign5Bonus?: number;
  leadershipBonus?: number;
  pairingBonus?: number;
}

interface ReferralCounts {
  direct: number;
  indirect: number;
  total: number;
}

interface GenealogyStats {
  referralCounts: ReferralCounts;
  spillOverBonus: number;
  sign5Bonus: number;
  pairingBonus: number;
  leadershipBonus: number;
}

interface MemberDetailsPanelProps {
  selectedMember: Member | null;
  onClose: () => void;
}

export default function MemberDetailsPanel({
  selectedMember,
  onClose,
}: MemberDetailsPanelProps) {
  const [genealogyStats, setGenealogyStats] = useState<GenealogyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMember?.id) return;

    const fetchGenealogyStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      setGenealogyStats(null);

      try {
        const token = localStorage.getItem('token');

        const res = await fetch(
          `http://localhost:3000/users/genealogy?userId=${selectedMember.id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch genealogy stats (${res.status})`);
        }

        const data = await res.json();
        console.log('genealogy stats response:', data);

        // Flexible mapping — supports flat or nested response shapes:
        // { directReferralCount, indirectReferralCount, spillOverBonus, sign5Bonus, pairingBonus, leadershipBonus }
        // { counts: { direct, indirect }, bonuses: { spillOver, sign5, pairing, leadership } }
        // { direct, indirect, spillOverBonus, ... }
        const direct =
          data?.counts?.direct ??
          data?.direct ??
          data?.directReferralCount ??
          data?.directCount ??
          0;

        const indirect =
          data?.counts?.indirect ??
          data?.indirect ??
          data?.indirectReferralCount ??
          data?.indirectCount ??
          0;

        const spillOverBonus =
          data?.bonuses?.spillOver ??
          data?.spillOverBonus ??
          data?.spillover_bonus ??
          selectedMember.spillOverBonus ??
          0;

        const sign5Bonus =
          data?.bonuses?.sign5 ??
          data?.sign5Bonus ??
          data?.sign_5_bonus ??
          selectedMember.sign5Bonus ??
          0;

        const pairingBonus =
          data?.bonuses?.pairing ??
          data?.pairingBonus ??
          data?.pairing_bonus ??
          selectedMember.pairingBonus ??
          0;

        const leadershipBonus =
          data?.bonuses?.leadership ??
          data?.leadershipBonus ??
          data?.leadership_bonus ??
          selectedMember.leadershipBonus ??
          0;

        setGenealogyStats({
          referralCounts: {
            direct,
            indirect,
            total: data?.counts?.total ?? data?.total ?? direct + indirect,
          },
          spillOverBonus,
          sign5Bonus,
          pairingBonus,
          leadershipBonus,
        });
      } catch (err: any) {
        setStatsError(err.message ?? 'Failed to load genealogy data');
      } finally {
        setStatsLoading(false);
      }
    };

    fetchGenealogyStats();
  }, [selectedMember?.id]);

  if (!selectedMember) return null;

  /** Renders a value with loading / error fallback */
  const renderValue = (value: number | undefined, prefix = '') => {
    if (statsLoading) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-gray-400">
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading…
        </span>
      );
    }
    if (statsError) return <span className="text-sm text-red-400">—</span>;
    return (
      <span>
        {prefix}
        {(value ?? 0).toLocaleString()}
      </span>
    );
  };

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

          {/* Leg points */}
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

        {/* Error banner */}
        {statsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            ⚠ {statsError}
          </div>
        )}

        {/* Bonus cards */}
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Referrals &amp; Bonuses
          </h4>
          <div className="space-y-2.5">
            {/* Direct referral */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-green-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Total Direct Referral</p>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-green-600 mb-1">
                {renderValue(genealogyStats?.referralCounts.direct)}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Direct line between leader &amp; downline
              </p>
            </div>

            {/* Indirect referral */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-purple-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Total Indirect Referral</p>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-purple-600 mb-1">
                {renderValue(genealogyStats?.referralCounts.indirect)}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Downline through another leader
              </p>
            </div>

            {/* Spill Over Bonus */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-orange-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Spill Over Bonus</p>
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-orange-600 mb-1">
                {renderValue(genealogyStats?.spillOverBonus, '₱ ')}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                When downline is given by another leader
              </p>
            </div>

            {/* Sign-5 Bonus */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-blue-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Sign-5 Bonus</p>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-blue-600 mb-1">
                {renderValue(genealogyStats?.sign5Bonus, '₱ ')}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Limited to 5 pairs max
              </p>
            </div>

            {/* Pairing Bonus */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-cyan-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Pairing Bonus</p>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-cyan-600 mb-1">
                {renderValue(genealogyStats?.pairingBonus, '₱ ')}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                L {selectedMember.leftLegPoints} • R {selectedMember.rightLegPoints}
              </p>
              <div className="text-xs text-amber-700 mt-2 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                Lowest pair:{' '}
                {Math.min(
                  selectedMember.leftLegPoints,
                  selectedMember.rightLegPoints,
                ).toLocaleString()}
              </div>
            </div>

            {/* Leadership Bonus */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-rose-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Leadership Bonus</p>
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1" />
              </div>
              <p className="text-lg font-semibold text-rose-600 mb-1">
                {renderValue(genealogyStats?.leadershipBonus, '₱ ')}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">
                Monthly bonus for leaders
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}