import React from 'react'
import { X, UserPlus, Users, ShieldAlert } from 'lucide-react'

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

interface ChooseMemberTypeModalProps {
  modal: { parent: Member; leg: 'left' | 'right' } | null
  onChooseNew: () => void
  onChooseExisting: () => void
  onClose: () => void
}

export default function ChooseMemberTypeModal({
  modal,
  onChooseNew,
  onChooseExisting,
  onClose,
}: ChooseMemberTypeModalProps) {
  if (!modal) return null

  const isLeftLeg = modal.leg === 'left'
  const legColor = isLeftLeg ? '#10b981' : '#f59e0b'
  const legLabel = isLeftLeg ? 'Left' : 'Right'

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5 border-b border-gray-100"
          style={{ borderLeftWidth: 4, borderLeftColor: legColor }}
        >
          <div>
            <h2 className="text-xl text-gray-900">
              Add{' '}
              <span style={{ color: legColor }} className="font-semibold">
                {legLabel}
              </span>{' '}
              Member
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Under{' '}
              <span className="font-semibold text-gray-700">{modal.parent.username}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-4">
          <p className="text-sm text-gray-500">
            How would you like to add a member to the{' '}
            <span className="font-semibold" style={{ color: legColor }}>
              {legLabel.toLowerCase()} leg
            </span>
            ?
          </p>

          {/* New Member Option */}
          <button
            onClick={onChooseNew}
            className="w-full flex items-start gap-4 px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors mt-0.5">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                Add New Member
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Register a brand-new account with personal details, credentials, and a package PIN.
              </p>
            </div>
          </button>

          {/* Existing Member Option */}
          <button
            onClick={onChooseExisting}
            className="w-full flex items-start gap-4 px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors mt-0.5">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-700 transition-colors">
                Place Existing Member
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Assign an already-registered member to this position in the tree.
              </p>
              {/* Admin note */}
              <div className="flex items-start gap-1.5 mt-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  <span className="font-semibold">Admin use only.</span> This is intended for members
                  that have already been registered by an administrator and need to be placed into
                  the network.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}