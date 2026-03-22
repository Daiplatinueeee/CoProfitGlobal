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
  pin: string;
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

/** Derives account tier from a PIN string (case-insensitive prefix match). */
function getTierFromPin(pin: string): AccountTier | null {
  const upper = pin.trim().toUpperCase();
  if (upper.startsWith("BR")) return TIER_MAP.BRONZE;
  if (upper.startsWith("SI")) return TIER_MAP.SILVER;
  if (upper.startsWith("GO")) return TIER_MAP.GOLD;
  if (upper.startsWith("PL")) return TIER_MAP.PLATINUM;
  return null;
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

  const tier = getTierFromPin(formData.pin ?? "");

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

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
                    formErrors.age
                      ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                      : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                  } focus:outline-none focus:ring-1`}
                  placeholder="25"
                />
                {formErrors.age && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.age}
                  </div>
                )}
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birthday *</label>
                <input
                  type="date"
                  value={formData.bday}
                  onChange={(e) => setFormData({ ...formData, bday: e.target.value })}
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

          {/* ── PIN / Account Tier ── full-width below the two columns */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
              Account PIN &amp; Tier
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* PIN input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referral PIN *
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.pin ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, pin: e.target.value })
                    }
                    className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl transition-all font-mono tracking-widest ${
                      formErrors.pin
                        ? "border-2 border-red-400 bg-red-50 focus:ring-red-100"
                        : tier
                        ? `border-2 ${tier.border} ${tier.bg} ${tier.ring}`
                        : "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white"
                    } focus:outline-none focus:ring-1 uppercase`}
                    placeholder="Enter PIN code"
                    maxLength={20}
                  />
                </div>
                {formErrors.pin && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" /> {formErrors.pin}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  PIN determines the account tier automatically.
                </p>
              </div>

              {/* Tier badge / legend */}
              <div>
                {tier ? (
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${tier.border} ${tier.bg} transition-all`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${tier.dot}`} />
                    <div>
                      <p className={`text-sm font-semibold ${tier.color}`}>
                        {tier.label} Account
                      </p>
                      <p className="text-xs text-gray-500">{tier.description}</p>
                    </div>
                  </div>
                ) : (
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
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors shadow-sm"
          >
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateUserModal;