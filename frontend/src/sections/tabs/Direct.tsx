import pic1 from './../../assets/refs/Logo.webp';
import pic2 from './../../assets/refs/Logo.webp';
import pic3 from './../../assets/refs/Logo.webp';
import pic4 from './../../assets/refs/Logo.webp';
import pic5 from './../../assets/refs/Logo.webp';
import pic6 from './../../assets/refs/Logo.webp';
import pic7 from './../../assets/refs/Logo.webp';
import pic8 from './../../assets/refs/Logo.webp';

function Direct() {
  const referralsData = [
    // Level 1 - Direct Referrals
    { id: 1, level: 1, username: "john_doe", email: "john.doe@gmail.com", profilePicture: pic1, dateTime: "2025-02-22T14:30:00", isActive: true },
    { id: 2, level: 1, username: "jane_smith", email: "jane.smith@gmail.com", profilePicture: pic2, dateTime: "2025-02-21T10:15:00", isActive: true },

    // Level 2 - Indirect Referrals
    { id: 3, level: 2, username: "mike_johnson", email: "mike.johnson@gmail.com", profilePicture: pic3, dateTime: "2025-02-18T09:45:00", isActive: true },

    // Level 3 - Spill Over
    { id: 4, level: 3, username: "alex_turner", email: "alex.turner@gmail.com", profilePicture: pic4, dateTime: "2025-02-16T12:20:00", isActive: false },
  ];

  const pairingBonusData = [
    {
      id: 1, level: 4, dateTime: "2025-02-15T16:00:00",
      leftUser: { username: "emma_left", profilePicture: pic5 },
      rightUser: { username: "liam_right", profilePicture: pic6 },
      totalBonus: 250, isActive: true
    },
    {
      id: 2, level: 4, dateTime: "2025-02-14T11:30:00",
      leftUser: { username: "noah_left", profilePicture: pic7 },
      rightUser: { username: "olivia_right", profilePicture: pic8 },
      totalBonus: 180, isActive: false
    },
  ];

  const sign5Data = [
    { rank: "Bronze", count: 0, required: 5, bonus: 500 },
    { rank: "Silver", count: 0, required: 5, bonus: 1500 },
    { rank: "Gold", count: 0, required: 5, bonus: 2500 },
    { rank: "Platinum", count: 0, required: 5, bonus: 3500 },
  ];

  const leadershipBonusData = pairingBonusData.map(pair => ({
    id: pair.id,
    dateTime: pair.dateTime,
    leadershipBonus: pair.totalBonus * 0.2,
    isActive: pair.isActive,
  }));

  const groupedByLevel = referralsData.reduce((acc, referral) => {
    if (!acc[referral.level]) acc[referral.level] = [];
    acc[referral.level].push(referral);
    return acc;
  }, {} as Record<number, typeof referralsData>);

  const getLevelTitle = (level: string) => {
    switch (level) {
      case "1": return "Level 1 - Direct Referrals";
      case "2": return "Level 2 - Indirect Referrals";
      case "3": return "Level 3 - Spill Over";
      default: return "";
    }
  };

  const formatDateTime = (dateTime: string) =>
    new Date(dateTime).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getStatusBadge = (isActive: boolean) => (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white space-y-12">
      <h2 className="text-3xl font-semibold text-slate-900 mb-8">Referral Hierarchy</h2>

      {/* LEVEL 1-3 TABLES */}
      <div className="space-y-10">
        {Object.entries(groupedByLevel).map(([level, referrals]) => (
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
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(referral => (
                    <tr key={referral.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-center"><img src={referral.profilePicture} alt={referral.username} className="w-12 h-12 rounded-full border mx-auto" /></td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{referral.username}</td>
                      <td className="px-6 py-4">{referral.email}</td>
                      <td className="px-6 py-4">{formatDateTime(referral.dateTime)}</td>
                      <td className="px-6 py-4">{getStatusBadge(referral.isActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* LEVEL 4 - PAIRING BONUS */}
        <div>
          <div className="mb-4 pb-2 border-b-2 border-slate-300">
            <h3 className="text-xl font-bold text-slate-900">Level 4 - Pairing Bonus</h3>
            <p className="text-sm text-slate-500">{pairingBonusData.length} pairing record(s)</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-100 text-slate-900 font-semibold">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-center">Left Leg</th>
                  <th className="px-6 py-4 text-center">Right Leg</th>
                  <th className="px-6 py-4">Total Pairing Bonus</th>
                  <th className="px-6 py-4">Account Status</th>
                </tr>
              </thead>
              <tbody>
                {pairingBonusData.map(pair => (
                  <tr key={pair.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{formatDateTime(pair.dateTime)}</td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-3">
                      <img src={pair.leftUser.profilePicture} className="w-10 h-10 rounded-full" />
                      <span className="font-semibold">{pair.leftUser.username}</span>
                    </td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-3">
                      <img src={pair.rightUser.profilePicture} className="w-10 h-10 rounded-full" />
                      <span className="font-semibold">{pair.rightUser.username}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-green-700">₱{pair.totalBonus}</td>
                    <td className="px-6 py-4">{getStatusBadge(pair.isActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LEVEL 5 - SIGN 5 */}
        <div>
          <div className="mb-4 pb-2 border-b-2 border-slate-300">
            <h3 className="text-xl font-bold text-slate-900">Level 5 - Sign 5 Bonus</h3>
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

        {/* LEVEL 6 - LEADERSHIP BONUS */}
        <div>
          <div className="mb-4 pb-2 border-b-2 border-slate-300">
            <h3 className="text-xl font-bold text-slate-900">Level 6 - Leadership Bonus (20%)</h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-100 text-slate-900 font-semibold">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Leadership Bonus (20%)</th>
                  <th className="px-6 py-4">Account Status</th>
                </tr>
              </thead>
              <tbody>
                {leadershipBonusData.map(item => (
                  <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{formatDateTime(item.dateTime)}</td>
                    <td className="px-6 py-4 font-bold text-blue-700">₱{item.leadershipBonus}</td>
                    <td className="px-6 py-4">{getStatusBadge(item.isActive)}</td>
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

export default Direct;