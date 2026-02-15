import React, { useState, useRef } from 'react'
import logo from './../../assets/refs/Logo.webp'

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
}

const sampleData: Member = {
  id: '1',
  username: 'FOUNDER',
  email: 'founder@company.com',
  profileImage: logo,
  referralCode: 'REF-FOUNDER',
  leftLegPoints: 0,
  rightLegPoints: 88,
  leftChild: {
    id: '2',
    username: 'COPROFITGLOBALCORP2',
    email: 'member2@company.com',
    profileImage: logo,
    referralCode: 'REF-2',
    leftLegPoints: 349,
    rightLegPoints: 0,
    leftChild: {
      id: '4',
      username: 'COPROFITGLOBALCORP04',
      email: 'member4@company.com',
      profileImage: logo,
      referralCode: 'REF-4',
      leftLegPoints: 0,
      rightLegPoints: 41,
    },
    rightChild: {
      id: '5',
      username: 'COPROFITGLOBALCORP05',
      email: 'member5@company.com',
      profileImage: logo,
      referralCode: 'REF-5',
      leftLegPoints: 0,
      rightLegPoints: 0,
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
    leftChild: {
      id: '6',
      username: 'COPROFITGLOBALCORP06',
      email: 'member6@company.com',
      profileImage: logo,
      referralCode: 'REF-6',
      leftLegPoints: 0,
      rightLegPoints: 0,
    },
    rightChild: {
      id: '7',
      username: 'COPROFITGLOBALCORP07',
      email: 'member7@company.com',
      profileImage: logo,
      referralCode: 'REF-7',
      leftLegPoints: 0,
      rightLegPoints: 379,
    },
  },
}

interface NodePosition {
  x: number
  y: number
}

function Genealogy() {
  const svgRef = useRef<SVGSVGElement>(null)

  const [originalRoot] = useState<Member>(sampleData)
  const [treeRoot, setTreeRoot] = useState<Member>(sampleData)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const NODE_WIDTH = 190
  const NODE_HEIGHT = 240
  const HORIZONTAL_SPACING = 300
  const VERTICAL_SPACING = 320

  const memberMap = new Map<string, Member>()
  const registerMembers = (member: Member) => {
    memberMap.set(member.referralCode, member)
    if (member.leftChild) registerMembers(member.leftChild)
    if (member.rightChild) registerMembers(member.rightChild)
  }
  registerMembers(originalRoot)

  const calculatePositions = (
    member: Member,
    x: number,
    y: number,
    map: Map<string, NodePosition> = new Map()
  ) => {
    map.set(member.id, { x, y })

    if (member.leftChild)
      calculatePositions(
        member.leftChild,
        x - HORIZONTAL_SPACING,
        y + VERTICAL_SPACING,
        map
      )

    if (member.rightChild)
      calculatePositions(
        member.rightChild,
        x + HORIZONTAL_SPACING,
        y + VERTICAL_SPACING,
        map
      )

    return map
  }

  const positions = calculatePositions(treeRoot, 0, 0)

  const addMember = (parent: Member, leg: 'left' | 'right') => {
    const referralCode = prompt('Enter referral code:')
    if (!referralCode) return

    if (memberMap.has(referralCode)) {
      alert('Referral code already exists.')
      return
    }

    const newMember: Member = {
      id: Date.now().toString(),
      username: `USER-${referralCode}`,
      email: `${referralCode}@company.com`,
      profileImage: logo,
      referralCode,
      leftLegPoints: 0,
      rightLegPoints: 0,
    }

    if (leg === 'left') {
      if (parent.leftChild) return
      parent.leftChild = newMember
    } else {
      if (parent.rightChild) return
      parent.rightChild = newMember
    }

    memberMap.set(referralCode, newMember)
    setTreeRoot({ ...originalRoot })
  }

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

        {/* LEFT BUTTON */}
        {!member.leftChild && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              addMember(member, 'left')
            }}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pos.x - 150}
              y={pos.y + NODE_HEIGHT + 10}
              width="150"
              height="28"
              rx="6"
              fill="#10b981"
            />
            <text
              x={pos.x - 75}
              y={pos.y + NODE_HEIGHT + 29}
              textAnchor="middle"
              fontSize="12"
              fill="white"
              fontWeight="600"
            >
              Add Left Member
            </text>
          </g>
        )}

        {/* RIGHT BUTTON */}
        {!member.rightChild && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              addMember(member, 'right')
            }}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pos.x + NODE_WIDTH}
              y={pos.y + NODE_HEIGHT + 10}
              width="160"
              height="28"
              rx="6"
              fill="#f59e0b"
            />
            <text
              x={pos.x + NODE_WIDTH + 80}
              y={pos.y + NODE_HEIGHT + 29}
              textAnchor="middle"
              fontSize="12"
              fill="white"
              fontWeight="600"
            >
              Add Right Member
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
      className="w-full h-screen overflow-hidden bg-white"
      style={{ userSelect: 'none' }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="cursor-grab active:cursor-grabbing"
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
  )
}

export default Genealogy