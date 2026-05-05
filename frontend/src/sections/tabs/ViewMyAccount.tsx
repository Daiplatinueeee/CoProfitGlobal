import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';

const API_BASE = 'http://localhost:3000';

/* ── Types ───────────────────────────────────────────────────── */
interface Profile {
  id: string;
  name: string;
  username: string;
  email: string;
  contact: string;
  address: string;
  beneficiary: string;
  birthday: string;
  age: number | null;
  profileImage: string;
  packagePin: string;
  membershipTier: string;
  referralCode: string;
}

type EditSection = 'contact' | 'account' | 'beneficiary' | null;

/* ── Helpers ─────────────────────────────────────────────────── */

const formatBirthday = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const calcAge = (birthday: string): number | null => {
  if (!birthday) return null;
  const today = new Date();
  const dob = new Date(birthday);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

/* ── InfoField ───────────────────────────────────────────────── */
function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm text-slate-900 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 min-h-9.5 flex items-center">
        {value || <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

/* ── EditField ───────────────────────────────────────────────── */
function EditField({
  label,
  name,
  value,
  type = 'text',
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full text-sm text-slate-900 px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-9.5"
      />
    </div>
  );
}

/* ── Change Photo Modal ──────────────────────────────────────── */
function ChangePhotoModal({
  previewSrc,
  onConfirm,
  onCancel,
  onReselect,
}: {
  previewSrc: string;
  onConfirm: () => void;
  onCancel: () => void;
  onReselect: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Preview Photo</h3>
            <p className="text-xs text-slate-400 mt-0.5">Review before saving</p>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-5">
          <div
            className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-slate-100 shadow-md"
            style={{
              backgroundImage: 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)',
              backgroundSize: '16px 16px',
            }}
          >
            <img src={previewSrc} alt="Profile preview" className="w-full h-full object-cover" />
          </div>
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start">
            <span className="text-amber-500 text-base mt-0.5 shrink-0">💡</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Photo Tip</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Please upload a <span className="font-semibold">2×2 photo</span> or an image with{' '}
                <span className="font-semibold">no background</span> for the best display experience.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={onReselect}
            className="flex-1 text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Choose Another
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors font-medium"
          >
            Use This Photo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Change Password Modal ───────────────────────────────────── */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (field: keyof typeof show) =>
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!form.current || !form.next || !form.confirm) {
      setError('All fields are required.');
      return;
    }
    if (form.next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE}/users/me/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? 'Failed to change password.');
      } else {
        setSuccess('Password changed successfully.');
        setTimeout(onClose, 1200);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'current' as const, label: 'Current Password' },
    { key: 'next'    as const, label: 'New Password' },
    { key: 'confirm' as const, label: 'Confirm New Password' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Change Password</h3>
            <p className="text-xs text-slate-400 mt-0.5">Update your account password</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                {label}
              </label>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-300 bg-white">
                <input
                  type={show[key] ? 'text' : 'password'}
                  name={key}
                  value={form[key]}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="flex-1 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-700 transition-colors border-l border-slate-200"
                >
                  {show[key] ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ))}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section Action Bar ──────────────────────────────────────── */
function SectionActions({
  onSave,
  onCancel,
  saving,
  saveError,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveError: string;
}) {
  return (
    <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-3">
      {saveError && (
        <p className="flex-1 text-xs text-red-600">{saveError}</p>
      )}
      <div className="flex gap-2 ml-auto">
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
function ViewMyAccount() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showPin, setShowPin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadHover, setUploadHover] = useState(false);

  // Photo state
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline edit state
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  /* ── Fetch profile ── */
  const fetchProfile = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await apiFetch(`${API_BASE}/users/me`);
      if (!res.ok) throw new Error('Failed to load profile');
      const data: Profile = await res.json();
      setProfile(data);
    } catch {
      setFetchError('Could not load profile. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  /* ── Patch helper ── */
  const patchProfile = async (fields: Partial<Profile>) => {
    const res = await apiFetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message ?? 'Failed to save');
    }
  };

  /* ── Edit helpers ── */
  const startEdit = (section: EditSection) => {
    if (!profile) return;
    setEditingSection(section);
    setDraft({ ...profile });
    setSaveError('');
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setDraft({});
    setSaveError('');
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDraft((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-calculate age when birthday changes
      if (name === 'birthday') next.age = calcAge(value);
      return next;
    });
  };

  const saveSection = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await patchProfile(draft);
      setProfile((prev) => prev ? { ...prev, ...draft } : prev);
      setEditingSection(null);
      setDraft({});
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ── Photo handlers ── */
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => setPendingPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmPhoto = async () => {
    if (!pendingPhoto) return;
    setPhotoSaving(true);
    try {
      await patchProfile({ profileImage: pendingPhoto });
      setProfile((prev) => prev ? { ...prev, profileImage: pendingPhoto } : prev);
    } catch {
      // silently keep the photo in UI anyway (optimistic)
      setProfile((prev) => prev ? { ...prev, profileImage: pendingPhoto } : prev);
    } finally {
      setPhotoSaving(false);
      setPendingPhoto(null);
    }
  };

  const handleCancelPhoto = () => setPendingPhoto(null);

  const handleReselectPhoto = () => {
    setPendingPhoto(null);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  /* ── Loading / Error states ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-sm mb-3">{fetchError || 'Profile not found.'}</p>
          <button
            onClick={fetchProfile}
            className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const packageLabel = profile.membershipTier
    ? profile.membershipTier.charAt(0).toUpperCase() + profile.membershipTier.slice(1) + ' Plan'
    : '—';

  return (
    <>
      {/* Photo Preview Modal */}
      {pendingPhoto && (
        <ChangePhotoModal
          previewSrc={pendingPhoto}
          onConfirm={handleConfirmPhoto}
          onCancel={handleCancelPhoto}
          onReselect={handleReselectPhoto}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      <div className="min-h-screen bg-white">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-21 py-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">My Account</h1>
            <p className="text-sm text-slate-400 mt-1">View and manage your personal profile details</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column ── */}
            <div className="lg:col-span-1 flex flex-col gap-6">

              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-8 flex flex-col items-center text-center">

                  {/* Avatar */}
                  <div
                    className="relative mb-1 cursor-pointer"
                    onMouseEnter={() => setUploadHover(true)}
                    onMouseLeave={() => setUploadHover(false)}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.name}
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-slate-900 ring-4 ring-slate-100 flex items-center justify-center">
                        <span className="text-2xl font-semibold text-white tracking-wide">{initials}</span>
                      </div>
                    )}

                    <div
                      className={`absolute inset-0 rounded-full bg-slate-900/60 flex flex-col items-center justify-center transition-opacity duration-200 ${
                        uploadHover ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <svg className="w-5 h-5 text-white mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-white text-[10px] font-medium">
                        {photoSaving ? 'Saving…' : 'Change'}
                      </span>
                    </div>

                    <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelected}
                  />

                  <p className="text-[10px] text-slate-300 mb-3 mt-1.5">Click photo to change</p>

                  <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">@{profile.username}</p>

                  <div className="mt-4 w-full pt-4 border-t border-slate-100">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                      {packageLabel}
                    </span>
                  </div>
                </div>

                {/* Age & Birthday strip */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Age</p>
                    <p className="text-lg font-semibold text-slate-900">{profile.age ?? '—'}</p>
                  </div>
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Birthday</p>
                    <p className="text-xs font-medium text-slate-700 leading-snug">
                      {profile.birthday ? formatBirthday(profile.birthday) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Beneficiary Card */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Beneficiary</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Designated recipient</p>
                  </div>
                  {editingSection !== 'beneficiary' && (
                    <button
                      onClick={() => startEdit('beneficiary')}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingSection === 'beneficiary' ? (
                  <>
                    <div className="px-6 py-5">
                      <EditField
                        label="Beneficiary Name"
                        name="beneficiary"
                        value={draft.beneficiary ?? ''}
                        onChange={handleDraftChange}
                      />
                    </div>
                    <SectionActions
                      onSave={saveSection}
                      onCancel={cancelEdit}
                      saving={saving}
                      saveError={saveError}
                    />
                  </>
                ) : (
                  <div className="px-6 py-5 flex items-center gap-4">
                    {profile.beneficiary ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                          {profile.beneficiary[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{profile.beneficiary}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Primary beneficiary</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-300 italic">No beneficiary set</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Contact & Location */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Contact & Location</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Your reachable details</p>
                  </div>
                  {editingSection !== 'contact' && (
                    <button
                      onClick={() => startEdit('contact')}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingSection === 'contact' ? (
                  <>
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <EditField label="Email Address" name="email" value={draft.email ?? ''} type="email" onChange={handleDraftChange} />
                      <EditField label="Contact Number" name="contact" value={draft.contact ?? ''} onChange={handleDraftChange} />
                      <div className="sm:col-span-2">
                        <EditField label="Address" name="address" value={draft.address ?? ''} onChange={handleDraftChange} />
                      </div>
                    </div>
                    <SectionActions
                      onSave={saveSection}
                      onCancel={cancelEdit}
                      saving={saving}
                      saveError={saveError}
                    />
                  </>
                ) : (
                  <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InfoField label="Email Address" value={profile.email} />
                    <InfoField label="Contact Number" value={profile.contact} />
                    <div className="sm:col-span-2">
                      <InfoField label="Address" value={profile.address} />
                    </div>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Account Information</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Login and identity details</p>
                  </div>
                  {editingSection !== 'account' && (
                    <button
                      onClick={() => startEdit('account')}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingSection === 'account' ? (
                  <>
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <EditField label="Full Name" name="name" value={draft.name ?? ''} onChange={handleDraftChange} />
                      <EditField label="Username" name="username" value={draft.username ?? ''} onChange={handleDraftChange} />
                      <EditField
                        label="Birthday"
                        name="birthday"
                        value={draft.birthday ?? ''}
                        type="date"
                        onChange={handleDraftChange}
                      />
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Age</p>
                        <p className="text-sm text-slate-500 px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 min-h-9.5 flex items-center">
                          {draft.age ?? '—'} <span className="text-slate-300 ml-1 text-xs">(auto-calculated)</span>
                        </p>
                      </div>
                    </div>
                    <SectionActions
                      onSave={saveSection}
                      onCancel={cancelEdit}
                      saving={saving}
                      saveError={saveError}
                    />
                  </>
                ) : (
                  <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InfoField label="Full Name" value={profile.name} />
                    <InfoField label="Username" value={`@${profile.username}`} />
                    <InfoField label="Age" value={profile.age?.toString()} />
                    <InfoField label="Birthday" value={profile.birthday ? formatBirthday(profile.birthday) : ''} />
                  </div>
                )}
              </div>

              {/* Security */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Security</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Password and PIN settings</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-xs font-medium bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
                </div>

                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Password (masked) */}
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Password</p>
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <p className="flex-1 px-3 py-2 text-sm text-slate-900 tracking-widest select-none">
                        ••••••••••••
                      </p>
                    </div>
                  </div>

                  {/* Package PIN */}
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Package PIN</p>
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <p className="flex-1 px-3 py-2 text-sm text-slate-900 tracking-widest select-none">
                        {showPin ? profile.packagePin : '••••'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPin((v) => !v)}
                        className="px-3 py-2 text-xs text-slate-400 hover:text-slate-700 transition-colors border-l border-slate-200"
                      >
                        {showPin ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ViewMyAccount;