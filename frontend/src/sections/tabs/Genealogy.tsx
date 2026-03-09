import React, { useState, useRef, useEffect } from 'react'
import MemberDetailsPanel from './MembersDetailPanel'
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
  age?: number
  contact?: string
  address?: string
  beneficiary?: string
  birthday?: string
  password?: string
}

interface GenealogyProps {
  currentUser: Member
}

interface NodePosition {
  x: number
  y: number
}

function Genealogy({ currentUser }: GenealogyProps) {

  const svgRef = useRef<SVGSVGElement>(null)

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

  useEffect(() => {
    if (currentUser) {
      setOriginalRoot(currentUser)
      setTreeRoot(currentUser)
    }
  }, [currentUser])

  const memberMap = new Map<string, Member>()

  const registerMembers = (member?: Member) => {
    if (!member) return
    memberMap.set(member.referralCode, member)
    registerMembers(member.leftChild)
    registerMembers(member.rightChild)
  }

  if (originalRoot) registerMembers(originalRoot)

  const getSubtreeWidth = (member?: Member): number => {
    if (!member) return NODE_WIDTH

    const leftWidth = getSubtreeWidth(member.leftChild)
    const rightWidth = getSubtreeWidth(member.rightChild)

    if (!member.leftChild && !member.rightChild) return NODE_WIDTH

    if (member.leftChild && member.rightChild) {
      return leftWidth + rightWidth + MIN_HORIZONTAL_SPACING
    }

    return Math.max(leftWidth, rightWidth) + MIN_HORIZONTAL_SPACING / 2
  }

  const calculatePositions = (
    member: Member,
    x: number,
    y: number,
    map: Map<string, NodePosition> = new Map()
  ) => {

    map.set(member.id, { x, y })

    const leftWidth = getSubtreeWidth(member.leftChild)
    const rightWidth = getSubtreeWidth(member.rightChild)

    if (member.leftChild && member.rightChild) {

      const leftX = x - (rightWidth + MIN_HORIZONTAL_SPACING) / 2
      const rightX = x + (leftWidth + MIN_HORIZONTAL_SPACING) / 2

      calculatePositions(member.leftChild, leftX, y + VERTICAL_SPACING, map)
      calculatePositions(member.rightChild, rightX, y + VERTICAL_SPACING, map)

    } else if (member.leftChild) {

      calculatePositions(
        member.leftChild,
        x - MIN_HORIZONTAL_SPACING / 2,
        y + VERTICAL_SPACING,
        map
      )

    } else if (member.rightChild) {

      calculatePositions(
        member.rightChild,
        x + MIN_HORIZONTAL_SPACING / 2,
        y + VERTICAL_SPACING,
        map
      )
    }

    return map
  }

  const positions = treeRoot
    ? calculatePositions(treeRoot, 0, 0)
    : new Map()

  const attachMember = (parent: Member, leg: 'left' | 'right', member: Member) => {

    if (leg === 'left' && parent.leftChild) return
    if (leg === 'right' && parent.rightChild) return

    leg === 'left'
      ? (parent.leftChild = member)
      : (parent.rightChild = member)

    setTreeRoot({ ...originalRoot! })
    setModal(null)
  }

  const addNewMember = () => {

    if (!formData.name || !formData.email || !formData.pin) {
      setFormError('Name, Email, and PIN are required')
      return
    }

    const memberToAdd: Member = {
      id: Date.now().toString(),
      username: formData.name,
      email: formData.email,
      profileImage: currentUser.profileImage,
      referralCode: formData.pin,
      leftLegPoints: 0,
      rightLegPoints: 0,
    }

    attachMember(modal!.parent, modal!.leg, memberToAdd)
  }

  const handleSearch = (value: string) => {

    setSearch(value)

    if (!value) {
      setSearchResults([])
      return
    }

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

  const renderTree = (member: Member): React.ReactNode[] => {

    const pos = positions.get(member.id)
    if (!pos) return []

    const elements: React.ReactNode[] = []

    if (member.leftChild) {

      const childPos = positions.get(member.leftChild.id)

      if (childPos) {
        elements.push(
          <line
            key={`${member.id}-left`}
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
            key={`${member.id}-right`}
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
        key={member.id}
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
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        <image
          href={member.profileImage}
          x={pos.x + NODE_WIDTH / 2 - 30}
          y={pos.y + 25}
          width="60"
          height="60"
        />

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 125}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
        >
          {member.username}
        </text>

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 145}
          textAnchor="middle"
          fontSize="12"
        >
          {member.email}
        </text>

      </g>
    )

    return elements
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {

    if (!dragging) return

    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => setDragging(false)

  const handleWheel = (e: React.WheelEvent) => {

    e.preventDefault()

    const newZoom = Math.min(
      Math.max(zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.3),
      3
    )

    setZoom(newZoom)
  }

  return (
    <div className="w-full h-screen flex bg-white">

      <div className="flex-1 relative overflow-hidden">

        {/* SEARCH */}

        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-96">

          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search member..."
            className="w-full px-4 py-2 border rounded-lg"
          />

          {searchResults.length > 0 && (

            <div className="bg-white shadow rounded mt-2">

              {searchResults.map((m) => (

                <div
                  key={m.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setTreeRoot(m)
                    setSearch('')
                    setSearchResults([])
                  }}
                >
                  {m.username}
                </div>

              ))}

            </div>

          )}

        </div>

        <AddMemberModal
          modal={modal}
          formData={formData}
          formError={formError}
          onFormChange={(e: any) =>
            setFormData({
              ...formData,
              [e.target.name]: e.target.value
            })
          }
          onAddMember={addNewMember}
          onClose={() => setModal(null)}
        />

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

            {treeRoot && renderTree(treeRoot)}

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