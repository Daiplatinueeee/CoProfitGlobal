import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';

interface PIN {
  id: string;
  pin: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: string;
  createdTime: string;
  expiryDate: string;
  used: boolean;
  usedAt?: string;
  usedBy?: string;
}

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

function GeneratePin() {
  const [pins, setPins] = useState<PIN[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [displayCount, setDisplayCount] = useState(5);
  const [filterStatus, setFilterStatus] = useState<'all' | 'used' | 'unused' | 'expired'>('all');
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');

  const tierColors: Record<Tier, { bg: string; border: string; text: string }> = {
    bronze: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    silver: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
    gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    platinum: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  };

  const generateRandomPin = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
    const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
    const numbers = Math.floor(1000 + Math.random() * 9000).toString();
    return `${letter1}${letter2}${numbers}`;
  };

  const isExpired = (expiryDate: string): boolean => {
    return new Date(expiryDate) < new Date();
  };

  const getFilteredPins = (): PIN[] => {
    return pins.filter((pin) => {
      // Filter by tier first
      if (filterTier !== 'all' && pin.tier !== filterTier) return false;
      
      // Then filter by status
      if (filterStatus === 'used') return pin.used;
      if (filterStatus === 'unused') return !pin.used && !isExpired(pin.expiryDate);
      if (filterStatus === 'expired') return isExpired(pin.expiryDate);
      return true;
    });
  };

  const filteredPins = getFilteredPins();
  const displayedPins = filteredPins.slice(0, displayCount);

  const getExpiryDate = (): string => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    return expiryDate.toISOString().split('T')[0];
  };

  const getCurrentDateTime = (): { date: string; time: string } => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { date, time };
  };

  const handleConfirmGenerate = () => {
    if (!selectedTier) return;
    
    const { date, time } = getCurrentDateTime();
    const newPin: PIN = {
      id: Date.now().toString(),
      pin: generateRandomPin(),
      tier: selectedTier,
      createdAt: date,
      createdTime: time,
      expiryDate: getExpiryDate(),
      used: false,
    };

    setPins([newPin, ...pins]);
    setShowModal(false);
    setSelectedTier(null);
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    alert(`PIN ${pin} copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-4xl text-gray-900">Generate PIN</h1>
          <p className="text-gray-600 mt-2">Create and manage your 4-digit PINs</p>
        </div>

        {/* Tier Selection Section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Your Tier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTier === tier
                    ? `${tierColors[tier].bg} ${tierColors[tier].border} border-2`
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`font-semibold capitalize ${selectedTier === tier ? tierColors[tier].text : 'text-gray-700'}`}>
                  {tier}
                </div>
                {selectedTier === tier && (
                  <div className="mt-2 text-sm text-blue-600 font-medium">✓ Selected</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button Section */}
        <div className="mb-12">
          <button
            onClick={() => setShowModal(true)}
            disabled={!selectedTier}
            className={`font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 ${
              selectedTier
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-5 h-5" />
            Generate PIN
          </button>
          {!selectedTier && (
            <p className="text-sm text-red-600 mt-2">Please select a tier to generate a PIN</p>
          )}
        </div>

        {/* PINs Section */}
        <div>
          <div className="flex flex-col gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Generated PINs</h2>
            {pins.length > 0 && (
              <div className="space-y-3">
                {/* Tier Filters */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setFilterTier('all');
                      setDisplayCount(5);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                      filterTier === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Tiers
                  </button>
                  <button
                    onClick={() => {
                      setFilterTier('bronze');
                      setDisplayCount(5);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                      filterTier === 'bronze'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    Bronze ({pins.filter((p) => p.tier === 'bronze').length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterTier('silver');
                      setDisplayCount(5);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                      filterTier === 'silver'
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Silver ({pins.filter((p) => p.tier === 'silver').length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterTier('gold');
                      setDisplayCount(5);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                      filterTier === 'gold'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    Gold ({pins.filter((p) => p.tier === 'gold').length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterTier('platinum');
                      setDisplayCount(5);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                      filterTier === 'platinum'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    Platinum ({pins.filter((p) => p.tier === 'platinum').length})
                  </button>
                </div>

                {/* Status Filters */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setDisplayCount(5);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('unused');
                      setDisplayCount(5);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'unused'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Unused ({pins.filter((p) => !p.used && !isExpired(p.expiryDate)).length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('used');
                      setDisplayCount(5);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'used'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Used ({pins.filter((p) => p.used).length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('expired');
                      setDisplayCount(5);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'expired'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Expired ({pins.filter((p) => isExpired(p.expiryDate)).length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {pins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No PINs generated yet. Click the button above to generate a PIN.</p>
            </div>
          ) : filteredPins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No PINs match the selected filter.</p>
            </div>
          ) : (
            <div>
              <div className="space-y-4">
                {displayedPins.map((pinItem) => (
                <div
                  key={pinItem.id}
                  className={`rounded-xl p-6 border ${
                    pinItem.used
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${tierColors[pinItem.tier].bg} ${tierColors[pinItem.tier].text}`}>
                      {pinItem.tier}
                    </span>
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">PIN: {pinItem.pin}</h3>
                          <button
                            onClick={() => handleCopyPin(pinItem.pin)}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                            title="Copy PIN"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p
                          className={`text-sm font-medium ${
                            pinItem.used
                              ? 'text-red-700'
                              : isExpired(pinItem.expiryDate)
                              ? 'text-orange-700'
                              : 'text-green-700'
                          }`}
                        >
                          {pinItem.used ? 'Used' : isExpired(pinItem.expiryDate) ? 'Expired' : 'Active'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        Expires: {pinItem.expiryDate}
                      </p>
                    </div>
                  </div>

                  {/* PIN Details */}
                  <div className="bg-white rounded-lg p-5 space-y-3 mt-4 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Created Date</p>
                        <p className="font-medium text-gray-900">{pinItem.createdAt}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Created Time</p>
                        <p className="font-medium text-gray-900">{pinItem.createdTime}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Status</p>
                        <p className={`font-medium ${
                          pinItem.used
                            ? 'text-red-700'
                            : isExpired(pinItem.expiryDate)
                            ? 'text-orange-700'
                            : 'text-green-700'
                        }`}>
                          {pinItem.used ? `Used (${pinItem.usedAt})` : isExpired(pinItem.expiryDate) ? 'Expired' : 'Unused'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Used By</p>
                        <p className="font-medium text-gray-900">{pinItem.usedBy || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
              {displayCount < filteredPins.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setDisplayCount(displayCount + 5)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Show More ({filteredPins.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showModal && selectedTier && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
              <h2 className="text-2xl text-gray-900 mb-4">Generate {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} PIN</h2>
              <div className={`rounded-lg p-3 mb-4 ${tierColors[selectedTier].bg} ${tierColors[selectedTier].border} border`}>
                <p className={`text-sm font-semibold capitalize ${tierColors[selectedTier].text}`}>
                  Tier: {selectedTier}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-gray-700 text-sm">
                  <span className="font-semibold">Note:</span> This PIN will expire in 7 days from the date of creation.
                </p>
              </div>
              <p className="text-gray-600 mb-8">Are you sure you want to generate a new PIN?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmGenerate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Yes, Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneratePin;