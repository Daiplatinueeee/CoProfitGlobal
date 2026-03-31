import { useState, useEffect, useCallback } from 'react';
import { Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';

const API_BASE = 'https://coprofitglobal-production.up.railway.app';

interface PIN {
  id: string;
  pin: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: string;
  createdTime: string;
  status: 'UNUSED' | 'USED' | 'VOID';
  usedAt?: string;
  usedBy?: string;
}

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Map an API pin record to the local PIN shape.
 *
 * The backend stores pins as plain text in the `pin` field (e.g. "AB1234").
 * Old documents that were accidentally saved with a `pinHash` field will show
 * "[hashed]" so admins know those records need to be regenerated/voided.
 */
function mapApiPin(r: any): PIN {
  const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();

  // `r.pin` is the correct plain-text field from the schema.
  // Guard against legacy records that may have only `pinHash` stored.
  const resolvedPin: string =
    r.pin && !r.pin.startsWith('$2') // bcrypt hashes always start with $2
      ? r.pin
      : '[hashed — void & regenerate]';

  return {
    id: r.id,
    pin: resolvedPin,
    tier: r.tier as Tier,
    createdAt: createdDate.toISOString().split('T')[0],
    createdTime: createdDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    status: r.status ?? 'UNUSED',
    usedAt: r.usedAt ?? undefined,
    usedBy: r.usedByUserId ?? undefined,
  };
}

function GeneratePin() {
  const [pins, setPins] = useState<PIN[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [displayCount, setDisplayCount] = useState(5);
  const [filterStatus, setFilterStatus] = useState<'all' | 'USED' | 'UNUSED' | 'VOID'>('all');
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tierColors: Record<Tier, { bg: string; border: string; text: string }> = {
    bronze: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    silver: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
    gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    platinum: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  };

  const fetchPins = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/pins?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load pins (${res.status})`);
      const data: any[] = await res.json();
      setPins(data.map((r) => mapApiPin(r)));
    } catch (err: any) {
      setError(err.message ?? 'Could not load pins');
    }
  }, []);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const handleConfirmGenerate = async () => {
    if (!selectedTier) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/pins/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: selectedTier, quantity: 1 }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Server error (${res.status})`);
      }

      // The API returns { tier, quantity, pins: ['AB1234'] }
      const data = await res.json();
      const rawPin: string = data.pins?.[0] ?? 'N/A';
      const now = new Date();
      const tempId = `temp-${Date.now()}`;

      const newPin: PIN = {
        id: tempId,
        pin: rawPin,
        tier: selectedTier,
        createdAt: now.toISOString().split('T')[0],
        createdTime: now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'UNUSED',
      };

      // Auto-reveal the newly generated pin so admin can see it right away
      setVisiblePins((prev) => new Set(prev).add(tempId));
      setPins((prev) => [newPin, ...prev]);
      setShowModal(false);
      setSelectedTier(null);

      // Re-fetch to replace temp entry with the real server record
      setTimeout(async () => {
        const token2 = localStorage.getItem('accessToken');
        const res2 = await fetch(`${API_BASE}/admin/pins?limit=200`, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        if (!res2.ok) return;
        const list: any[] = await res2.json();
        const mapped = list.map((r) => mapApiPin(r));

        // Keep the newly generated pin visible after the refresh
        const newest = mapped[0];
        if (newest) {
          setVisiblePins((prev) => {
            const next = new Set(prev);
            if (next.has(tempId)) {
              next.delete(tempId);
              next.add(newest.id);
            }
            return next;
          });
        }
        setPins(mapped);
      }, 600);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    alert(`PIN ${pin} copied to clipboard!`);
  };

  const getFilteredPins = (): PIN[] => {
    return pins.filter((pin) => {
      if (filterTier !== 'all' && pin.tier !== filterTier) return false;
      if (filterStatus === 'all') return true;
      return pin.status === filterStatus;
    });
  };

  const filteredPins = getFilteredPins();
  const displayedPins = filteredPins.slice(0, displayCount);

  const isHashedPin = (pin: string) => pin.startsWith('[hashed');

  const statusLabel = (pin: PIN) => {
    if (pin.status === 'USED') return `Used${pin.usedAt ? ` (${pin.usedAt})` : ''}`;
    if (pin.status === 'VOID') return 'Void';
    return 'Unused';
  };

  const statusColor = (pin: PIN) => {
    if (pin.status === 'USED') return 'text-red-700';
    if (pin.status === 'VOID') return 'text-orange-700';
    return 'text-green-700';
  };

  const cardBg = (pin: PIN) =>
    pin.status === 'USED'
      ? 'bg-red-50 border-red-200'
      : pin.status === 'VOID'
      ? 'bg-orange-50 border-orange-200'
      : 'bg-green-50 border-green-200';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl text-gray-900">Generate PIN</h1>
          <p className="text-gray-600 mt-2">Create and manage membership PINs</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button className="underline ml-4" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Tier Selection */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Tier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTier === tier
                    ? `${tierColors[tier].bg} ${tierColors[tier].border}`
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

        {/* Generate Button */}
        <div className="mb-12">
          <button
            onClick={() => setShowModal(true)}
            disabled={!selectedTier || loading}
            className={`font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 ${
              selectedTier && !loading
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating…' : 'Generate PIN'}
          </button>
          {!selectedTier && (
            <p className="text-sm text-red-600 mt-2">Please select a tier to generate a PIN</p>
          )}
        </div>

        {/* PIN List */}
        <div>
          <div className="flex flex-col gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Generated PINs</h2>

            {pins.length > 0 && (
              <div className="space-y-3">
                {/* Tier filters */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setFilterTier('all'); setDisplayCount(5); }}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${filterTier === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    All Tiers
                  </button>
                  {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setFilterTier(t); setDisplayCount(5); }}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors capitalize ${
                        filterTier === t
                          ? `${tierColors[t].bg} ${tierColors[t].text} border ${tierColors[t].border}`
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Status filters */}
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'UNUSED', 'USED', 'VOID'] as const).map((s) => {
                    const count = s === 'all' ? pins.length : pins.filter((p) => p.status === s).length;
                    const activeClass =
                      s === 'USED' ? 'bg-red-600 text-white'
                      : s === 'VOID' ? 'bg-orange-600 text-white'
                      : s === 'UNUSED' ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white';
                    return (
                      <button
                        key={s}
                        onClick={() => { setFilterStatus(s); setDisplayCount(5); }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          filterStatus === s ? activeClass : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {s === 'all' ? `All (${count})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${count})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {pins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No PINs generated yet. Select a tier and click Generate PIN.</p>
            </div>
          ) : filteredPins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No PINs match the selected filter.</p>
            </div>
          ) : (
            <div>
              <div className="space-y-4">
                {displayedPins.map((pinItem) => (
                  <div key={pinItem.id} className={`rounded-xl p-6 border ${cardBg(pinItem)}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${tierColors[pinItem.tier].bg} ${tierColors[pinItem.tier].text}`}>
                        {pinItem.tier}
                      </span>
                      {/* Warn admin if this record was stored as a hash (legacy) */}
                      {isHashedPin(pinItem.pin) && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          ⚠ Legacy hashed — void &amp; regenerate
                        </span>
                      )}
                    </div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            PIN:{' '}
                            <span className="font-mono tracking-widest">
                              {isHashedPin(pinItem.pin)
                                ? pinItem.pin
                                : visiblePins.has(pinItem.id)
                                ? pinItem.pin
                                : '••••••'}
                            </span>
                          </h3>
                          {/* Only show toggle for non-hashed pins */}
                          {!isHashedPin(pinItem.pin) && (
                            <button
                              onClick={() => togglePinVisibility(pinItem.id)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title={visiblePins.has(pinItem.id) ? 'Hide PIN' : 'Show PIN'}
                            >
                              {visiblePins.has(pinItem.id)
                                ? <EyeOff className="w-4 h-4" />
                                : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                          {/* Copy — only when visible and not hashed */}
                          {visiblePins.has(pinItem.id) && !isHashedPin(pinItem.pin) && (
                            <button
                              onClick={() => handleCopyPin(pinItem.pin)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                              title="Copy PIN"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${statusColor(pinItem)}`}>
                          {statusLabel(pinItem)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-5 mt-4 border border-gray-200">
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
                          <p className={`font-medium ${statusColor(pinItem)}`}>{statusLabel(pinItem)}</p>
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
              <h2 className="text-2xl text-gray-900 mb-4">
                Generate {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} PIN
              </h2>
              <div className={`rounded-lg p-3 mb-4 ${tierColors[selectedTier].bg} ${tierColors[selectedTier].border} border`}>
                <p className={`text-sm font-semibold capitalize ${tierColors[selectedTier].text}`}>
                  Tier: {selectedTier}
                </p>
              </div>
              <p className="text-gray-600 mb-8">Are you sure you want to generate a new PIN?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); setSelectedTier(null); }}
                  disabled={loading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmGenerate}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {loading ? 'Generating…' : 'Yes, Generate'}
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