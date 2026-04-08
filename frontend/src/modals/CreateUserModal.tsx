import React from "react";
import { X, AlertCircle, ShieldCheck } from "lucide-react";

interface FormData {
  name: string;
  username: string;
  email: string;
  age: string;
  contact: string;
  address: string;
  beneficiary: string;
  bday: string;
  password: string;
  packagePin: string;
  sponsorReferralCode: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  formData: FormData;
  formErrors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onClose: () => void;
  onSubmit: () => void;
}

type AccountTier = {
  label: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
  dot: string;
  description: string;
};

const TIER_MAP: Record<string, AccountTier> = {
  BRONZE: {
    label: "Bronze",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    ring: "focus:ring-amber-100",
    dot: "bg-amber-500",
    description: "Entry-level membership",
  },
  SILVER: {
    label: "Silver",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-300",
    ring: "focus:ring-slate-100",
    dot: "bg-slate-400",
    description: "Standard membership",
  },
  GOLD: {
    label: "Gold",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    ring: "focus:ring-yellow-100",
    dot: "bg-yellow-500",
    description: "Premium membership",
  },
  PLATINUM: {
    label: "Platinum",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    ring: "focus:ring-indigo-100",
    dot: "bg-indigo-500",
    description: "Elite membership",
  },
};

/**
 * Validates that a package PIN matches the format: 2 uppercase letters + 4 digits (e.g. AB1234).
 */
const PACKAGE_PIN_REGEX = /^[A-Z]{2}\d{4}$/;

function isValidPackagePin(pin: string): boolean {
  return PACKAGE_PIN_REGEX.test(pin.trim().toUpperCase());
}

/** Derives account tier from the first 2 letters of the package PIN. */
function getTierFromPin(pin: string): AccountTier | null {
  const upper = pin.trim().toUpperCase();
  if (upper.startsWith("BR")) return TIER_MAP.BRONZE;
  if (upper.startsWith("SI")) return TIER_MAP.SILVER;
  if (upper.startsWith("GO")) return TIER_MAP.GOLD;
  if (upper.startsWith("PL")) return TIER_MAP.PLATINUM;
  return null;
}

/**
 * Masks raw input into AB1234 format:
 * - First 2 chars: letters only (uppercased)
 * - Next 4 chars: digits only
 */
function maskPackagePin(raw: string): string {
  const upper = raw.toUpperCase();
  const letters = upper.slice(0, 2).replace(/[^A-Z]/g, "");
  const digits = upper.slice(letters.length).replace(/[^0-9]/g, "").slice(0, 4);
  return letters + digits;
}

/** Calculates age in full years from a date string (YYYY-MM-DD), relative to 2026. */
function calculateAgeFromBirthday(bday: string): number | null {
  if (!bday) return null;
  const birth = new Date(bday);
  if (isNaN(birth.getTime())) return null;
  const ref = new Date(2026, new Date().getMonth(), new Date().getDate());
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function CreateUserModal({
  isOpen,
  formData,
  formErrors,
  setFormData,
  setFormErrors,
  onClose,
  onSubmit,
}: CreateUserModalProps) {
  if (!isOpen) return null;

  const pin = formData.packagePin ?? "";
  const tier = isValidPackagePin(pin) ? getTierFromPin(pin) : null;

  // Show a soft preview tier even while typing (before fully valid)
  const previewTier = pin.length >= 2 ? getTierFromPin(pin) : null;
  const displayTier = tier ?? previewTier;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl text-gray-900">Create New User</h2>
            <p className="text-sm text-gray-500 mt-1">
              Fill in the details below to create a new user account
            </p>
          </div>
          <button
            onClick={() => { setFormErrors({}); onClose(); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* LEFT COLUMN */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Personal Information
              </h3>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
                    formErrors.name
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="Full Name"
                />
                {formErrors.name && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.name}
                  </div>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
                    formErrors.username
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="username"
                />
                {formErrors.username && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.username}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
                    formErrors.email
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="user@example.com"
                />
                {formErrors.email && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.email}
                  </div>
                )}
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birthday *</label>
                <input
                  type="date"
                  value={formData.bday}
                  onChange={(e) => {
                    const newBday = e.target.value;
                    const computedAge = calculateAgeFromBirthday(newBday);
                    setFormData({ ...formData, bday: newBday, age: computedAge !== null ? String(computedAge) : "" });
                  }}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
                    formErrors.bday
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                />
                {formErrors.bday && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.bday}
                  </div>
                )}
                {formData.bday && calculateAgeFromBirthday(formData.bday) !== null && (
                  <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                    <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                    </svg>
                    <p className="text-xs text-blue-600">
                      Age: <span className="font-semibold">{calculateAgeFromBirthday(formData.bday)} years old</span> as of 2026
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Contact &amp; Details
              </h3>

              {/* Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact *</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
                    formErrors.contact
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="+1 (555) 000-0000"
                />
                {formErrors.contact && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.contact}
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all resize-none ${
                    formErrors.address
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="Street address, city, state"
                />
                {formErrors.address && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.address}
                  </div>
                )}
              </div>

              {/* Beneficiary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary *</label>
                <textarea
                  value={formData.beneficiary}
                  onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all resize-none ${
                    formErrors.beneficiary
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="Beneficiary information"
                />
                {formErrors.beneficiary && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.beneficiary}
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
                    formErrors.password
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="••••••••"
                />
                {formErrors.password && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.password}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Package PIN / Account Tier ── full-width below the two columns */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
              Package PIN &amp; Tier
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Package PIN input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package PIN *
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.packagePin ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, packagePin: maskPackagePin(e.target.value) })
                    }
                    className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl transition-all font-mono tracking-widest ${
                      formErrors.packagePin
                        ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                        : displayTier
                        ? `border-2 ${displayTier.border} ${displayTier.bg} ${displayTier.ring}`
                        : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                    } focus:outline-none focus:ring-1 uppercase`}
                    placeholder="AB1234"
                    maxLength={6}
                  />
                </div>
                {formErrors.packagePin ? (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.packagePin}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Format: 2 letters + 4 digits (e.g.&nbsp;<span className="font-mono">BR1234</span>). Determines account tier automatically.
                  </p>
                )}
              </div>

              {/* Tier badge / legend */}
              <div>
                {displayTier ? (
                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                        tier
                          ? `${displayTier.border} ${displayTier.bg} shadow-sm`
                          : `${displayTier.border} ${displayTier.bg} opacity-60`
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full shrink-0 ${displayTier.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${displayTier.color}`}>
                            {displayTier.label} Account
                          </p>
                          {tier ? (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${displayTier.bg} ${displayTier.color} border ${displayTier.border}`}>
                              ✓ Confirmed
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200">
                              Preview
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{displayTier.description}</p>
                        {!tier && (
                          <p className="text-xs text-gray-400 italic mt-0.5">Complete PIN to confirm</p>
                        )}
                      </div>
                    </div>
                    {/* All tiers legend shown below for context */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {Object.entries(TIER_MAP).map(([key, t]) => (
                        <div
                          key={key}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                            displayTier.label === t.label
                              ? `${t.border} ${t.bg} border-2`
                              : "border-gray-100 bg-gray-50 opacity-50"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                          <span className={`text-xs font-medium ${t.color}`}>{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-1">Enter a PIN prefix to detect tier:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(TIER_MAP).map(([key, t]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                          <span className={`text-xs font-medium ${t.color}`}>{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>


        </div>

        {/* Actions */}
        <div className="flex gap-3 px-8 py-6 border-t border-gray-100">
          <button
            onClick={() => { setFormErrors({}); onClose(); }}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-400 hover:bg-sky-500 active:bg-sky-600 rounded-xl transition-colors shadow-sm"
          >
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateUserModal;