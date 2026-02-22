function Pairing() {
  const pairingHistory = [
    {
      id: 1,
      date: "2025-02-22",
      time: "10:30 AM",
      leftLeg: { username: "john_doe", points: 1250 },
      rightLeg: { username: "jane_smith", points: 1180 },
      totalAmount: 2430,
    },
    {
      id: 2,
      date: "2025-02-21",
      time: "02:15 PM",
      leftLeg: { username: "alex_turner", points: 950 },
      rightLeg: { username: "mike_johnson", points: 890 },
      totalAmount: 1840,
    },
    {
      id: 3,
      date: "2025-02-20",
      time: "11:45 AM",
      leftLeg: { username: "sarah_williams", points: 1500 },
      rightLeg: { username: "david_brown", points: 1420 },
      totalAmount: 2920,
    },
    {
      id: 4,
      date: "2025-02-19",
      time: "09:20 AM",
      leftLeg: { username: "emma_davis", points: 1100 },
      rightLeg: { username: "chris_martinez", points: 1050 },
      totalAmount: 2150,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg">
      <h2 className="text-3xl font-semibold text-slate-900 mb-8">Pairing History</h2>

      <div className="space-y-4">
        {pairingHistory.map((pairing) => (
          <div
            key={pairing.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-slate-200"
          >
            {/* Date and Time */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                {pairing.date} • {pairing.time}
              </p>
            </div>

            {/* Main Content: Left Leg | Right Leg | Amount */}
            <div className="flex items-center justify-between gap-6">
              {/* Left Leg */}
              <div className="flex-1">
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                    Left Leg
                  </p>
                  <p className="text-lg font-bold text-slate-900 mb-2">
                    {pairing.leftLeg.username}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">
                      {pairing.leftLeg.points}
                    </span>
                    <span className="text-sm text-slate-500">points</span>
                  </div>
                </div>
              </div>

              {/* Center Divider */}
              <div className="text-2xl text-slate-300 font-light">|</div>

              {/* Right Leg */}
              <div className="flex-1">
                <div className="bg-green-50 rounded-lg p-5 border border-green-100">
                  <p className="text-xs font-semibold text-green-600 uppercase mb-2">
                    Right Leg
                  </p>
                  <p className="text-lg font-bold text-slate-900 mb-2">
                    {pairing.rightLeg.username}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      {pairing.rightLeg.points}
                    </span>
                    <span className="text-sm text-slate-500">points</span>
                  </div>
                </div>
              </div>

              {/* Pairing Amount */}
              <div className="flex flex-col items-center justify-center min-w-fit">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Total Pairing
                </p>
                <div className="bg-linear-to-br from-purple-100 to-purple-50 rounded-lg px-6 py-4 border border-purple-200">
                  <p className="text-3xl font-bold text-purple-600">
                    {pairing.totalAmount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pairing;