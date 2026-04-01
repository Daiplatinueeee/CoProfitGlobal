import { useEffect, useState } from 'react';
import defaultLogo from './../../assets/refs/Logo.webp';

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

function ReferalsHierarchy() {
  const [directReferrals, setDirectReferrals] = useState<any[]>([]);
  const [indirectReferrals, setIndirectReferrals] = useState<any[]>([]);
  const [spilloverReferrals, setSpilloverReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token, userId } = getAuthContext();
    if (!token || !userId) return;

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    fetch(`${API_BASE_URL}/genealogy/referrals/${userId}`, { headers })
      .then(r => r.json())
      .then((referralsData) => {
        setDirectReferrals(referralsData.direct ?? []);
        setIndirectReferrals(referralsData.indirect ?? []);
        setSpilloverReferrals(referralsData.spillover ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const sign5Counts = {
    bronze:   directReferrals.filter(r => r.membershipTier?.toLowerCase() === 'bronze'   && (r.createdAt ?? '').slice(0, 7) === currentMonthKey).length,
    silver:   directReferrals.filter(r => r.membershipTier?.toLowerCase() === 'silver'   && (r.createdAt ?? '').slice(0, 7) === currentMonthKey).length,
    gold:     directReferrals.filter(r => r.membershipTier?.toLowerCase() === 'gold'     && (r.createdAt ?? '').slice(0, 7) === currentMonthKey).length,
    platinum: directReferrals.filter(r => r.membershipTier?.toLowerCase() === 'platinum' && (r.createdAt ?? '').slice(0, 7) === currentMonthKey).length,
  };

  const sign5Data = [
    { rank: 'Bronze',   count: sign5Counts.bronze,   required: 5, bonus: 500  },
    { rank: 'Silver',   count: sign5Counts.silver,   required: 5, bonus: 1500 },
    { rank: 'Gold',     count: sign5Counts.gold,     required: 5, bonus: 2500 },
    { rank: 'Platinum', count: sign5Counts.platinum, required: 5, bonus: 3500 },
  ];

  const groupedByLevel: Record<number, any[]> = {
    1: directReferrals,
    2: indirectReferrals,
    3: spilloverReferrals,
  };

  const getLevelTitle = (level: number) => {
    switch (level) {
      case 1: return 'Level 1 - Direct Referrals';
      case 2: return 'Level 2 - Indirect Referrals';
      case 3: return 'Level 3 - Spill Over';
      default: return '';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 flex items-center justify-center min-h-48">
        <p className="text-slate-500 text-sm">Loading referral hierarchy...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white space-y-12">
      <h2 className="text-3xl font-semibold text-slate-900 mb-8">Referral Hierarchy</h2>

      {/* LEVEL 1-3 TABLES */}
      <div className="space-y-10">
        {([1, 2, 3] as const).map(level => {
          const referrals = groupedByLevel[level];
          return (
            <div key={level}>
              <div className="mb-4 pb-2 border-b-2 border-slate-300">
                <h3 className="text-xl font-bold text-slate-900">{getLevelTitle(level)}</h3>
                <p className="text-sm text-slate-500">{referrals.length} record(s)</p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="bg-slate-100 text-slate-900 font-semibold">
                    <tr>
                      <th className="px-6 py-4 text-center">Profile</th>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Date Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-6 text-center text-slate-400">No records found.</td>
                      </tr>
                    ) : (
                      referrals.map((referral: any) => (
                        <tr key={referral.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-center">
                            <img
                              src={referral.profileImage || defaultLogo}
                              alt={referral.username}
                              className="w-12 h-12 rounded-full border mx-auto object-cover"
                            />
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">{referral.username}</td>
                          <td className="px-6 py-4">{referral.email}</td>
                          <td className="px-6 py-4">{formatDate(referral.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* LEVEL 4 - SIGN 5 */}
        <div>
          <div className="mb-4 pb-2 border-b-2 border-slate-300">
            <h3 className="text-xl font-bold text-slate-900">Level 4 - Sign 5 Bonus</h3>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {sign5Data.map(rank => (
              <div key={rank.rank} className="border rounded-lg p-5 shadow-sm bg-white">
                <h4 className="text-lg font-bold mb-2">{rank.rank}</h4>
                <p className="text-sm text-slate-600 mb-2">{rank.count}/{rank.required} (can exceed)</p>
                <p className="font-semibold text-green-700 text-lg">Current Bonus: ₱{rank.bonus}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferalsHierarchy;
