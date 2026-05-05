import React, { useCallback, useEffect, useMemo, useState } from 'react'
import logo from './../../assets/refs/Logo.webp'
import AddMemberModal, { EMPTY_ADD_MEMBER_FORM } from '../modals/AddMemberModal'
import type { AddMemberFormData } from '../modals/AddMemberModal'
import ChooseMemberTypeModal from '../modals/ChooseTypeModal'
import ExistingMemberModal from '../modals/ExistingUserModal'
import type { ExistingMemberResult } from '../modals/ExistingUserModal'
import ErrorModal from '../modals/errorModal'
import SuccessModal from '../modals/sucessModal'

interface Member {
  id: string
  userId?: string
  username: string
  email: string
  profileImage: string
  referralCode: string
  membershipTier?: string | null
  leftLegPoints: number
  rightLegPoints: number
  leftAvailablePoints: number
  rightAvailablePoints: number
  leftChild?: Member
  rightChild?: Member
  directReferralBonus?: number
  indirectReferralBonus?: number
  spillOverBonus?: number
  sign5Bonus?: number
  leadershipBonus?: number
  pairingBonus?: number
  age?: number
  contact?: string
  address?: string
  beneficiary?: string
  birthday?: string
}

interface NodePosition {
  x: number
  y: number
}

const API_BASE_URL = 'https://coprofitglobal-production-0787.up.railway.app'

// Layout constants — kept outside so position helpers can reference them
const NODE_WIDTH          = 190
const NODE_HEIGHT         = 240
const VERTICAL_SPACING    = 320
const ACTION_BTN_WIDTH    = 110
const ACTION_BTN_HEIGHT   = 36

// Fixed slot positions derived from a full 7-node tree with the algorithm below.
// Using these constants means every tree (1–7 nodes) shares the same angles/spacing.
//
// Derivation (MIN_HORIZONTAL_SPACING = 280):
//   level-1 children of a full subtree of width 660 each:
//     leftX  = 0 − (660 + 280) / 2 = −470
//     rightX = 0 + (660 + 280) / 2 = +470
//   level-2 children of a leaf pair (each subtree width = 190):
//     x = parentX ± (190 + 280) / 2 = parentX ± 235
const SLOT_POSITIONS: Record<string, NodePosition> = {
  '':   { x: 0,    y: 0 },
  'l':  { x: -470, y: VERTICAL_SPACING },
  'r':  { x:  470, y: VERTICAL_SPACING },
  'll': { x: -705, y: VERTICAL_SPACING * 2 },
  'lr': { x: -235, y: VERTICAL_SPACING * 2 },
  'rl': { x:  235, y: VERTICAL_SPACING * 2 },
  'rr': { x:  705, y: VERTICAL_SPACING * 2 },
}

// viewBox that perfectly fits all 7 slots with 60px padding on every side
//   content: x ∈ [−705, 895]  y ∈ [0, 936]  → w=1600, h=936
//   +60px padding → x0=−765, y0=−60, w=1720, h=1056
const FIXED_VIEWBOX = '-765 -60 1720 1056'

// Assign each member in the (depth-limited) tree to its fixed slot position
const buildSlotMap = (
  member: Member | null | undefined,
  path = '',
  map = new Map<string, NodePosition>(),
): Map<string, NodePosition> => {
  if (!member) return map
  const pos = SLOT_POSITIONS[path]
  if (pos) map.set(member.id, pos)
  if (member.leftChild)  buildSlotMap(member.leftChild,  path + 'l', map)
  if (member.rightChild) buildSlotMap(member.rightChild, path + 'r', map)
  return map
}

// Limit to 3 levels so at most 7 nodes are ever displayed (1 + 2 + 4)
const limitTreeDepth = (member: Member | null | undefined, maxDepth = 3): Member | null | undefined => {
  if (!member) return member
  if (maxDepth <= 1) return { ...member, leftChild: undefined, rightChild: undefined }
  return {
    ...member,
    leftChild:  member.leftChild  ? (limitTreeDepth(member.leftChild,  maxDepth - 1) as Member) : undefined,
    rightChild: member.rightChild ? (limitTreeDepth(member.rightChild, maxDepth - 1) as Member) : undefined,
  }
}

function Genealogy() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [originalRoot, setOriginalRoot] = useState<Member | null>(null)
  const [treeRoot, setTreeRoot] = useState<Member | null>(null)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])

  const [chooserModal, setChooserModal] = useState<{ parent: Member; leg: 'left' | 'right' } | null>(null)
  const [modal, setModal] = useState<{ parent: Member; leg: 'left' | 'right' } | null>(null)
  const [existingModal, setExistingModal] = useState<{ parent: Member; leg: 'left' | 'right' } | null>(null)

  const [formData, setFormData] = useState<AddMemberFormData>(EMPTY_ADD_MEMBER_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null)
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null)

  const resetModalState = useCallback(() => {
    setChooserModal(null)
    setModal(null)
    setExistingModal(null)
    setFormData(EMPTY_ADD_MEMBER_FORM)
    setFormErrors({})
  }, [])

  const extractCurrentUserId = () => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) throw new Error('User not found. Please login first.')
    try {
      const userData = JSON.parse(storedUser)
      return userData.id || userData._id || userData.userId
    } catch {
      return storedUser
    }
  }

  const fetchRootTree = useCallback(async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/genealogy/root/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Failed to load genealogy tree')
    return data
  }, [])

  useEffect(() => {
    const initializeTree = async () => {
      try {
        setLoading(true)
        setError(null)
        const userId = extractCurrentUserId()
        if (!userId) throw new Error('User ID not found in localStorage')
        setCurrentUserId(userId)
        const treeData = await fetchRootTree(userId)
        setOriginalRoot(treeData)
        setTreeRoot(treeData)
      } catch (err: any) {
        setError(err.message || 'Failed to load genealogy tree')
      } finally {
        setLoading(false)
      }
    }
    initializeTree()
  }, [fetchRootTree])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetModalState()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [resetModalState])

  useEffect(() => {
    const handleRefresh = () => {
      if (!currentUserId) return
      fetchRootTree(currentUserId)
        .then((treeData) => {
          setOriginalRoot(treeData)
          setTreeRoot(treeData)
        })
        .catch(() => {})
    }
    window.addEventListener('genealogy:refresh', handleRefresh)
    window.addEventListener('cycle:changed', handleRefresh)
    return () => {
      window.removeEventListener('genealogy:refresh', handleRefresh)
      window.removeEventListener('cycle:changed', handleRefresh)
    }
  }, [currentUserId, fetchRootTree])

  // Full member map — used to resolve complete member data (with all descendants) on click
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>()
    const register = (member: Member | null | undefined) => {
      if (!member) return
      map.set(member.id, member)
      register(member.leftChild)
      register(member.rightChild)
    }
    register(originalRoot)
    return map
  }, [originalRoot])

  const allMembers = useMemo(() => Array.from(memberMap.values()), [memberMap])

  // Tree capped at 3 levels (max 7 nodes)
  const displayRoot = useMemo(() => limitTreeDepth(treeRoot, 3), [treeRoot])

  // Map each visible member to its fixed slot position
  const positions = useMemo(() => buildSlotMap(displayRoot), [displayRoot])

  const attachMember = async (parent: Member, leg: 'left' | 'right', data: AddMemberFormData) => {
    try {
      if (!currentUserId) {
        setFormErrors({ _root: 'Logged-in user not found' })
        return
      }
      setSubmitting(true)
      const payload: Record<string, any> = {
        parentUserId: parent.userId || parent.id,
        leg,
        placerUserId: currentUserId,
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        packagePin: data.packagePin.trim(),
      }
      if (data.username.trim())   payload.username   = data.username.trim()
      if (data.age)               payload.age        = Number(data.age)
      if (data.contact.trim())    payload.contact    = data.contact.trim()
      if (data.address.trim())    payload.address    = data.address.trim()
      if (data.beneficiary.trim()) payload.beneficiary = data.beneficiary.trim()
      if (data.birthday)          payload.birthday   = data.birthday
      const response = await fetch(`${API_BASE_URL}/genealogy/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setFormErrors({ _root: result.message || 'Failed to add member' })
        setErrorModal({ title: 'Failed to Add Member', message: result.message || 'An unexpected error occurred. Please try again.' })
        return
      }
      const refreshedTree = await fetchRootTree(currentUserId)
      setOriginalRoot(refreshedTree)
      setTreeRoot(refreshedTree)
      resetModalState()
      setSuccessModal({ title: 'Member Added!', message: 'The new member has been successfully added to the genealogy tree.' })
    } catch (err: any) {
      setFormErrors({ _root: err.message || 'Failed to add member' })
      setErrorModal({ title: 'Failed to Add Member', message: err.message || 'An unexpected error occurred. Please try again.' })
      console.error('Error adding member:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const placeExistingMember = async (member: ExistingMemberResult) => {
    if (!existingModal || !currentUserId) return
    try {
      const payload = {
        parentUserId: existingModal.parent.userId || existingModal.parent.id,
        leg: existingModal.leg,
        placerUserId: currentUserId,
        existingMemberId: member.userId || member.id,
      }
      const response = await fetch(`${API_BASE_URL}/genealogy/place-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setErrorModal({ title: 'Failed to Place Member', message: result.message || 'Could not place the existing member. Please try again.' })
        return
      }
      const refreshedTree = await fetchRootTree(currentUserId)
      setOriginalRoot(refreshedTree)
      setTreeRoot(refreshedTree)
      resetModalState()
      setSuccessModal({ title: 'Member Placed!', message: 'The existing member has been successfully placed in the genealogy tree.' })
    } catch (err: any) {
      setErrorModal({ title: 'Placement Error', message: err.message || 'An unexpected error occurred while placing the member.' })
    }
  }

  const addNewMember = () => {
    if (!modal) return
    const errors: Record<string, string> = {}
    if (!formData.name.trim())       errors.name       = 'Name is required'
    if (!formData.email.trim())      errors.email      = 'Email is required'
    if (!formData.password)          errors.password   = 'Password is required'
    if (!formData.packagePin.trim()) errors.packagePin = 'Package PIN is required'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    attachMember(modal.parent, modal.leg, formData)
  }

  const handleReset = useCallback(() => {
    setTreeRoot(originalRoot)
    setSearch('')
    setSearchResults([])
  }, [originalRoot])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    const keyword = value.toLowerCase()
    const results = allMembers.filter(
      (m) =>
        m.username.toLowerCase().includes(keyword) ||
        m.email.toLowerCase().includes(keyword) ||
        m.referralCode.toLowerCase().includes(keyword),
    )
    setSearchResults(results)
  }

  const renderTree = (member: Member | null | undefined): React.ReactNode[] => {
    if (!member) return []
    const pos = positions.get(member.id)
    if (!pos) return []
    const elements: React.ReactNode[] = []

    if (member.leftChild) {
      const childPos = positions.get(member.leftChild.id)
      if (childPos) {
        elements.push(
          <line
            key={`line-${member.id}-left`}
            x1={pos.x + NODE_WIDTH / 2}
            y1={pos.y + NODE_HEIGHT}
            x2={childPos.x + NODE_WIDTH / 2}
            y2={childPos.y}
            stroke="rgba(16,185,129,0.25)"
            strokeWidth="2"
          />,
        )
      }
      elements.push(...renderTree(member.leftChild))
    }

    if (member.rightChild) {
      const childPos = positions.get(member.rightChild.id)
      if (childPos) {
        elements.push(
          <line
            key={`line-${member.id}-right`}
            x1={pos.x + NODE_WIDTH / 2}
            y1={pos.y + NODE_HEIGHT}
            x2={childPos.x + NODE_WIDTH / 2}
            y2={childPos.y}
            stroke="rgba(245,158,11,0.25)"
            strokeWidth="2"
          />,
        )
      }
      elements.push(...renderTree(member.rightChild))
    }

    elements.push(
      <g
        key={`node-${member.id}`}
        onClick={() => {
          // Look up the full member (all descendants) so a clicked grandchild
          // correctly becomes the new root with its real subtree
          const fullMember = memberMap.get(member.id) ?? member
          setTreeRoot(fullMember)
        }}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={pos.x}
          y={pos.y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx="14"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        <circle
          cx={pos.x + NODE_WIDTH / 2}
          cy={pos.y + 55}
          r="32"
          fill="#f3f4f6"
          stroke="#d1d5db"
        />

        <image
          href={member.profileImage || logo}
          x={pos.x + NODE_WIDTH / 2 - 30}
          y={pos.y + 25}
          width="60"
          height="60"
          preserveAspectRatio="xMidYMid slice"
          clipPath="circle(30px at 30px 30px)"
        />

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 125}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="#7c3aed"
        >
          {member.username}
        </text>

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 145}
          textAnchor="middle"
          fontSize="12"
          fill="#9ca3af"
        >
          {member.email}
        </text>

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 210}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="#6b7280"
        >
          Points ( L {member.leftAvailablePoints ?? 0} • R {member.rightAvailablePoints ?? 0} )
        </text>

        <g>
          <circle cx={pos.x + 15}              cy={pos.y + 15} r="4" fill="#10b981" />
          <circle cx={pos.x + NODE_WIDTH - 15} cy={pos.y + 15} r="4" fill="#f59e0b" />
        </g>

        {!member.leftChild && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              setChooserModal({ parent: member, leg: 'left' })
            }}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH - 6}
              y={pos.y + NODE_HEIGHT + 10}
              width={ACTION_BTN_WIDTH}
              height={ACTION_BTN_HEIGHT}
              rx="8"
              fill="#10b981"
            />
            <text
              x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH / 2 - 6}
              y={pos.y + NODE_HEIGHT + 26}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fontWeight="600"
            >
              <tspan x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH / 2 - 6} dy="0">Add Left</tspan>
              <tspan x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH / 2 - 6} dy="12">Member</tspan>
            </text>
          </g>
        )}

        {!member.rightChild && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              setChooserModal({ parent: member, leg: 'right' })
            }}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pos.x + NODE_WIDTH / 2 + 6}
              y={pos.y + NODE_HEIGHT + 10}
              width={ACTION_BTN_WIDTH}
              height={ACTION_BTN_HEIGHT}
              rx="8"
              fill="#f59e0b"
            />
            <text
              x={pos.x + NODE_WIDTH / 2 + ACTION_BTN_WIDTH / 2 + 6}
              y={pos.y + NODE_HEIGHT + 26}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fontWeight="600"
            >
              <tspan x={pos.x + NODE_WIDTH / 2 + ACTION_BTN_WIDTH / 2 + 6} dy="0">Add Right</tspan>
              <tspan x={pos.x + NODE_WIDTH / 2 + ACTION_BTN_WIDTH / 2 + 6} dy="12">Member</tspan>
            </text>
          </g>
        )}
      </g>,
    )

    return elements
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading genealogy tree...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <p className="text-gray-600 text-sm">Please make sure:</p>
          <ul className="text-gray-600 text-sm mt-2 text-left inline-block">
            <li>• Your backend server is running on {API_BASE_URL}</li>
            <li>• You have a valid logged-in user in localStorage</li>
          </ul>
        </div>
      </div>
    )
  }

  if (!treeRoot) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <p className="text-gray-600">No genealogy tree found</p>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full overflow-hidden bg-white relative"
      style={{ userSelect: 'none' }}
    >
      {/* Floating search bar — top-left */}
      <div className="absolute top-4 left-4 z-20 w-72">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search member..."
            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg bg-white shadow-lg focus:outline-none focus:border-indigo-500 transition text-sm"
          />
          <button
            onClick={handleReset}
            title="Reset to root"
            className="px-3 py-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-lg shadow-lg transition flex items-center gap-1 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="bg-white shadow-lg rounded-lg mt-2 max-h-60 overflow-auto border border-gray-200">
            {searchResults.map((m) => (
              <div
                key={m.id}
                className="px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                onClick={() => {
                  setTreeRoot(m)
                  setSearch('')
                  setSearchResults([])
                }}
              >
                <p className="font-semibold text-gray-800 text-sm">{m.username}</p>
                <p className="text-xs text-gray-500">{m.referralCode}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChooseMemberTypeModal
        modal={chooserModal}
        onChooseNew={() => {
          setModal(chooserModal)
          setFormData(EMPTY_ADD_MEMBER_FORM)
          setFormErrors({})
          setChooserModal(null)
        }}
        onChooseExisting={() => {
          setExistingModal(chooserModal)
          setChooserModal(null)
        }}
        onClose={resetModalState}
      />

      <AddMemberModal
        modal={modal}
        formData={formData}
        formErrors={formErrors}
        submitting={submitting}
        setFormData={setFormData}
        setFormErrors={setFormErrors}
        onAddMember={addNewMember}
        onClose={resetModalState}
      />

      <ExistingMemberModal
        modal={existingModal}
        onPlace={placeExistingMember}
        onClose={resetModalState}
        apiBaseUrl={API_BASE_URL}
      />

      <svg
        width="100%"
        height="100%"
        viewBox={FIXED_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className="block"
      >
        {renderTree(displayRoot)}
      </svg>

      <SuccessModal
        isOpen={!!successModal}
        onClose={() => setSuccessModal(null)}
        title={successModal?.title}
        message={successModal?.message}
        autoClose={4000}
      />

      <ErrorModal
        isOpen={!!errorModal}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title}
        message={errorModal?.message}
        retryLabel="Try Again"
        onRetry={() => setErrorModal(null)}
      />
    </div>
  )
}

export default Genealogy