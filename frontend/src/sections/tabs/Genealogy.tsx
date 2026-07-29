import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

// Layout constants
const NODE_WIDTH          = 190
const NODE_HEIGHT         = 230
const VERTICAL_SPACING    = 300
const ACTION_BTN_WIDTH    = 84
const ACTION_BTN_HEIGHT   = 30

// ── Search index ──────────────────────────────────────────────────────────
// Member search used to be a plain array `.filter(...).includes(...)` scan,
// re-run against every member on every search. That's fine at small scale,
// but it means cost grows linearly with the size of the downline network —
// on a large org this is genuinely slow (the "an hour" report), and it's
// the client-side scan, not just the network fetch, that scales badly.
//
// Instead we build a hashmap once per data change (memoized below) rather
// than once per search: every member's username/email/referralCode is
// tokenized, and every prefix of every token is a key pointing at the set of
// member ids that match it. A search is then a single O(1) Map lookup
// instead of an O(n) scan — the tradeoff is that a query now has to match
// the *start* of a token (e.g. "eagle" finds "EagleHunter99"), rather than
// anywhere inside a field.
interface SearchIndex {
  byId: Map<string, Member>
  prefixIndex: Map<string, Set<string>>
}

function buildSearchIndex(memberLists: Member[][]): SearchIndex {
  const byId = new Map<string, Member>()
  const prefixIndex = new Map<string, Set<string>>()

  const addToken = (token: string, id: string) => {
    const t = token.toLowerCase()
    for (let i = 1; i <= t.length; i++) {
      const prefix = t.slice(0, i)
      let bucket = prefixIndex.get(prefix)
      if (!bucket) {
        bucket = new Set<string>()
        prefixIndex.set(prefix, bucket)
      }
      bucket.add(id)
    }
  }

  for (const list of memberLists) {
    for (const m of list) {
      if (byId.has(m.id)) continue
      byId.set(m.id, m)
      for (const field of [m.username, m.email, m.referralCode]) {
        if (!field) continue
        // Split on non-alphanumeric boundaries so e.g. "eagle_hunter99@mail.com"
        // indexes as ["eagle", "hunter99", "mail", "com"].
        for (const token of field.split(/[^a-z0-9]+/i)) {
          if (token) addToken(token, m.id)
        }
      }
    }
  }

  return { byId, prefixIndex }
}

function searchWithIndex(value: string, index: SearchIndex): Member[] {
  const keyword = value.toLowerCase().trim()
  if (!keyword) return []
  const ids = index.prefixIndex.get(keyword)
  if (!ids || ids.size === 0) return []
  const results: Member[] = []
  for (const id of ids) {
    const m = index.byId.get(id)
    if (m) results.push(m)
  }
  return results
}

function computeTreeLayout(
  root: Member | null | undefined,
  maxDepth: number,
): { positions: Map<string, NodePosition>; viewBox: string } {
  const positions = new Map<string, NodePosition>()
  if (!root) return { positions, viewBox: '0 -40 960 560' }

  const leafSlotW  = maxDepth <= 2 ? 320 : 170
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

  let minX = Infinity, maxX = -Infinity
  for (const p of positions.values()) {
    if (p.x < minX) minX = p.x
    if (p.x + NODE_WIDTH > maxX) maxX = p.x + NODE_WIDTH
  }
  const PAD     = 36
  const vbX     = minX - PAD
  const vbW     = maxX - minX + PAD * 2
  const vbH     = maxDepth * VERTICAL_SPACING + NODE_HEIGHT + 90
  const viewBox = `${vbX} -40 ${vbW} ${vbH}`

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
  const [allDownlines, setAllDownlines] = useState<Member[]>([])
  const downlinesLoadedRef = useRef(false)
  const [navigationHistory, setNavigationHistory] = useState<Member[]>([])
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  const [chooserModal, setChooserModal] = useState<{ parent: Member; leg: 'left' | 'right' } | null>(null)
  const [modal, setModal] = useState<{ parent: Member; leg: 'left' | 'right' } | null>(null)
  const [existingModal, setExistingModal] = useState<{ parent: Member; leg: 'left' | 'right' } | null>(null)

  const [formData, setFormData] = useState<AddMemberFormData>(EMPTY_ADD_MEMBER_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null)
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null)

  // Scroll container ref — used to auto-center the tree horizontally on load
  const scrollRef = useRef<HTMLDivElement>(null)

  // On narrow screens the tree is scaled down to fit the viewport width so it
  // renders fully "zoomed out" by default (no forced horizontal scroll, and
  // pinch-zoom can then zoom IN from that fit state instead of being stuck
  // beyond it with no way back). Desktop keeps the natural pixel size +
  // horizontal scroll behavior since there's usually room to spare.
  const [containerWidth, setContainerWidth] = useState(0)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  )

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const handleChange = () => setIsMobile(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  // Callback ref, NOT a useEffect(..., []) — the scrollable container only
  // exists in the post-loading render tree (the loading state renders
  // GenealogySkeletonLoader instead, which has no such element). A
  // mount-once effect would see scrollRef.current as null while loading and
  // never fire again once the real container mounts, permanently stranding
  // containerWidth at 0 and fitScale at 1 (unscaled) — which is exactly why
  // the mobile fit-to-width never actually took effect. A callback ref fires
  // every time the node itself is attached/detached, surviving that
  // loading → loaded swap.
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const attachScrollRef = useCallback((el: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    scrollRef.current = el
    if (!el) return
    setContainerWidth(el.clientWidth)
    const observer = new ResizeObserver(() => setContainerWidth(el.clientWidth))
    observer.observe(el)
    resizeObserverRef.current = observer
  }, [])

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

  // Dedupes concurrent callers (e.g. a background refresh firing while a
  // search is also waiting on the same fetch) so they all await one request
  // instead of racing separate ones.
  const downlinesInFlightRef = useRef<Promise<Member[]> | null>(null)

  const fetchAllDownlinesOnce = useCallback(async (userId: string, retry = true): Promise<Member[]> => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/genealogy/downlines/${userId}`)
      if (!response.ok) throw new Error('downlines fetch failed')
      const data = await response.json()
      if (Array.isArray(data)) {
        setAllDownlines(data)
        downlinesLoadedRef.current = true
        return data
      }
      return []
    } catch {
      if (retry) {
        // One retry after a short delay — a single flaky request shouldn't
        // permanently cripple search for the rest of the session.
        await new Promise((resolve) => setTimeout(resolve, 1500))
        return fetchAllDownlinesOnce(userId, false)
      }
      return []
    }
  }, [])

  const fetchAllDownlines = useCallback((userId: string): Promise<Member[]> => {
    if (!downlinesInFlightRef.current) {
      downlinesInFlightRef.current = fetchAllDownlinesOnce(userId).finally(() => {
        downlinesInFlightRef.current = null
      })
    }
    return downlinesInFlightRef.current
  }, [fetchAllDownlinesOnce])

  const treeRootRef = React.useRef<Member | null>(null)
  treeRootRef.current = treeRoot

  // Cache of previously-fetched subtrees, keyed by member id/userId — lets a
  // revisited node render instantly instead of re-hitting the network.
  const treeCacheRef = useRef<Map<string, Member>>(new Map())
  // Aborts a stale in-flight navigation fetch so an old response can never
  // clobber a newer one when the user clicks around quickly.
  const navigateAbortRef = useRef<AbortController | null>(null)

  const navigateTo = useCallback((member: Member) => {
    const targetId = member.userId || member.id

    // Cancel whatever navigation fetch was previously in flight — its
    // response no longer matters and shouldn't be allowed to land late.
    if (navigateAbortRef.current) navigateAbortRef.current.abort()

    const prev = treeRootRef.current
    if (prev) setNavigationHistory(h => [...h, prev])
    setCurrentDepth(2)

    // Instant path: we already have this node's own data (from the tree the
    // user was just looking at, or the cache), so show it immediately —
    // no spinner, no wait. `member` already carries its own children/flags,
    // and a cache hit carries the full authoritative subtree.
    const cached = treeCacheRef.current.get(targetId)
    setTreeRoot(cached || member)
    if (cached) {
      setNavigatingId(null)
      navigateAbortRef.current = null
      return
    }

    // Background refresh: fills in anything the optimistic view was missing
    // (e.g. grandchildren) without blocking the UI that's already showing.
    const controller = new AbortController()
    navigateAbortRef.current = controller
    setNavigatingId(member.id)
    ;(async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/genealogy/root/${targetId}?depth=2`, { signal: controller.signal })
        const data = await response.json()
        if (controller.signal.aborted) return
        if (response.ok) {
          treeCacheRef.current.set(targetId, data)
          setTreeRoot(data)
        }
      } catch {
        // stale/aborted or network error — keep the optimistic view
      } finally {
        if (navigateAbortRef.current === controller) {
          setNavigatingId(null)
          navigateAbortRef.current = null
        }
      }
    })()
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
        treeCacheRef.current.set(userId, treeData)
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
      treeCacheRef.current.clear()
      fetchRootTree(currentUserId)
        .then((treeData) => {
          setOriginalRoot(treeData)
          setTreeRoot(treeData)
          treeCacheRef.current.set(currentUserId, treeData)
        })
        .catch(() => {})
      // Only refresh the full downline list if it was already lazily loaded
      // (i.e. the user has searched before) — otherwise stay lazy and don't
      // fetch it just because something changed elsewhere.
      if (downlinesLoadedRef.current) fetchAllDownlines(currentUserId)
    }
    window.addEventListener('genealogy:refresh', handleRefresh)
    window.addEventListener('cycle:changed', handleRefresh)
    return () => {
      window.removeEventListener('genealogy:refresh', handleRefresh)
      window.removeEventListener('cycle:changed', handleRefresh)
    }
  }, [currentUserId, fetchRootTree, fetchAllDownlines])

  // Note: subtrees for nodes the user hasn't clicked into are intentionally
  // NOT pre-fetched — only the currently visible depth-2 tree loads. Clicking
  // a node fetches its own subtree on demand (see navigateTo), and the cache
  // there still makes a *revisited* node instant without ever loading data
  // for nodes that are still off-screen.

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

  // Pixel dimensions of the SVG — 1 SVG user unit = 1 CSS pixel
  const { svgWidth, svgHeight } = useMemo(() => {
    const parts = viewBox.split(' ').map(Number)
    return { svgWidth: Math.ceil(parts[2]), svgHeight: Math.ceil(parts[3]) }
  }, [viewBox])

  // Scale-to-fit on mobile so the tree's default view occupies the full
  // screen width instead of overflowing and forcing a fixed, oversized
  // render that only pinch-zoom-in (never back out) could escape.
  const fitScale = isMobile && containerWidth > 0 ? Math.min(1, containerWidth / svgWidth) : 1
  const renderWidth = Math.round(svgWidth * fitScale)
  const renderHeight = Math.round(svgHeight * fitScale)

  // Auto-center the tree horizontally whenever the tree or its width changes
  // (only relevant when the render isn't already scaled to fit the container)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !svgWidth || fitScale < 1) return
    const target = Math.max(0, (svgWidth - el.clientWidth) / 2)
    el.scrollLeft = target
  }, [svgWidth, treeRoot, fitScale])

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
      if (data.username.trim())    payload.username    = data.username.trim()
      if (data.age)                payload.age         = Number(data.age)
      if (data.contact.trim())     payload.contact     = data.contact.trim()
      if (data.address.trim())     payload.address     = data.address.trim()
      if (data.beneficiary.trim()) payload.beneficiary = data.beneficiary.trim()
      if (data.birthday)           payload.birthday    = data.birthday
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
      treeCacheRef.current.clear()
      treeCacheRef.current.set(currentUserId, refreshedTree)
      if (downlinesLoadedRef.current) fetchAllDownlines(currentUserId)
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
      treeCacheRef.current.clear()
      treeCacheRef.current.set(currentUserId, refreshedTree)
      if (downlinesLoadedRef.current) fetchAllDownlines(currentUserId)
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
    if (navigateAbortRef.current) navigateAbortRef.current.abort()
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchRequestIdRef.current += 1
    setNavigatingId(null)
    setTreeRoot(originalRoot)
    setCurrentDepth(2)
    setSearch('')
    setSearchResults([])
    setSearchLoading(false)
    setNavigationHistory([])
  }, [originalRoot])

  const handleBack = useCallback(() => {
    if (navigateAbortRef.current) navigateAbortRef.current.abort()
    setNavigatingId(null)
    setNavigationHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setTreeRoot(prev)
      setCurrentDepth(2)
      return h.slice(0, -1)
    })
  }, [])

  // Built once whenever the underlying member data changes (initial load,
  // downlines fetched, a member added, a tree refresh) — NOT on every
  // keystroke or every search. Every search after the first one that
  // triggers a fetch reuses this for an O(1) lookup.
  const searchIndex = useMemo(
    () => buildSearchIndex([allDownlines, allMembers]),
    [allDownlines, allMembers],
  )

  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guards against a stale, slower search resolving after a newer one and
  // clobbering its results.
  const searchRequestIdRef = useRef(0)

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchRequestIdRef.current += 1
    if (!value.trim()) {
      setSearchLoading(false)
      setSearchResults([])
      return
    }
    // Show the loader immediately; results only render once we're done
    // typing AND have the full (possibly not-yet-fetched) downline network.
    setSearchLoading(true)
    const requestId = searchRequestIdRef.current
    searchDebounceRef.current = setTimeout(async () => {
      // Load the full downline network on first use only — no need to pull
      // down (potentially thousands of) records before the user ever
      // searches. Subsequent searches reuse whatever's already in state,
      // and therefore reuse the memoized `searchIndex` above too.
      let index = searchIndex
      if (!downlinesLoadedRef.current && currentUserId) {
        const fetched = await fetchAllDownlines(currentUserId)
        if (requestId !== searchRequestIdRef.current) return // superseded by a newer keystroke
        // One-time build from the data we just fetched — `searchIndex`
        // itself will pick this up via useMemo on the next render, so this
        // manual build only ever happens for this first search.
        index = buildSearchIndex([fetched, allMembers])
      }

      if (requestId !== searchRequestIdRef.current) return

      setSearchResults(searchWithIndex(value, index))
      setSearchLoading(false)
    }, 300)
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
          rx="10"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="1.5"
        />

        <circle
          cx={pos.x + NODE_WIDTH / 2}
          cy={pos.y + 50}
          r="32"
          fill="#f3f4f6"
          stroke="#d1d5db"
        />

        <image
          href={member.profileImage || logo}
          x={pos.x + NODE_WIDTH / 2 - 30}
          y={pos.y + 20}
          width="60"
          height="60"
          preserveAspectRatio="xMidYMid slice"
          clipPath="circle(30px at 30px 30px)"
        />

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 108}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#7c3aed"
        >
          {member.username}
        </text>

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 130}
          textAnchor="middle"
          fontSize="11"
          fill="#9ca3af"
        >
          <tspan x={pos.x + NODE_WIDTH / 2} dy="0">
            {member.email.split('@')[0]}
          </tspan>
          <tspan x={pos.x + NODE_WIDTH / 2} dy="16">
            @{member.email.split('@')[1]}
          </tspan>
        </text>

        <text
          x={pos.x + NODE_WIDTH / 2}
          y={pos.y + 202}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="#6b7280"
        >
          Points ( L {member.leftAvailablePoints ?? 0} • R {member.rightAvailablePoints ?? 0} )
        </text>

        <circle cx={pos.x + 12}              cy={pos.y + 12} r="4" fill="#10b981" />
        <circle cx={pos.x + NODE_WIDTH - 12} cy={pos.y + 12} r="4" fill="#f59e0b" />

        {navigatingId === member.id && (
          <g pointerEvents="none">
            <circle
              cx={pos.x + NODE_WIDTH - 14}
              cy={pos.y + NODE_HEIGHT - 14}
              r="10"
              fill="white"
              stroke="#e5e7eb"
            />
            <circle
              cx={pos.x + NODE_WIDTH - 14}
              cy={pos.y + NODE_HEIGHT - 14}
              r="7"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="28 16"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${pos.x + NODE_WIDTH - 14} ${pos.y + NODE_HEIGHT - 14}`}
                to={`360 ${pos.x + NODE_WIDTH - 14} ${pos.y + NODE_HEIGHT - 14}`}
                dur="0.7s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {level < 2 && !member.leftChild && !member.hasLeftChild && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              setChooserModal({ parent: member, leg: 'left' })
            }}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH - 4}
              y={pos.y + NODE_HEIGHT + 8}
              width={ACTION_BTN_WIDTH}
              height={ACTION_BTN_HEIGHT}
              rx="6"
              fill="#10b981"
            />
            <text
              x={pos.x + NODE_WIDTH / 2 - ACTION_BTN_WIDTH / 2 - 4}
              y={pos.y + NODE_HEIGHT + 27}
              textAnchor="middle"
              fontSize="12"
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
              x={pos.x + NODE_WIDTH / 2 + 4}
              y={pos.y + NODE_HEIGHT + 8}
              width={ACTION_BTN_WIDTH}
              height={ACTION_BTN_HEIGHT}
              rx="6"
              fill="#f59e0b"
            />
            <text
              x={pos.x + NODE_WIDTH / 2 + ACTION_BTN_WIDTH / 2 + 4}
              y={pos.y + NODE_HEIGHT + 27}
              textAnchor="middle"
              fontSize="12"
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
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">

      {/* ── Search bar — pinned above the scroll area, never scrolls away ── */}
      <div className="shrink-0 bg-white px-3 pt-3 pb-2 z-20" style={{ userSelect: 'none' }}>
        <div className="flex gap-1.5 max-w-sm">
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search member..."
            className="flex-1 min-w-0 px-3 py-2 border-2 border-gray-300 rounded-lg bg-white shadow focus:outline-none focus:border-indigo-500 transition text-sm"
          />
          {navigationHistory.length > 0 && (
            <button
              onClick={handleBack}
              title="Go back"
              className="shrink-0 px-2.5 py-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white font-semibold rounded-lg shadow transition flex items-center gap-1 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <button
            onClick={handleReset}
            title="Reset to root"
            className="shrink-0 px-2.5 py-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-lg shadow transition flex items-center gap-1 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {search.trim() && searchLoading && (
          <div className="bg-white shadow-lg rounded-lg mt-2 border border-gray-200 max-w-sm">
            <div className="px-3 py-3 flex items-center gap-2 text-sm text-gray-500">
              <svg
                className="w-4 h-4 animate-spin text-indigo-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Searching all members…
            </div>
          </div>
        )}

        {!searchLoading && searchResults.length > 0 && (
          <div className="bg-white shadow-lg rounded-lg mt-2 max-h-56 overflow-auto border border-gray-200 max-w-sm">
            {searchResults.slice(0, 30).map((m) => (
              <div
                key={m.id}
                className="px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                onClick={() => { setSearch(''); setSearchResults([]); navigateTo(m) }}
              >
                <p className="font-semibold text-gray-800 text-sm">{m.username}</p>
              </div>
            ))}
            {searchResults.length > 30 && (
              <p className="px-3 py-2 text-xs text-gray-400">
                +{searchResults.length - 30} more — refine your search
              </p>
            )}
          </div>
        )}

        {!searchLoading && search.trim() && searchResults.length === 0 && (
          <div className="bg-white shadow-lg rounded-lg mt-2 border border-gray-200 max-w-sm">
            <p className="px-3 py-3 text-sm text-gray-400">No members found</p>
          </div>
        )}
      </div>

      {/* ── Tree scroll area — scrolls both axes; SVG renders at its natural pixel size ── */}
      <div
        ref={attachScrollRef}
        className="flex-1 overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/*
          minWidth forces the block to expand to the SVG's actual width so the
          overflow-auto parent can scroll horizontally. Without this the flexbox
          parent would constrain the SVG and it would appear scaled-down on narrow screens.
        */}
        <div style={{ minWidth: renderWidth, paddingBottom: 24 }}>
          <svg
            width={renderWidth}
            height={renderHeight}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMin meet"
            className="block"
          >
            {renderTree(displayRoot)}
          </svg>
        </div>
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