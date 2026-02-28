import React, { useState, useRef, useEffect } from 'react'
import logo from './../../assets/refs/Logo.webp'
import MemberDetailsPanel from './membersDetailPanel'
import AddMemberModal from './AddMemberModal'

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
  age?: number
  contact?: string
  address?: string
  beneficiary?: string
  birthday?: string
  password?: string
}

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

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    contact: '',
    address: '',
    email: '',
    beneficiary: '',
    birthday: '',
    password: '',
    pin: '',
  })
  const [formError, setFormError] = useState('')

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

  const positions = calculatePositions(treeRoot, 0, 0)

  const attachMember = (parent: Member, leg: 'left' | 'right', member: Member) => {
    if (leg === 'left' && parent.leftChild) return
    if (leg === 'right' && parent.rightChild) return
    leg === 'left' ? (parent.leftChild = member) : (parent.rightChild = member)
    memberMap.set(member.referralCode, member)
    setTreeRoot({ ...originalRoot })
    setModal(null)
    setFormData({
      name: '',
      age: '',
      contact: '',
      address: '',
      email: '',
      beneficiary: '',
      birthday: '',
      password: '',
      pin: '',
    })
    setFormError('')
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setFormError('')
  }

  const addNewMember = () => {
    if (!formData.name || !formData.email || !formData.pin) {
      setFormError('Name, Email, and PIN are required')
      return
    }

    if (memberMap.has(formData.pin)) {
      setFormError('This PIN is already registered')
      return
    }

    const memberToAdd: Member = {
      id: Date.now().toString(),
      username: formData.name,
      email: formData.email,
      profileImage: logo,
      referralCode: formData.pin,
      leftLegPoints: 0,
      rightLegPoints: 0,
      age: formData.age ? parseInt(formData.age) : undefined,
      contact: formData.contact,
      address: formData.address,
      beneficiary: formData.beneficiary,
      birthday: formData.birthday,
      password: formData.password,
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
        setFormData({
          name: '',
          age: '',
          contact: '',
          address: '',
          email: '',
          beneficiary: '',
          birthday: '',
          password: '',
          pin: '',
        })
        setFormError('')
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModal(null)
        setFormData({
          name: '',
          age: '',
          contact: '',
          address: '',
          email: '',
          beneficiary: '',
          birthday: '',
          password: '',
          pin: '',
        })
        setFormError('')
      }
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', handleEscape)
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
              setFormData({
                name: '',
                age: '',
                contact: '',
                address: '',
                email: '',
                beneficiary: '',
                birthday: '',
                password: '',
                pin: '',
              })
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
              setFormData({
                name: '',
                age: '',
                contact: '',
                address: '',
                email: '',
                beneficiary: '',
                birthday: '',
                password: '',
                pin: '',
              })
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

        {/* MODAL WITH FORM - NOW SEPARATED TO AddMemberModal COMPONENT */}
        <AddMemberModal
          modal={modal}
          formData={formData}
          formError={formError}
          onFormChange={handleFormChange}
          onAddMember={addNewMember}
          onClose={() => {
            setModal(null)
            setFormData({
              name: '',
              age: '',
              contact: '',
              address: '',
              email: '',
              beneficiary: '',
              birthday: '',
              password: '',
              pin: '',
            })
            setFormError('')
          }}
        />

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