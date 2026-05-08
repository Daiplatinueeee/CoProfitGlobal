import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/apiFetch'
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
  hasLeftChild?: boolean
  hasRightChild?: boolean
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Layout constants — kept outside so position helpers can reference them
const NODE_WIDTH          = 270
const NODE_HEIGHT         = 330
const VERTICAL_SPACING    = 430
const ACTION_BTN_WIDTH    = 120
const ACTION_BTN_HEIGHT   = 40

// Compute node positions and SVG viewBox dynamically for any tree depth.
// depth=2 → 7 nodes, depth=3 → up to 15 nodes.
// Leaf-slot widths: depth 2 = 470px gap (spacious), depth 3 = 235px (compact).
function computeTreeLayout(
  root: Member | null | undefined,
  maxDepth: number,
): { positions: Map<string, NodePosition>; viewBox: string } {
  const positions = new Map<string, NodePosition>()
  if (!root) return { positions, viewBox: '0 -60 1720 1000' }

  const leafSlotW  = maxDepth <= 2 ? 470 : 235
  const numSlots   = Math.pow(2, maxDepth)
  const contentW   = numSlots * leafSlotW

  function place(
    member: Member | null | undefined,
    level: number,
    slotL: number,
    slotR: number,
  ) {
    if (!member) return
    const cx = (slotL + slotR) / 2
    positions.set(member.id, { x: Math.round(cx - NODE_WIDTH / 2), y: level * VERTICAL_SPACING })
    if (level >= maxDepth) return
    const mid = (slotL + slotR) / 2
    place(member.leftChild,  level + 1, slotL, mid)
    place(member.rightChild, level + 1, mid,   slotR)
  }
  place(root, 0, 0, contentW)

  // Tight viewBox around actual node content + 60px padding
  let minX = Infinity, maxX = -Infinity
  for (const p of positions.values()) {
    if (p.x < minX) minX = p.x
    if (p.x + NODE_WIDTH > maxX) maxX = p.x + NODE_WIDTH
  }
  const PAD     = 60
  const vbX     = minX - PAD
  const vbW     = maxX - minX + PAD * 2
  const vbH     = maxDepth * VERTICAL_SPACING + NODE_HEIGHT + 120
  const viewBox = `${vbX} -60 ${vbW} ${vbH}`

  return { positions, viewBox }
}

function GenealogySkeletonLoader() {
  const ns = 54
  const nodes = [
    { x: 158, y: 0   },
    { x:  68, y: 115 },
    { x: 248, y: 115 },
    { x:  10, y: 230 },
    { x: 126, y: 230 },
    { x: 190, y: 230 },
    { x: 306, y: 230 },
  ]
  const cx = (n: { x: number }) => n.x + ns / 2

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white gap-8 select-none">
      <div className="animate-pulse flex flex-col items-center gap-1">
        <svg width="370" height="300" viewBox="0 0 370 300">
          <line x1={cx(nodes[0])} y1={ns}      x2={cx(nodes[1])} y2={115}  stroke="#e0e7ff" strokeWidth="2" />
          <line x1={cx(nodes[0])} y1={ns}      x2={cx(nodes[2])} y2={115}  stroke="#fef3c7" strokeWidth="2" />
          <line x1={cx(nodes[1])} y1={115 + ns} x2={cx(nodes[3])} y2={230} stroke="#e0e7ff" strokeWidth="2" />
          <line x1={cx(nodes[1])} y1={115 + ns} x2={cx(nodes[4])} y2={230} stroke="#e0e7ff" strokeWidth="2" />
          <line x1={cx(nodes[2])} y1={115 + ns} x2={cx(nodes[5])} y2={230} stroke="#fef3c7" strokeWidth="2" />
          <line x1={cx(nodes[2])} y1={115 + ns} x2={cx(nodes[6])} y2={230} stroke="#fef3c7" strokeWidth="2" />
          {nodes.map((n, i) => (
            <g key={i}>
              <rect x={n.x} y={n.y} width={ns} height={ns} rx="12"
                fill="#f8fafc" stroke={i <= 0 ? '#a5b4fc' : i <= 2 ? '#c7d2fe' : '#dde3f7'}
                strokeWidth="1.5" />
              <circle cx={n.x + ns / 2} cy={n.y + 18} r="9" fill={i <= 0 ? '#c7d2fe' : '#e0e7ff'} />
              <rect x={n.x + 8}  y={n.y + 34} width={ns - 16} height="5" rx="3" fill="#e2e8f0" />
              <rect x={n.x + 13} y={n.y + 43} width={ns - 26} height="4" rx="2" fill="#f1f5f9" />
            </g>
          ))}
        </svg>
      </div>
      <div className="text-center">
        <p className="text-slate-600 text-sm font-medium tracking-wide">Loading genealogy tree…</p>
      </div>
    </div>
  )
}

function Genealogy() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [originalRoot, setOriginalRoot] = useState<Member | null>(null)
  const [treeRoot, setTreeRoot] = useState<Member | null>(null)
  const [currentDepth, setCurrentDepth] = useState(2)

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
    const response = await apiFetch(`${API_BASE_URL}/genealogy/root/${userId}?depth=2`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Failed to load genealogy tree')
    return data
  }, [])

  const navigateTo = useCallback(async (member: Member) => {
    const targetId = member.userId || member.id
    setCurrentDepth(2)
    try {
      const response = await apiFetch(`${API_BASE_URL}/genealogy/root/${targetId}?depth=2`)
      const data = await response.json()
      if (response.ok) setTreeRoot(data)
    } catch {
      // silently keep current view on failure
    }
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

  // Member map built from the currently visible tree (up to 7 nodes)
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>()
    const register = (member: Member | null | undefined) => {
      if (!member) return
      map.set(member.id, member)
      register(member.leftChild)
      register(member.rightChild)
    }
    register(treeRoot)
    return map
  }, [treeRoot])

  const allMembers = useMemo(() => Array.from(memberMap.values()), [memberMap])

  const displayRoot = treeRoot

  const { positions, viewBox } = useMemo(
    () => computeTreeLayout(displayRoot, currentDepth),
    [displayRoot, currentDepth],
  )

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
      const response = await apiFetch(`${API_BASE_URL}/genealogy/place-existing`, {
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
    setCurrentDepth(2)
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

  const renderTree = (member: Member | null | undefined, level = 0): React.ReactNode[] => {
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
      elements.push(...renderTree(member.leftChild, level + 1))
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
      elements.push(...renderTree(member.rightChild, level + 1))
    }

    elements.push(
      <g
        key={`node-${member.id}`}
        onClick={() => navigateTo(member)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={pos.x}
          y={pos.y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx="16"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        <circle
          cx={pos.x + NODE_WIDTH / 2}
          cy={pos.y + 72}
          r="46"
          fill="#f3f4f6"
          stroke="#d1d5db"
        />

        <image
          href={member.profileImage || logo}
          x={pos.x + NODE_WIDTH / 2 - 44}
          y={pos.y + 28}
          width="88"
          height="88"
          preserveAspectRatio="xMidYMid slice"
          clipPath="circle(44px at 44px 44px)"
        />

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 162}
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#7c3aed"
        >
          {member.username}
        </text>

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 200}
          textAnchor="middle"
          fontSize="23"
          fill="#9ca3af"
        >
          <tspan x={pos.x + NODE_WIDTH / 2} dy="0">
            {member.email.split('@')[0]}
          </tspan>
          <tspan x={pos.x + NODE_WIDTH / 2} dy="30">
            @{member.email.split('@')[1]}
          </tspan>
        </text>

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 290}
          textAnchor="middle"
          fontSize="20"
          fontWeight="600"
          fill="#6b7280"
        >
          Points ( L {member.leftAvailablePoints ?? 0} • R {member.rightAvailablePoints ?? 0} )
        </text>

        <circle cx={pos.x + 18}              cy={pos.y + 18} r="5" fill="#10b981" />
        <circle cx={pos.x + NODE_WIDTH - 18} cy={pos.y + 18} r="5" fill="#f59e0b" />

        {level < 2 && !member.leftChild && !member.hasLeftChild && (
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
              y={pos.y + NODE_HEIGHT + 34}
              textAnchor="middle"
              fontSize="18"
              fill="white"
              fontWeight="600"
            >
              Add Left
            </text>
          </g>
        )}

        {level < 2 && !member.rightChild && !member.hasRightChild && (
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
              y={pos.y + NODE_HEIGHT + 34}
              textAnchor="middle"
              fontSize="18"
              fill="white"
              fontWeight="600"
            >
              Add Right
            </text>
          </g>
        )}
      </g>,
    )

    return elements
  }

  if (loading) {
    return <GenealogySkeletonLoader />
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
    <div className="w-full h-full flex overflow-hidden bg-white">
    <div
      className="flex-1 overflow-hidden relative"
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
                  setSearch('')
                  setSearchResults([])
                  navigateTo(m)
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
        viewBox={viewBox}
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

    </div>
  )
}

export default Genealogy