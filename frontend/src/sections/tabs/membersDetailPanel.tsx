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

interface MemberDetailsPanelProps {
  selectedMember: Member | null;
  onClose: () => void;
}

export default function MemberDetailsPanel({ selectedMember, onClose }: MemberDetailsPanelProps) {
  const [referralCounts, setReferralCounts] = useState<ReferralCounts | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMember?.id) return;

    const fetchReferralCounts = async () => {
      setReferralLoading(true);
      setReferralError(null);
      setReferralCounts(null);

      try {
        const res = await fetch(`/genealogy/referrals/${selectedMember.id}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch referral counts (${res.status})`);
        }

        const data = await res.json();

        // Response shape: { counts: { direct, indirect, total }, direct: [...], indirect: [...] }
        setReferralCounts(data.counts);
      } catch (err: any) {
        setReferralError(err.message ?? 'Failed to load referral data');
      } finally {
        setReferralLoading(false);
      }
    };

    fetchReferralCounts();
  }, [selectedMember?.id]);

  if (!selectedMember) return null;

  const renderReferralBadge = (count: number | undefined) => {
    if (referralLoading) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading...
        </span>
      );
    }

    if (referralError) {
      return <span className="text-xs text-red-400">—</span>;
    }

    return (
      <span className="inline-block bg-white/70 border border-current rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
        {(count ?? 0).toLocaleString()} members
      </span>
    );
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto shadow-xl">
      {/* Header - Apple Style */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl text-gray-900">Member Details</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Member Card - Clean Apple Style */}
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50">
          <div className="flex flex-col items-center">
            <img
              src={selectedMember.profileImage}
              alt={selectedMember.username}
              className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md mb-4"
            />
            <h4 className="font-semibold text-xl text-gray-900 mb-1">{selectedMember.username}</h4>
            <p className="text-sm text-gray-600 mb-4">{selectedMember.email}</p>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-blue-200">
              <p className="text-xs text-gray-700 font-medium">PIN: {selectedMember.referralCode}</p>
            </div>
          </div>

          {/* Points Display - Apple Card Grid */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-blue-200/50">
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-center border border-blue-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Left Leg</p>
              <p className="text-2xl font-bold text-blue-600">{selectedMember.leftLegPoints}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-center border border-indigo-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Right Leg</p>
              <p className="text-2xl font-bold text-indigo-600">{selectedMember.rightLegPoints}</p>
            </div>
          </div>
        </div>

        {/* Bonus Breakdown Section */}
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Bonuses</h4>
          <div className="space-y-2.5">
            {/* Direct Referral */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-green-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Total Direct Referral</p>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1"></span>
              </div>
              <p className="text-lg font-semibold text-green-600 mb-1">
                {(selectedMember.directReferralBonus || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700 mb-2">
                Direct line between leader &amp; downline
              </p>
              <div className="text-green-600">
                {renderReferralBadge(referralCounts?.direct)}
              </div>
            </div>

            {/* Indirect Referral */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-purple-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Total Indirect Referral</p>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1"></span>
              </div>
              <p className="text-lg font-semibold text-purple-600 mb-1">
                {(selectedMember.indirectReferralBonus || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700 mb-2">
                Downline through another leader
              </p>
              <div className="text-purple-600">
                {renderReferralBadge(referralCounts?.indirect)}
              </div>
            </div>

            {/* Spill Over */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-orange-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Spill Over Bonus</p>
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1"></span>
              </div>
              <p className="text-lg font-semibold text-orange-600 mb-1">₱ {(selectedMember.spillOverBonus || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">When downline is given by another leader</p>
            </div>

            {/* Sign-5 */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-blue-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Sign-5 Bonus</p>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
              </div>
              <p className="text-lg font-semibold text-blue-600 mb-1">₱ {(selectedMember.sign5Bonus || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">Limited to 5 pairs max</p>
            </div>

            {/* Pairing Bonus */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-cyan-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Pairing Bonus</p>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1"></span>
              </div>
              <p className="text-lg font-semibold text-cyan-600 mb-1">₱ {(selectedMember.pairingBonus || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">L {selectedMember.leftLegPoints} • R {selectedMember.rightLegPoints}</p>
              <div className="text-xs text-amber-700 mt-2 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                Lowest pair: {Math.min(selectedMember.leftLegPoints, selectedMember.rightLegPoints).toLocaleString()}
              </div>
            </div>

            {/* Leadership Bonus */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100/80 hover:border-rose-200 transition-all group">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Leadership Bonus</p>
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1"></span>
              </div>
              <p className="text-lg font-semibold text-rose-600 mb-1">₱ {(selectedMember.leadershipBonus || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600 group-hover:text-gray-700">Monthly bonus for leaders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}