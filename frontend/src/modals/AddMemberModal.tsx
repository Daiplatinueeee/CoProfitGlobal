import React from 'react'
import { X, AlertCircle, ShieldCheck } from 'lucide-react'

interface Member {
  id: string
  userId?: string
  username: string
  email: string
  profileImage: string
  referralCode: string
  leftLegPoints: number
  rightLegPoints: number
  leftChild?: Member
  rightChild?: Member
}

export interface AddMemberFormData {
  name: string
  username: string
  email: string
  age: string
  contact: string
  address: string
  beneficiary: string
  birthday: string
  password: string
  packagePin: string
}

export const EMPTY_ADD_MEMBER_FORM: AddMemberFormData = {
  name: '',
  username: '',
  email: '',
  age: '',
  contact: '',
  address: '',
  beneficiary: '',
  birthday: '',
  password: '',
  packagePin: '',
}

interface AddMemberModalProps {
  modal: { parent: Member; leg: 'left' | 'right' } | null
  formData: AddMemberFormData
  formErrors: Record<string, string>
  setFormData: React.Dispatch<React.SetStateAction<AddMemberFormData>>
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onAddMember: () => void
  onClose: () => void
}

// ── Package PIN helpers ───────────────────────────────────────────────────────

type AccountTier = {
  label: string
  color: string
  bg: string
  border: string
  ring: string
  dot: string
  description: string
}

const TIER_MAP: Record<string, AccountTier> = {
  BRONZE: {
    label: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-50',
    border: 'border-amber-300', ring: 'focus:ring-amber-100', dot: 'bg-amber-500',
    description: 'Entry-level membership',
  },
  SILVER: {
    label: 'Silver', color: 'text-slate-600', bg: 'bg-slate-50',
    border: 'border-slate-300', ring: 'focus:ring-slate-100', dot: 'bg-slate-400',
    description: 'Standard membership',
  },
  GOLD: {
    label: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-50',
    border: 'border-yellow-300', ring: 'focus:ring-yellow-100', dot: 'bg-yellow-500',
    description: 'Premium membership',
  },
  PLATINUM: {
    label: 'Platinum', color: 'text-indigo-600', bg: 'bg-indigo-50',
    border: 'border-indigo-300', ring: 'focus:ring-indigo-100', dot: 'bg-indigo-500',
    description: 'Elite membership',
  },
}

const PACKAGE_PIN_REGEX = /^[A-Z]{2}\d{4}$/

function isValidPackagePin(pin: string): boolean {
  return PACKAGE_PIN_REGEX.test(pin.trim().toUpperCase())
}

function getTierFromPin(pin: string): AccountTier | null {
  const upper = pin.trim().toUpperCase()
  if (upper.startsWith('BR')) return TIER_MAP.BRONZE
  if (upper.startsWith('SI')) return TIER_MAP.SILVER
  if (upper.startsWith('GO')) return TIER_MAP.GOLD
  if (upper.startsWith('PL')) return TIER_MAP.PLATINUM
  return null
}

function maskPackagePin(raw: string): string {
  const upper = raw.toUpperCase()
  const letters = upper.slice(0, 2).replace(/[^A-Z]/g, '')
  const digits = upper.slice(letters.length).replace(/[^0-9]/g, '').slice(0, 4)
  return letters + digits
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AddMemberModal({
  modal,
  formData,
  formErrors,
  setFormData,
  setFormErrors,
  onAddMember,
  onClose,
}: AddMemberModalProps) {
  if (!modal) return null

  const isLeftLeg = modal.leg === 'left'
  const legColor = isLeftLeg ? '#10b981' : '#f59e0b'

  const pin = formData.packagePin ?? ''
  const tier = isValidPackagePin(pin) ? getTierFromPin(pin) : null
  const previewTier = pin.length >= 2 ? getTierFromPin(pin) : null
  const displayTier = tier ?? previewTier

  const set = (field: keyof AddMemberFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const field = (
    id: keyof AddMemberFormData,
    label: string,
    placeholder: string,
    type = 'text',
    required = false,
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={formData[id]}
        onChange={(e) => set(id, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
          formErrors[id]
            ? 'border-2 border-red-400 bg-red-50 focus:ring-red-100'
            : 'border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'
        } focus:outline-none focus:ring-1`}
      />
      {formErrors[id] && (
        <div className="flex items-center gap-1 mt-1.5 text-red-600 text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> {formErrors[id]}
        </div>
      )}
    </div>
  )

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 py-5 border-b border-gray-100"
          style={{ borderLeftWidth: 4, borderLeftColor: legColor }}
        >
          <div>
            <h2 className="text-2xl text-gray-900">
              Add{' '}
              <span style={{ color: legColor }} className="font-semibold">
                {isLeftLeg ? 'Left' : 'Right'}
              </span>{' '}
              Member
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Creating a new account under{' '}
              <span className="font-semibold text-gray-700">{modal.parent.username}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 py-7 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* LEFT COLUMN — Personal */}
            <div className="space-y-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Personal Information
              </h3>

              {field('name', 'Name', 'Full name', 'text', true)}
              {field('username', 'Username', 'username (optional)')}
              {field('email', 'Email', 'user@example.com', 'email', true)}
              {field('age', 'Age', '25', 'number')}
              {field('birthday', 'Birthday', '', 'date')}
            </div>

            {/* RIGHT COLUMN — Contact & Security */}
            <div className="space-y-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Contact &amp; Security
              </h3>

              {field('contact', 'Contact', '+1 (555) 000-0000')}

              {/* Address — textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => set('address', e.target.value)}
                  rows={2}
                  placeholder="Street address, city, state"
                  className={`w-full px-4 py-2.5 text-sm rounded-xl resize-none transition-all ${
                    formErrors.address
                      ? 'border-2 border-red-400 bg-red-50 focus:ring-red-100'
                      : 'border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'
                  } focus:outline-none focus:ring-1`}
                />
              </div>

              {/* Beneficiary — textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary</label>
                <textarea
                  value={formData.beneficiary}
                  onChange={(e) => set('beneficiary', e.target.value)}
                  rows={2}
                  placeholder="Beneficiary information"
                  className={`w-full px-4 py-2.5 text-sm rounded-xl resize-none transition-all ${
                    formErrors.beneficiary
                      ? 'border-2 border-red-400 bg-red-50 focus:ring-red-100'
                      : 'border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'
                  } focus:outline-none focus:ring-1`}
                />
              </div>

              {field('password', 'Password', '••••••••', 'password', true)}
            </div>
          </div>

          {/* Package PIN — full width */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Package PIN &amp; Tier
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package PIN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.packagePin}
                    onChange={(e) => set('packagePin', maskPackagePin(e.target.value))}
                    placeholder="AB1234"
                    maxLength={6}
                    className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl transition-all font-mono tracking-widest uppercase ${
                      formErrors.packagePin
                        ? 'border-2 border-red-400 bg-red-50 focus:ring-red-100'
                        : displayTier
                        ? `border-2 ${displayTier.border} ${displayTier.bg} ${displayTier.ring}`
                        : 'border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'
                    } focus:outline-none focus:ring-1`}
                  />
                </div>
                {formErrors.packagePin ? (
                  <div className="flex items-center gap-1 mt-1.5 text-red-600 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.packagePin}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Format: 2 letters + 4 digits (e.g.{' '}
                    <span className="font-mono">BR1234</span>). Determines tier automatically.
                  </p>
                )}
              </div>

              <div>
                {displayTier ? (
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${displayTier.border} ${displayTier.bg} transition-all ${!tier ? 'opacity-60' : ''}`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${displayTier.dot}`} />
                    <div>
                      <p className={`text-sm font-semibold ${displayTier.color}`}>
                        {displayTier.label} Account
                      </p>
                      <p className="text-xs text-gray-500">{displayTier.description}</p>
                      {!tier && (
                        <p className="text-xs text-gray-400 italic">Complete PIN to confirm</p>
                      )}
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

        {/* Root-level error */}
        {formErrors._root && (
          <div className="mx-8 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{formErrors._root}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-8 py-5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAddMember}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors shadow-sm"
            style={{ backgroundColor: legColor }}
          >
            Add {isLeftLeg ? 'Left' : 'Right'} Member
          </button>
        </div>
      </div>
    </div>
  )
}
