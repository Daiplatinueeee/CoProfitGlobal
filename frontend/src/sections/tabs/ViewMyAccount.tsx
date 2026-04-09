import { useRef, useState } from 'react';

/* ── Sample Data ─────────────────────────────────────────────── */
const SAMPLE_PROFILE = {
  id: 'usr_001',
  name: 'Maria Santos',
  username: 'mariasantos',
  email: 'maria.santos@email.com',
  contact: '+63 917 123 4567',
  address: '123 Mabini St., Cebu City, Cebu 6000, Philippines',
  age: 28,
  birthday: '1996-04-15',
  beneficiary: 'Jose Santos',
  package: 'Premium Plan',
  profilePicture: '',
  packagePin: '8421',
};

/* ── Helpers ─────────────────────────────────────────────────── */
const formatBirthday = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm text-slate-900 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 min-h-[38px] flex items-center">
        {value || <span className="text-slate-300">—</span>}
      </p>
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">

        {/* Header */}
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

        {/* Preview */}
        <div className="px-6 py-6 flex flex-col items-center gap-5">

          {/* Checkered "transparent" bg to mimic no-background visibility */}
          <div
            className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-slate-100 shadow-md"
            style={{
              backgroundImage:
                'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)',
              backgroundSize: '16px 16px',
            }}
          >
            <img
              src={previewSrc}
              alt="Profile preview"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Note */}
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start">
            <span className="text-amber-500 text-base mt-0.5 flex-shrink-0">💡</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Photo Tip</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Please upload a <span className="font-semibold">2×2 photo</span> or an image with{' '}
                <span className="font-semibold">no background</span> for the best display experience.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
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
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSuccess('Password changed successfully.');
    setTimeout(onClose, 1200);
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

/* ── Main Component ──────────────────────────────────────────── */
function ViewMyAccount() {
  const [profile, setProfile] = useState(SAMPLE_PROFILE);
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadHover, setUploadHover] = useState(false);

  // Photo preview state
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Step 1: file chosen → show preview modal
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected if user clicks "Choose Another"
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Step 2a: user confirms → apply photo
  const handleConfirmPhoto = () => {
    if (pendingPhoto) {
      setProfile((prev) => ({ ...prev, profilePicture: pendingPhoto }));
    }
    setPendingPhoto(null);
  };

  // Step 2b: user cancels → discard
  const handleCancelPhoto = () => {
    setPendingPhoto(null);
  };

  // Step 2c: user wants to pick another → re-open file picker
  const handleReselectPhoto = () => {
    setPendingPhoto(null);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

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
                    {profile.profilePicture ? (
                      <img
                        src={profile.profilePicture}
                        alt={profile.name}
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-slate-900 ring-4 ring-slate-100 flex items-center justify-center">
                        <span className="text-2xl font-semibold text-white tracking-wide">{initials}</span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div
                      className={`absolute inset-0 rounded-full bg-slate-900/60 flex flex-col items-center justify-center transition-opacity duration-200 ${
                        uploadHover ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <svg className="w-5 h-5 text-white mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-white text-[10px] font-medium">Change</span>
                    </div>

                    {/* Online dot */}
                    <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
                  </div>

                  {/* Hidden file input */}
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
                      {profile.package}
                    </span>
                  </div>
                </div>

                {/* Age & Birthday strip */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Age</p>
                    <p className="text-lg font-semibold text-slate-900">{profile.age}</p>
                  </div>
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Birthday</p>
                    <p className="text-xs font-medium text-slate-700 leading-snug">
                      {formatBirthday(profile.birthday)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Beneficiary Card */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-900">Beneficiary</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Designated recipient</p>
                </div>
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {profile.beneficiary[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{profile.beneficiary}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Primary beneficiary</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Contact & Location */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-900">Contact & Location</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Your reachable details</p>
                </div>
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoField label="Email Address" value={profile.email} />
                  <InfoField label="Contact Number" value={profile.contact} />
                  <div className="sm:col-span-2">
                    <InfoField label="Address" value={profile.address} />
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-900">Account Information</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Login and identity details</p>
                </div>
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoField label="Full Name" value={profile.name} />
                  <InfoField label="Username" value={`@${profile.username}`} />
                  <InfoField label="Age" value={profile.age.toString()} />
                  <InfoField label="Birthday" value={formatBirthday(profile.birthday)} />
                </div>
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
                  {/* Password */}
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Password</p>
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <p className="flex-1 px-3 py-2 text-sm text-slate-900 tracking-widest select-none">
                        {showPassword ? 'MySecretPass1!' : '••••••••••••'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="px-3 py-2 text-xs text-slate-400 hover:text-slate-700 transition-colors border-l border-slate-200"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
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