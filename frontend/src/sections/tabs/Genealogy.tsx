import React, { useCallback, useEffect, useMemo, useState } from 'react'
import logo from './../../assets/refs/Logo.webp'
import MemberDetailsPanel from './membersDetailPanel'
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

const API_BASE_URL = 'https://coprofitglobal-production.up.railway.app'

function Genealogy() {
  const ACTION_BTN_WIDTH = 110
  const ACTION_BTN_HEIGHT = 36

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [originalRoot, setOriginalRoot] = useState<Member | null>(null)
  const [treeRoot, setTreeRoot] = useState<Member | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [svgSize, setSvgSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const svgRef = React.useRef<SVGSVGElement>(null)

  // Touch state for mobile pan & pinch-to-zoom
  const lastTouchRef = React.useRef<{ x: number; y: number } | null>(null)
  const lastPinchDistRef = React.useRef<number | null>(null)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])

  // Picker modal — shown first when "Add Left/Right Member" is clicked
  const [chooserModal, setChooserModal] = useState<{
    parent: Member
    leg: 'left' | 'right'
  } | null>(null)

  // Add-new-member modal
  const [modal, setModal] = useState<{
    parent: Member
    leg: 'left' | 'right'
  } | null>(null)

  // Place-existing-member modal
  const [existingModal, setExistingModal] = useState<{
    parent: Member
    leg: 'left' | 'right'
  } | null>(null)

  const [formData, setFormData] = useState<AddMemberFormData>(EMPTY_ADD_MEMBER_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Success / Error feedback modals
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null)
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null)

  const NODE_WIDTH = 190
  const NODE_HEIGHT = 240
  const MIN_HORIZONTAL_SPACING = 280
  const VERTICAL_SPACING = 320

  const resetModalState = useCallback(() => {
    setChooserModal(null)
    setModal(null)
    setExistingModal(null)
    setFormData(EMPTY_ADD_MEMBER_FORM)
    setFormErrors({})
  }, [])

  const extractCurrentUserId = () => {
    const storedUser = localStorage.getItem('user')

    if (!storedUser) {
      throw new Error('User not found. Please login first.')
    }

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
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load genealogy tree')
    }

    return data
  }, [])

  useEffect(() => {
    const initializeTree = async () => {
      try {
        setLoading(true)
        setError(null)

        const userId = extractCurrentUserId()

        if (!userId) {
          throw new Error('User ID not found in localStorage')
        }

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
      if (e.key === 'Escape') {
        resetModalState()
      }
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

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSvgSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>()

    const registerMembers = (member: Member | null | undefined) => {
      if (!member) return

      map.set(member.id, member)

      if (member.leftChild) registerMembers(member.leftChild)
      if (member.rightChild) registerMembers(member.rightChild)
    }

    registerMembers(originalRoot)
    return map
  }, [originalRoot])

  const allMembers = useMemo(() => Array.from(memberMap.values()), [memberMap])

  const getSubtreeWidth = (member: Member | undefined): number => {
    if (!member) return NODE_WIDTH

    const leftWidth = getSubtreeWidth(member.leftChild)
    const rightWidth = getSubtreeWidth(member.rightChild)

    if (!member.leftChild && !member.rightChild) {
      return NODE_WIDTH
    }

    if (member.leftChild && member.rightChild) {
      return leftWidth + rightWidth + MIN_HORIZONTAL_SPACING
    }

    return Math.max(leftWidth, rightWidth) + MIN_HORIZONTAL_SPACING / 2
  }

  const calculatePositions = (
    member: Member | null | undefined,
    x: number,
    y: number,
    map: Map<string, NodePosition> = new Map(),
  ) => {
    if (!member) return map

    map.set(member.id, { x, y })

    if (!member.leftChild && !member.rightChild) {
      return map
    }

    const leftWidth = getSubtreeWidth(member.leftChild)
    const rightWidth = getSubtreeWidth(member.rightChild)

    if (member.leftChild && member.rightChild) {
      const leftX = x - (rightWidth + MIN_HORIZONTAL_SPACING) / 2
      const rightX = x + (leftWidth + MIN_HORIZONTAL_SPACING) / 2

      calculatePositions(member.leftChild, leftX, y + VERTICAL_SPACING, map)
      calculatePositions(member.rightChild, rightX, y + VERTICAL_SPACING, map)
    } else if (member.leftChild) {
      const leftX = x - MIN_HORIZONTAL_SPACING / 2
      calculatePositions(member.leftChild, leftX, y + VERTICAL_SPACING, map)
    } else if (member.rightChild) {
      const rightX = x + MIN_HORIZONTAL_SPACING / 2
      calculatePositions(member.rightChild, rightX, y + VERTICAL_SPACING, map)
    }

    return map
  }

  const positions = useMemo(
    () => calculatePositions(treeRoot, 0, 0),
    [treeRoot],
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

      if (data.username.trim()) payload.username = data.username.trim()
      if (data.age) payload.age = Number(data.age)
      if (data.contact.trim()) payload.contact = data.contact.trim()
      if (data.address.trim()) payload.address = data.address.trim()
      if (data.beneficiary.trim()) payload.beneficiary = data.beneficiary.trim()
      if (data.birthday) payload.birthday = data.birthday

      const response = await fetch(`${API_BASE_URL}/genealogy/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setFormErrors({ _root: result.message || 'Failed to add member' })
        setErrorModal({
          title: 'Failed to Add Member',
          message: result.message || 'An unexpected error occurred. Please try again.',
        })
        return
      }

      const refreshedTree = await fetchRootTree(currentUserId)
      setOriginalRoot(refreshedTree)
      setTreeRoot(refreshedTree)

      resetModalState()
      setSuccessModal({
        title: 'Member Added!',
        message: 'The new member has been successfully added to the genealogy tree.',
      })
    } catch (err: any) {
      setFormErrors({ _root: err.message || 'Failed to add member' })
      setErrorModal({
        title: 'Failed to Add Member',
        message: err.message || 'An unexpected error occurred. Please try again.',
      })
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
        console.error('Failed to place existing member:', result.message)
        setErrorModal({
          title: 'Failed to Place Member',
          message: result.message || 'Could not place the existing member. Please try again.',
        })
        return
      }
      const refreshedTree = await fetchRootTree(currentUserId)
      setOriginalRoot(refreshedTree)
      setTreeRoot(refreshedTree)
      resetModalState()
      setSuccessModal({
        title: 'Member Placed!',
        message: 'The existing member has been successfully placed in the genealogy tree.',
      })
    } catch (err: any) {
      console.error('Error placing existing member:', err)
      setErrorModal({
        title: 'Placement Error',
        message: err.message || 'An unexpected error occurred while placing the member.',
      })
    }
  }

  const addNewMember = () => {
    if (!modal) return

    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    if (!formData.password) errors.password = 'Password is required'
    if (!formData.packagePin.trim()) errors.packagePin = 'Package PIN is required'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    attachMember(modal.parent, modal.leg, formData)
  }

  const handleReset = useCallback(() => {
    setTreeRoot(originalRoot)
    setPan({ x: 500, y: 150 })
    setZoom(1)
    setSearch('')
    setSearchResults([])
    setSelectedMember(null)
  }, [originalRoot])

  const handleSearch = (value: string) => {
    setSearch(value)

    if (!value.trim()) {
      setSearchResults([])
      return
    }

    const keyword = value.toLowerCase()

    const results = allMembers.filter((m) => {
      return (
        m.username.toLowerCase().includes(keyword) ||
        m.email.toLowerCase().includes(keyword) ||
        m.referralCode.toLowerCase().includes(keyword)
      )
    })

    setSearchResults(results)
  }

  // Visible world-space rectangle — add generous padding so nodes near edges aren't clipped
  const CULL_PADDING = 400
  const viewLeft   = (-pan.x - CULL_PADDING) / zoom
  const viewTop    = (-pan.y - CULL_PADDING) / zoom
  const viewRight  = (svgSize.w - pan.x + CULL_PADDING) / zoom
  const viewBottom = (svgSize.h - pan.y + CULL_PADDING) / zoom

  const renderTree = (member: Member | null | undefined): React.ReactNode[] => {
    if (!member) return []

    const pos = positions.get(member.id)
    if (!pos) return []

    const elements: React.ReactNode[] = []

    // Skip this node AND its subtree lines if completely outside viewport.
    // Children may still be in view (e.g. zoomed out) so we skip only the node
    // card itself, not the recursive calls.
    const nodeVisible =
      pos.x + NODE_WIDTH  >= viewLeft &&
      pos.x               <= viewRight &&
      pos.y + NODE_HEIGHT >= viewTop &&
      pos.y               <= viewBottom

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

    if (nodeVisible) elements.push(
      <g
        key={`node-${member.id}`}
        onClick={() => {
          setSelectedMember(member)
          setTreeRoot(member)
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
          stroke={selectedMember?.id === member.id ? '#7c3aed' : '#e5e7eb'}
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
          <circle cx={pos.x + 15} cy={pos.y + 15} r="4" fill="#10b981" />
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
              <tspan x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH / 2 - 6} dy="0">
                Add Left
              </tspan>
              <tspan x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH / 2 - 6} dy="12">
                Member
              </tspan>
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
              <tspan x={pos.x + NODE_WIDTH / 2 + ACTION_BTN_WIDTH / 2 + 6} dy="0">
                Add Right
              </tspan>
              <tspan x={pos.x + NODE_WIDTH / 2 + ACTION_BTN_WIDTH / 2 + 6} dy="12">
                Member
              </tspan>
            </text>
          </g>
        )}
      </g>,
    )

    return elements
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const newZoom = Math.min(Math.max(zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.3), 3)
    setZoom(newZoom)
  }

  // ── Touch handlers (mobile pan + pinch-to-zoom) ──────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      lastPinchDistRef.current = null
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistRef.current = Math.hypot(dx, dy)
      lastTouchRef.current = null
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x
      const dy = e.touches[0].clientY - lastTouchRef.current.y
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scale = dist / lastPinchDistRef.current
      setZoom((prev) => Math.min(Math.max(prev * scale, 0.3), 3))
      lastPinchDistRef.current = dist
    }
  }

  const handleTouchEnd = () => {
    lastTouchRef.current = null
    lastPinchDistRef.current = null
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
      className="w-full h-full overflow-hidden bg-white relative flex"
      style={{ userSelect: 'none', touchAction: 'none' }}
    >
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md px-2 sm:px-0">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search member..."
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white shadow-lg focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={handleReset}
              title="Reset view to root"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-lg shadow-lg transition whitespace-nowrap flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset
            </button>
          </div>          {searchResults.length > 0 && (
            <div className="bg-white shadow-lg rounded-lg mt-2 max-h-60 overflow-auto border border-gray-200">
              {searchResults.map((m) => (
                <div
                  key={m.id}
                  className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                  onClick={() => {
                    setTreeRoot(m)
                    setSearch('')
                    setSearchResults([])
                  }}
                >
                  <p className="font-semibold text-gray-800">{m.username}</p>
                  <p className="text-xs text-gray-600">{m.referralCode}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 1: Choose new vs existing */}
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

        {/* Step 2a: New member form */}
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

        {/* Step 2b: Place existing member */}
        <ExistingMemberModal
          modal={existingModal}
          onPlace={placeExistingMember}
          onClose={resetModalState}
          apiBaseUrl={API_BASE_URL}
        />

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="block cursor-grab active:cursor-grabbing"
          style={{ cursor: 'grab', touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {renderTree(treeRoot)}
          </g>
        </svg>
      </div>

      <MemberDetailsPanel
        selectedMember={selectedMember}
        onClose={() => setSelectedMember(null)}
      />

      {/* Success feedback modal */}
      <SuccessModal
        isOpen={!!successModal}
        onClose={() => setSuccessModal(null)}
        title={successModal?.title}
        message={successModal?.message}
        autoClose={4000}
      />

      {/* Error feedback modal */}
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