import React, { useState, useRef, useEffect } from 'react'
import logo from './../../assets/refs/Logo.webp'
import MemberDetailsPanel from './membersDetailPanel'

interface Member {
  id: string
  username: string
  email: string
  profileImage: string
  referralCode: string
  leftLegPoints: number
  rightLegPoints: number
  leftChild?: Member
  rightChild?: Member
  directReferralBonus?: number
  indirectReferralBonus?: number
  spillOverBonus?: number
  sign5Bonus?: number
  leadershipBonus?: number
  pairingBonus?: number
}

const samplePool: Member[] = [
  {
    id: 'sp1',
    username: 'SAMPLE_USER_01',
    email: 'sample1@company.com',
    profileImage: logo,
    referralCode: 'PIN-1001',
    leftLegPoints: 0,
    rightLegPoints: 0,
  },
  {
    id: 'sp2',
    username: 'SAMPLE_USER_02',
    email: 'sample2@company.com',
    profileImage: logo,
    referralCode: 'PIN-1002',
    leftLegPoints: 0,
    rightLegPoints: 0,
  },
  {
    id: 'sp3',
    username: 'SAMPLE_USER_03',
    email: 'sample3@company.com',
    profileImage: logo,
    referralCode: 'PIN-1003',
    leftLegPoints: 0,
    rightLegPoints: 0,
  },
  {
    id: 'sp4',
    username: 'SAMPLE_USER_04',
    email: 'sample4@company.com',
    profileImage: logo,
    referralCode: 'PIN-1004',
    leftLegPoints: 0,
    rightLegPoints: 0,
  },
  {
    id: 'sp5',
    username: 'SAMPLE_USER_05',
    email: 'sample5@company.com',
    profileImage: logo,
    referralCode: 'PIN-1005',
    leftLegPoints: 0,
    rightLegPoints: 0,
  },
  {
    id: 'sp6',
    username: 'SAMPLE_USER_06',
    email: 'sample6@company.com',
    profileImage: logo,
    referralCode: 'PIN-1006',
    leftLegPoints: 0,
    rightLegPoints: 0,
  },
]

const sampleData: Member = {
  id: '1',
  username: 'FOUNDER',
  email: 'founder@company.com',
  profileImage: logo,
  referralCode: 'REF-FOUNDER',
  leftLegPoints: 0,
  rightLegPoints: 88,
  directReferralBonus: 2500,
  indirectReferralBonus: 1200,
  spillOverBonus: 800,
  sign5Bonus: 500,
  leadershipBonus: 3000,
  pairingBonus: 450,
  leftChild: {
    id: '2',
    username: 'COPROFITGLOBALCORP2',
    email: 'member2@company.com',
    profileImage: logo,
    referralCode: 'REF-2',
    leftLegPoints: 349,
    rightLegPoints: 0,
    directReferralBonus: 1200,
    indirectReferralBonus: 600,
    spillOverBonus: 400,
    sign5Bonus: 250,
    leadershipBonus: 1500,
    pairingBonus: 350,
    leftChild: {
      id: '4',
      username: 'COPROFITGLOBALCORP04',
      email: 'member4@company.com',
      profileImage: logo,
      referralCode: 'REF-4',
      leftLegPoints: 0,
      rightLegPoints: 41,
      directReferralBonus: 600,
      indirectReferralBonus: 300,
      spillOverBonus: 200,
      sign5Bonus: 100,
      leadershipBonus: 750,
      pairingBonus: 200,
    },
    rightChild: {
      id: '5',
      username: 'COPROFITGLOBALCORP05',
      email: 'member5@company.com',
      profileImage: logo,
      referralCode: 'REF-5',
      leftLegPoints: 0,
      rightLegPoints: 0,
      directReferralBonus: 400,
      indirectReferralBonus: 150,
      spillOverBonus: 100,
      sign5Bonus: 50,
      leadershipBonus: 400,
      pairingBonus: 150,
    },
  },
  rightChild: {
    id: '3',
    username: 'COPROFITGLOBALCORP3',
    email: 'member3@company.com',
    profileImage: logo,
    referralCode: 'REF-3',
    leftLegPoints: 0,
    rightLegPoints: 379,
    directReferralBonus: 1500,
    indirectReferralBonus: 800,
    spillOverBonus: 500,
    sign5Bonus: 300,
    leadershipBonus: 2000,
    pairingBonus: 420,
    leftChild: {
      id: '6',
      username: 'COPROFITGLOBALCORP06',
      email: 'member6@company.com',
      profileImage: logo,
      referralCode: 'REF-6',
      leftLegPoints: 0,
      rightLegPoints: 0,
      directReferralBonus: 500,
      indirectReferralBonus: 250,
      spillOverBonus: 150,
      sign5Bonus: 75,
      leadershipBonus: 600,
      pairingBonus: 180,
    },
    rightChild: {
      id: '7',
      username: 'COPROFITGLOBALCORP07',
      email: 'member7@company.com',
      profileImage: logo,
      referralCode: 'REF-7',
      leftLegPoints: 0,
      rightLegPoints: 379,
      directReferralBonus: 800,
      indirectReferralBonus: 400,
      spillOverBonus: 250,
      sign5Bonus: 150,
      leadershipBonus: 1000,
      pairingBonus: 300,
    },
  },
}

interface NodePosition {
  x: number
  y: number
}

function Genealogy() {
  const svgRef = useRef<SVGSVGElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const ACTION_BTN_WIDTH = 110
  const ACTION_BTN_HEIGHT = 36

  const [originalRoot] = useState<Member>(sampleData)
  const [treeRoot, setTreeRoot] = useState<Member>(sampleData)
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

  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [selectedFromPool, setSelectedFromPool] = useState<Member | null>(null)

  const NODE_WIDTH = 190
  const NODE_HEIGHT = 240
  const MIN_HORIZONTAL_SPACING = 280
  const VERTICAL_SPACING = 320

  const memberMap = new Map<string, Member>()
  const registerMembers = (member: Member) => {
    memberMap.set(member.referralCode, member)
    if (member.leftChild) registerMembers(member.leftChild)
    if (member.rightChild) registerMembers(member.rightChild)
  }
  registerMembers(originalRoot)

  // Calculate the width of a subtree
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

  // Position nodes with proper spacing based on subtree widths
  const calculatePositions = (
    member: Member,
    x: number,
    y: number,
    map: Map<string, NodePosition> = new Map()
  ) => {
    map.set(member.id, { x, y })

    if (!member.leftChild && !member.rightChild) {
      return map
    }

    const leftWidth = getSubtreeWidth(member.leftChild)
    const rightWidth = getSubtreeWidth(member.rightChild)

    if (member.leftChild && member.rightChild) {
      // Both children exist - position them symmetrically
      const leftX = x - (rightWidth + MIN_HORIZONTAL_SPACING) / 2
      const rightX = x + (leftWidth + MIN_HORIZONTAL_SPACING) / 2

      calculatePositions(member.leftChild, leftX, y + VERTICAL_SPACING, map)
      calculatePositions(member.rightChild, rightX, y + VERTICAL_SPACING, map)
    } else if (member.leftChild) {
      // Only left child
      const leftX = x - MIN_HORIZONTAL_SPACING / 2
      calculatePositions(member.leftChild, leftX, y + VERTICAL_SPACING, map)
    } else if (member.rightChild) {
      // Only right child
      const rightX = x + MIN_HORIZONTAL_SPACING / 2
      calculatePositions(member.rightChild, rightX, y + VERTICAL_SPACING, map)
    }

    return map
  }

  const positions = calculatePositions(treeRoot, 0, 0)

  const attachMember = (parent: Member, leg: 'left' | 'right', member: Member) => {
    if (leg === 'left' && parent.leftChild) return
    if (leg === 'right' && parent.rightChild) return
    leg === 'left' ? (parent.leftChild = member) : (parent.rightChild = member)
    memberMap.set(member.referralCode, member)
    setTreeRoot({ ...originalRoot })
    setModal(null)
    setNewPin('')
    setSelectedFromPool(null)
    setPinError('')
  }

  const handlePinChange = (pin: string) => {
    setNewPin(pin)
    setPinError('')
    setSelectedFromPool(null)

    if (!pin) return

    // Check if PIN matches any sample pool member
    const poolMember = samplePool.find((m) => m.referralCode === pin)
    if (poolMember) {
      setSelectedFromPool(poolMember)
    }
  }

  const addNewMember = () => {
    if (!newPin) {
      setPinError('PIN is required')
      return
    }

    if (memberMap.has(newPin)) {
      setPinError('This PIN is already registered')
      return
    }

    let memberToAdd: Member

    if (selectedFromPool) {
      // Use the selected pool member data
      memberToAdd = { ...selectedFromPool }
    } else {
      // Create new member with PIN
      memberToAdd = {
        id: Date.now().toString(),
        username: `USER-${newPin}`,
        email: `${newPin}@company.com`,
        profileImage: logo,
        referralCode: newPin,
        leftLegPoints: 0,
        rightLegPoints: 0,
      }
    }

    attachMember(modal!.parent, modal!.leg, memberToAdd)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    if (!value) return setSearchResults([])
    const res: Member[] = []
    memberMap.forEach((m) => {
      if (
        m.username.toLowerCase().includes(value.toLowerCase()) ||
        m.email.toLowerCase().includes(value.toLowerCase()) ||
        m.referralCode.toLowerCase().includes(value.toLowerCase())
      ) {
        res.push(m)
      }
    })
    setSearchResults(res)
  }

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModal(null)
      }
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', (e) => e.key === 'Escape' && setModal(null))
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', (e) => e.key === 'Escape' && setModal(null))
    }
  }, [])

  const renderTree = (member: Member): React.ReactNode[] => {
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
          />
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
          />
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
          stroke={
            selectedMember?.id === member.id ? '#7c3aed' : '#e5e7eb'
          }
          strokeWidth="2"
        />

        {/* Profile background */}
        <circle
          cx={pos.x + NODE_WIDTH / 2}
          cy={pos.y + 55}
          r="32"
          fill="#f3f4f6"
          stroke="#d1d5db"
        />

        {/* Profile Image */}
        <image
          href={member.profileImage}
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
          Points ( L {member.leftLegPoints} • R {member.rightLegPoints} )
        </text>

        {/* Bonus Indicators */}
        <g>
          <circle cx={pos.x + 15} cy={pos.y + 15} r="4" fill="#10b981" />
          <circle cx={pos.x + NODE_WIDTH - 15} cy={pos.y + 15} r="4" fill="#f59e0b" />
        </g>

        {/* LEFT BUTTON */}
        {!member.leftChild && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              setModal({ parent: member, leg: 'left' })
              setNewPin('')
              setSelectedFromPool(null)
              setPinError('')
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

        {/* RIGHT BUTTON */}
        {!member.rightChild && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              setModal({ parent: member, leg: 'right' })
              setNewPin('')
              setSelectedFromPool(null)
              setPinError('')
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
      </g>
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

  return (
    <div
      className="w-full h-screen overflow-hidden bg-white relative flex"
      style={{ userSelect: 'none' }}
    >
      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {/* SEARCH BAR - FIXED */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-96">
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search member..."
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white shadow-lg focus:outline-none focus:border-indigo-500 transition"
        />
        {searchResults.length > 0 && (
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

      {/* MODAL */}
      {modal && (
        <div
          className="fixed inset-0 bg-white/60 backdrop-blur-md z-40 flex items-center justify-center"
          onClick={() => {
            setModal(null)
            setNewPin('')
            setSelectedFromPool(null)
            setPinError('')
          }}
          ref={dropdownRef}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl mb-6 text-center">
              Add {modal.leg === 'left' ? 'Left' : 'Right'} Member
            </h2>

            {/* PIN Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Member PIN
              </label>
              <input
                value={newPin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="e.g., PIN-1001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && addNewMember()}
              />
              {pinError && <p className="text-red-500 text-sm mt-1">{pinError}</p>}
            </div>

            {/* Member Card Preview - appears when PIN matches */}
            {selectedFromPool && (
              <div className="mb-6 p-6 bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-indigo-300 shadow-lg">
                <div className="flex flex-col items-center">
                  <div className="mb-4">
                    <img
                      src={selectedFromPool.profileImage}
                      alt={selectedFromPool.username}
                      className="w-24 h-24 rounded-full border-4 border-indigo-400 object-cover shadow-md"
                    />
                  </div>
                  <h3 className="font-bold text-xl text-indigo-900 mb-1">
                    {selectedFromPool.username}
                  </h3>
                  <p className="text-sm text-gray-700 font-medium mb-3">{selectedFromPool.email}</p>
                  <div className="bg-white rounded-lg px-4 py-2 border border-indigo-200">
                    <p className="text-xs text-indigo-700 font-semibold">
                      PIN: {selectedFromPool.referralCode}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sample Members List */}
            {!newPin && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Members</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {samplePool.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handlePinChange(member.referralCode)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-sky-500 hover:bg-sky-50 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.profileImage}
                          alt={member.username}
                          className="w-12 h-12 rounded-full border-2 border-gray-300 object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{member.username}</p>
                          <p className="text-xs text-gray-600">{member.email}</p>
                          <p className="text-xs text-indigo-600 font-medium">PIN: {member.referralCode}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={addNewMember}
              className="w-full bg-sky-500 hover:bg-sky-700 text-white font-semibold py-3 rounded-lg transition"
            >
              {selectedFromPool ? 'Add This Member' : 'Create New Member'}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                setModal(null)
                setNewPin('')
                setSelectedFromPool(null)
                setPinError('')
              }}
              className="w-full mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

        <svg
          ref={svgRef}
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

      {/* MEMBER DETAILS SIDEBAR COMPONENT - RIGHT SIDE */}
      <MemberDetailsPanel 
        selectedMember={selectedMember} 
        onClose={() => setSelectedMember(null)} 
      />
    </div>
  )
}

export default Genealogy