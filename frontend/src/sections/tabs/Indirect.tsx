import pic1 from './../../assets/refs/Logo.webp';
import pic2 from './../../assets/refs/Logo.webp';
import pic3 from './../../assets/refs/Logo.webp';
import pic4 from './../../assets/refs/Logo.webp';
import pic5 from './../../assets/refs/Logo.webp';
import pic6 from './../../assets/refs/Logo.webp';
import pic7 from './../../assets/refs/Logo.webp';

function Direct() {
  const directReferrals = [
    {
      id: 1,
      date: "2025-02-22",
      time: "10:30 AM",
      username: "john_doe",
      email: "john.doe@gmail.com",
      profilePicture: pic1,
      totalPoints: 1250,
    },
    {
      id: 2,
      date: "2025-02-21",
      time: "02:15 PM",
      username: "jane_smith",
      email: "jane.smith@gmail.com",
      profilePicture: pic2,
      totalPoints: 1180,
    },
    {
      id: 3,
      date: "2025-02-20",
      time: "11:45 AM",
      username: "alex_turner",
      email: "alex.turner@gmail.com",
      profilePicture: pic3,
      totalPoints: 950,
    },
    {
      id: 4,
      date: "2025-02-19",
      time: "09:20 AM",
      username: "sarah_williams",
      email: "sarah.williams@gmail.com",
      profilePicture: pic4,
      totalPoints: 1500,
    },
    {
      id: 5,
      date: "2025-02-18",
      time: "03:45 PM",
      username: "mike_johnson",
      email: "mike.johnson@gmail.com",
      profilePicture: pic5,
      totalPoints: 890,
    },
    {
      id: 6,
      date: "2025-02-17",
      time: "01:30 PM",
      username: "emma_davis",
      email: "emma.davis@gmail.com",
      profilePicture: pic6,
      totalPoints: 1100,
    },
    {
      id: 7,
      date: "2025-02-17",
      time: "01:30 PM",
      username: "emma_davis",
      email: "emma.davis@gmail.com",
      profilePicture: pic7,
      totalPoints: 1100,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white rounded-lg">
      <h2 className="text-3xl font-semibold text-slate-900 mb-8">Indirect Referrals</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {directReferrals.map((referral) => (
          <div
            key={referral.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-slate-200"
          >
            {/* Date and Time */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {referral.date} • {referral.time}
              </p>
            </div>

            {/* Profile Section */}
            <div className="flex flex-col items-center mb-6">
              <img
                src={referral.profilePicture}
                alt={referral.username}
                className="w-16 h-16 rounded-full mb-4 border-2 border-slate-200"
              />
              <h3 className="text-lg font-bold text-slate-900 text-center">
                {referral.username}
              </h3>
              <p className="text-sm text-slate-600 text-center mt-1 break-all">
                {referral.email}
              </p>
            </div>

            {/* Total Points */}
            <div className="bg-linear-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200 text-center">
              <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">
                Total Points
              </p>
              <p className="text-3xl font-bold text-indigo-600">
                {referral.totalPoints}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Direct;