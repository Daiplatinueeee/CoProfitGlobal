import React from 'react'

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

interface FormData {
  username: string
}

interface AddMemberModalProps {
  modal: { parent: Member; leg: 'left' | 'right' } | null
  formData: FormData
  formError: string
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onAddMember: () => void
  onClose: () => void
}

export default function AddMemberModal({
  modal,
  formData,
  formError,
  onFormChange,
  onAddMember,
  onClose,
}: AddMemberModalProps) {
  if (!modal) return null

  const isLeftLeg = modal.leg === 'left'
  const legColor = isLeftLeg ? '#10b981' : '#f59e0b'
  const legGradient = isLeftLeg
    ? 'from-emerald-50 to-emerald-100'
    : 'from-amber-50 to-amber-100'

  const isFormValid = formData.username?.trim()

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT PANEL */}
        <div
          className={`md:w-2/5 bg-linear-to-br ${legGradient} p-8 md:p-12 flex flex-col justify-center items-center md:border-r border-gray-200`}
          style={{
            backgroundImage: `linear-gradient(135deg, ${
              isLeftLeg ? '#f0fdf4' : '#fffbf0'
            } 0%, ${isLeftLeg ? '#e0f2fe' : '#fef3c7'} 100%)`,
          }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg"
            style={{ backgroundColor: legColor }}
          >
            <span className="text-4xl font-bold text-white">
              {isLeftLeg ? 'L' : 'R'}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {isLeftLeg ? 'Left Leg' : 'Right Leg'}
          </h3>

          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-1">Adding to parent:</p>
            <p className="text-lg font-semibold text-gray-900">{modal.parent.username}</p>
            <p className="text-xs text-gray-500 mt-1">{modal.parent.email}</p>
          </div>

          <div className="w-full bg-white bg-opacity-60 rounded-2xl p-4 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Left Points</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {modal.parent.leftLegPoints}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Right Points</p>
                <p className="text-2xl font-bold text-amber-600">
                  {modal.parent.rightLegPoints}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: legColor }}></div>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `${legColor}80` }}
            ></div>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `${legColor}40` }}
            ></div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="md:w-3/5 p-8 md:p-12 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-3xl text-gray-900 mb-2">Add Existing Member</h2>
            <p className="text-gray-600">
              Enter the username of the existing member you want to place on the{' '}
              <span style={{ color: legColor }} className="font-semibold">
                {isLeftLeg ? 'left' : 'right'}
              </span>{' '}
              leg.
            </p>
          </div>

          {formError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div>
                <p className="text-red-800 font-medium text-sm">{formError}</p>
              </div>
            </div>
          )}

          <form className="space-y-5">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Username
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={onFormChange}
                  placeholder="Enter existing username"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 transition"
                  style={{ '--tw-ring-color': legColor } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onAddMember}
                disabled={!isFormValid}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition transform hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ backgroundColor: isFormValid ? legColor : '#cccccc' }}
              >
                Add Member
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition transform hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}