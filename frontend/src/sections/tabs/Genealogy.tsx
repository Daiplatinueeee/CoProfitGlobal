import React, { useCallback, useEffect, useMemo, useState } from 'react'
import logo from './../../assets/refs/Logo.webp'
import MemberDetailsPanel from './membersDetailPanel'
import AddMemberModal from './AddMemberModal'

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

interface AddMemberFormData {
  username: string
}

const API_BASE_URL = 'http://localhost:3000'

function Genealogy() {
  const ACTION_BTN_WIDTH = 110
  const ACTION_BTN_HEIGHT = 36

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [originalRoot, setOriginalRoot] = useState<Member | null>(null)
  const [treeRoot, setTreeRoot] = useState<Member | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])

  const [modal, setModal] = useState<{
    parent: Member
    leg: 'left' | 'right'
  } | null>(null)

  const [formData, setFormData] = useState<AddMemberFormData>({
    username: '',
  })
  const [formError, setFormError] = useState('')

  const NODE_WIDTH = 190
  const NODE_HEIGHT = 240
  const MIN_HORIZONTAL_SPACING = 280
  const VERTICAL_SPACING = 320

  const resetModalState = useCallback(() => {
    setModal(null)
    setFormData({ username: '' })
    setFormError('')
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

 const attachMember = async (parent: Member, leg: 'left' | 'right', username: string) => {
  try {
    if (!currentUserId) {
      setFormError('Logged-in user not found')
      return
    }

    const payload = {
      parentUserId: parent.userId || parent.id,
      leg,
      username: username.trim(),
      placerUserId: currentUserId,
    }

    const response = await fetch(`${API_BASE_URL}/genealogy/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      setFormError(data.message || 'Failed to add member')
      return
    }

    const refreshedTree = await fetchRootTree(currentUserId)
    setOriginalRoot(refreshedTree)
    setTreeRoot(refreshedTree)

    resetModalState()
  } catch (err: any) {
    setFormError(err.message || 'Failed to add member')
    console.error('Error adding member:', err)
  }
}

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFormError('')
  }

  const addNewMember = () => {
    if (!modal) return

    const username = formData.username.trim()

    if (!username) {
      setFormError('Username is required')
      return
    }

    attachMember(modal.parent, modal.leg, username)
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
              setModal({ parent: member, leg: 'left' })
              setFormData({ username: '' })
              setFormError('')
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
              setModal({ parent: member, leg: 'right' })
              setFormData({ username: '' })
              setFormError('')
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

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading genealogy tree...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
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
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600">No genealogy tree found</p>
      </div>
    )
  }

  return (
    <div
      className="w-full h-screen overflow-hidden bg-white relative flex"
      style={{ userSelect: 'none' }}
    >
      <div className="flex-1 overflow-hidden relative">
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-md">
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

        <AddMemberModal
          modal={modal}
          formData={formData}
          formError={formError}
          onFormChange={handleFormChange}
          onAddMember={addNewMember}
          onClose={resetModalState}
        />

        <svg
          width="100%"
          height="100%"
          className="block cursor-grab active:cursor-grabbing"
          style={{ cursor: 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
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
    </div>
  )
}

export default Genealogy