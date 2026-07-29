import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, PowerOff, Save, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';
import { API_BASE } from './GeneratePin';

interface MaintenanceStatus {
  active: boolean;
  isEnabled: boolean;
  startAt: string | null;
  endAt: string | null;
  message: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

// All schedule inputs/display use Taipei time (UTC+8, no DST) regardless of
// the admin's actual browser timezone, since <input type="datetime-local">
// has no timezone concept of its own — we treat its value as Taipei wall time.
const TAIPEI_OFFSET_MINUTES = 8 * 60;

// ISO/UTC string from the API -> "YYYY-MM-DDTHH:mm" Taipei wall time for the input.
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const taipeiMs = new Date(iso).getTime() + TAIPEI_OFFSET_MINUTES * 60 * 1000;
  const d = new Date(taipeiMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// "YYYY-MM-DDTHH:mm" Taipei wall time from the input -> ISO/UTC string for the API.
function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const utcMs = Date.parse(`${value}:00Z`) - TAIPEI_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs).toISOString();
}

export default function MaintenanceControl() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isEnabled, setIsEnabled] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [message, setMessage] = useState('');

  const fetchStatus = () => {
    setLoading(true);
    apiFetch(`${API_BASE}/maintenance`)
      .then(r => r.ok ? r.json() : null)
      .then((data: MaintenanceStatus | null) => {
        if (!data) return;
        setStatus(data);
        setIsEnabled(data.isEnabled);
        setStartAt(toDatetimeLocalValue(data.startAt));
        setEndAt(toDatetimeLocalValue(data.endAt));
        setMessage(data.message);
      })
      .catch(() => setError('Failed to load maintenance status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled,
          startAt: fromDatetimeLocalValue(startAt),
          endAt: fromDatetimeLocalValue(endAt),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed to save');
      setStatus(data);
      setSuccessMsg('Maintenance settings saved.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to save maintenance settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEndNow = async () => {
    setEnding(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/maintenance/end`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed to end maintenance');
      setStatus(data);
      setIsEnabled(false);
      setSuccessMsg('Maintenance ended — logins are open again.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to end maintenance');
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Maintenance Mode</h1>
            <p className="text-sm text-slate-400 mt-0.5">Super Admin only — freezes regular logins while active</p>
          </div>
        </div>

        {/* Current status */}
        {!loading && status && (
          <div className={`mb-6 flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${
            status.active ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            {status.active
              ? <AlertTriangle size={16} className="text-red-500 shrink-0" />
              : <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            }
            <p className={`text-sm font-semibold ${status.active ? 'text-red-700' : 'text-emerald-700'}`}>
              {status.active ? 'Maintenance is ACTIVE — regular logins are currently blocked' : 'Site is operating normally'}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}
        {successMsg && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">{successMsg}</div>
        )}

        {/* Config form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={e => setIsEnabled(e.target.checked)}
              className="w-4 h-4 accent-slate-900"
            />
            <span className="text-sm font-medium text-slate-900">Enable maintenance mode</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Start — Taipei time, UTC+8 (optional — leave blank to start immediately once enabled)
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={e => setStartAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                End — Taipei time, UTC+8 (optional — leave blank to stay on until you manually end it)
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={e => setEndAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Message shown to users on the login page</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
            />
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <CalendarClock size={13} className="shrink-0" />
            Your own Super Admin account can always log in, schedule or not — this only blocks other users.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              onClick={handleEndNow}
              disabled={ending || !status?.active}
              title={!status?.active ? 'Maintenance is not currently active' : undefined}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <PowerOff size={14} />
              {ending ? 'Ending…' : 'End Maintenance Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}