import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';

interface PIN {
  id: string;
  pin: string;
  createdAt: string;
  createdTime: string;
  expiryDate: string;
  used: boolean;
  usedAt?: string;
}

function GeneratePin() {
  const [pins, setPins] = useState<PIN[]>([]);
  const [showModal, setShowModal] = useState(false);

  const generateRandomPin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

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
    const { date, time } = getCurrentDateTime();
    const newPin: PIN = {
      id: Date.now().toString(),
      pin: generateRandomPin(),
      createdAt: date,
      createdTime: time,
      expiryDate: getExpiryDate(),
      used: false,
    };

    setPins([newPin, ...pins]);
    setShowModal(false);
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

        {/* Generate Button Section */}
        <div className="mb-12">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Generate PIN
          </button>
        </div>

        {/* PINs Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Generated PINs</h2>

          {pins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No PINs generated yet. Click the button above to generate a PIN.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pins.map((pinItem) => (
                <div
                  key={pinItem.id}
                  className={`rounded-xl p-6 border ${
                    pinItem.used
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
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
                              : 'text-green-700'
                          }`}
                        >
                          {pinItem.used ? 'Used' : 'Active'}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <p className={`font-medium ${pinItem.used ? 'text-red-700' : 'text-green-700'}`}>
                          {pinItem.used ? `Used (${pinItem.usedAt})` : 'Unused'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-white/90 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
              <h2 className="text-2xl text-gray-900 mb-4">Generate PIN</h2>
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