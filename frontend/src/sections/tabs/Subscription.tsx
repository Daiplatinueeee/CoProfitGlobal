import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, AlertTriangle, KeyRound, ArrowUp } from 'lucide-react';

const API_BASE = 'http://localhost:3000';

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

const TIER_RANK: Record<string, number> = {
  free: 0, bronze: 1, silver: 2, gold: 3, platinum: 4,
};

const tierConfig: Record<Tier, {
  label:   string;
  dot:     string;
  lit:     string;
  dim:     string;
  glow:    string;
}> = {
  bronze:   {
    label: 'Bronze',
    dot:   'bg-amber-500',
    lit:   'bg-amber-50 text-amber-700 ring-2 ring-amber-400 ring-offset-2 shadow-amber-100 shadow-md',
    dim:   'bg-slate-100 text-slate-400',
    glow:  'text-amber-600',
  },
  silver:   {
    label: 'Silver',
    dot:   'bg-slate-400',
    lit:   'bg-slate-50 text-slate-700 ring-2 ring-slate-300 ring-offset-2 shadow-slate-100 shadow-md',
    dim:   'bg-slate-100 text-slate-400',
    glow:  'text-slate-600',
  },
  gold:     {
    label: 'Gold',
    dot:   'bg-yellow-400',
    lit:   'bg-yellow-50 text-yellow-700 ring-2 ring-yellow-300 ring-offset-2 shadow-yellow-100 shadow-md',
    dim:   'bg-slate-100 text-slate-400',
    glow:  'text-yellow-600',
  },
  platinum: {
    label: 'Platinum',
    dot:   'bg-indigo-500',
    lit:   'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400 ring-offset-2 shadow-indigo-100 shadow-md',
    dim:   'bg-slate-100 text-slate-400',
    glow:  'text-indigo-700',
  },
};

type PinStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'used' | 'success' | 'error';

export default function Subscription() {
  const [pin,           setPin]           = useState('');
  const [detectedTier,  setDetectedTier]  = useState<Tier | null>(null);
  const [pinStatus,     setPinStatus]     = useState<PinStatus>('idle');
  const [statusMsg,     setStatusMsg]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [currentTier,   setCurrentTier]  = useState<string>('—');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = localStorage.getItem('accessToken');

  /* ── Load current tier from user profile ── */
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.membershipTier) setCurrentTier(data.membershipTier);
      })
      .catch(() => {});
  }, []);

  /* ── PIN check (debounced 500ms) ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const clean = pin.trim().toUpperCase();

    if (clean.length === 0) {
      setPinStatus('idle');
      setDetectedTier(null);
      setStatusMsg('');
      return;
    }

    if (clean.length < 6) {
      setPinStatus('idle');
      setDetectedTier(null);
      setStatusMsg('');
      return;
    }

    setPinStatus('checking');
    setDetectedTier(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${API_BASE}/users/pins/lookup?pin=${encodeURIComponent(clean)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!data?.found) {
          setPinStatus('invalid');
          setDetectedTier(null);
          setStatusMsg('PIN not found. Please check and try again.');
          return;
        }

        if (data.status === 'USED') {
          setPinStatus('used');
          setDetectedTier(null);
          setStatusMsg('This PIN has already been used.');
          return;
        }

        if (data.status !== 'UNUSED') {
          setPinStatus('invalid');
          setDetectedTier(null);
          setStatusMsg('This PIN is no longer valid.');
          return;
        }

        const tier = data.tier?.toLowerCase() as Tier;
        if (!TIERS.includes(tier)) {
          setPinStatus('invalid');
          setDetectedTier(null);
          setStatusMsg('Unrecognised tier on this PIN.');
          return;
        }

        const currentRank = TIER_RANK[currentTier.toLowerCase()] ?? 0;
        const newRank     = TIER_RANK[tier] ?? 0;
        if (newRank <= currentRank) {
          setPinStatus('invalid');
          setDetectedTier(null);
          setStatusMsg(
            newRank === currentRank
              ? 'You are already on this tier.'
              : 'You cannot downgrade to a lower tier.',
          );
          return;
        }

        setDetectedTier(tier);
        setPinStatus('valid');
        setStatusMsg('');
      } catch {
        setPinStatus('invalid');
        setDetectedTier(null);
        setStatusMsg('Could not verify PIN. Please try again.');
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [pin]);

  /* ── Confirm upgrade ── */
  const handleConfirm = async () => {
    if (!detectedTier || pinStatus !== 'valid') return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users/upgrade`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: pin.trim().toUpperCase() }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message ?? 'Upgrade failed');
      }

      setPinStatus('success');
      setStatusMsg(`Successfully upgraded to ${tierConfig[detectedTier].label}!`);
      setCurrentTier(tierConfig[detectedTier].label);
      setPin('');
      setDetectedTier(null);
    } catch (err: any) {
      setPinStatus('error');
      setStatusMsg(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = pinStatus === 'valid' && !!detectedTier && !submitting;

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Upgrade Subscription
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enter your package PIN to upgrade your current plan
          </p>
        </div>

        {/* Current plan badge */}
        <div className="mb-8 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
            {currentTier !== '—' && tierConfig[currentTier.toLowerCase() as Tier]
              ? <span className={`w-3 h-3 rounded-full ${tierConfig[currentTier.toLowerCase() as Tier].dot}`} />
              : <span className="w-3 h-3 rounded-full bg-slate-400" />}
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Plan</p>
            <p className="text-sm font-semibold text-slate-900 capitalize">{currentTier}</p>
          </div>
          {detectedTier && pinStatus === 'valid' && (
            <>
              <ArrowUp className="w-4 h-4 text-slate-300 ml-auto" />
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${tierConfig[detectedTier].dot}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Upgrading to</p>
                <p className={`text-sm font-semibold capitalize ${tierConfig[detectedTier].glow}`}>
                  {tierConfig[detectedTier].label}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Tier pills */}
        <div className="mb-8">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Tier Preview
          </p>
          <div className="flex items-center gap-3">
            {TIERS.map((tier) => {
              const cfg   = tierConfig[tier];
              const isLit = detectedTier === tier && pinStatus === 'valid';
              return (
                <div
                  key={tier}
                  className={`
                    flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl
                    transition-all duration-300
                    ${isLit ? cfg.lit : cfg.dim}
                  `}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${isLit ? cfg.dot : 'bg-slate-300'}`} />
                  <span className="text-xs font-semibold tracking-wide">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PIN input */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Package PIN
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="Enter your PIN (e.g. AB1234)"
              maxLength={10}
              className={`
                w-full pl-10 pr-10 py-3 rounded-xl border text-sm font-mono tracking-widest
                focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
                transition-all duration-150 text-slate-800 placeholder-slate-300
                ${pinStatus === 'valid'   ? 'border-emerald-300 bg-emerald-50/40' :
                  pinStatus === 'invalid' || pinStatus === 'used' || pinStatus === 'error'
                                          ? 'border-red-300 bg-red-50/40'
                                          : 'border-slate-200 bg-white'}
              `}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {pinStatus === 'checking' && (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              )}
              {pinStatus === 'valid' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {(pinStatus === 'invalid' || pinStatus === 'used' || pinStatus === 'error') && (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>

          {/* Status messages */}
          {pinStatus === 'valid' && detectedTier && (
            <p className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${tierConfig[detectedTier].glow}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid PIN — upgrades to {tierConfig[detectedTier].label}
            </p>
          )}
          {(pinStatus === 'invalid' || pinStatus === 'used' || pinStatus === 'error') && statusMsg && (
            <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {statusMsg}
            </p>
          )}
          {pinStatus === 'success' && statusMsg && (
            <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {statusMsg}
            </p>
          )}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`
            w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200
            ${canConfirm
              ? 'bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.98] shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
          `}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Upgrading…
            </span>
          ) : detectedTier && pinStatus === 'valid' ? (
            `Confirm Upgrade to ${tierConfig[detectedTier].label}`
          ) : (
            'Enter a valid PIN to continue'
          )}
        </button>

      </div>
    </div>
  );
}