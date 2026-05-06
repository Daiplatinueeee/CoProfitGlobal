import React, { useState } from 'react'
import { apiFetch } from '../../lib/apiFetch'
import { X, Search, AlertCircle, ShieldAlert, UserCheck, Loader2 } from 'lucide-react'

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

export interface ExistingMemberResult {
  id: string
  userId?: string
  username: string
  email: string
  referralCode: string
  profileImage?: string
  membershipTier?: string | null
}

interface ExistingMemberModalProps {
  modal: { parent: Member; leg: 'left' | 'right' } | null
  onPlace: (member: ExistingMemberResult) => void
  onClose: () => void
  apiBaseUrl?: string
}

// ── Tier badge colours ────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  BRONZE:   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  SILVER:   { bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
  GOLD:     { bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-500' },
  PLATINUM: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
}

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null
  const key = tier.toUpperCase()
  const style = TIER_STYLES[key]
  if (!style)
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
        {tier}
      </span>
    )
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ExistingMemberModal({
  modal,
  onPlace,
  onClose,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL,
}: ExistingMemberModalProps) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<ExistingMemberResult[]>([])
  const [searching,   setSearching]   = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected,    setSelected]    = useState<ExistingMemberResult | null>(null)
  const [placing,     setPlacing]     = useState(false)
  const [placeError,  setPlaceError]  = useState<string | null>(null)

  if (!modal) return null

  const isLeftLeg = modal.leg === 'left'
  const legColor = isLeftLeg ? '#10b981' : '#f59e0b'
  const legLabel = isLeftLeg ? 'Left' : 'Right'

  // ── Search ──────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setSearching(true)
    setSearchError(null)
    setResults([])
    setSelected(null)
    setPlaceError(null)

    try {
      const params = new URLSearchParams({ q: trimmed })
      const response = await apiFetch(`${apiBaseUrl}/genealogy/search-unplaced?${params}`)
      const data = await response.json()

      if (!response.ok) {
        setSearchError(data.message || 'Search failed. Please try again.')
        return
      }

      const members: ExistingMemberResult[] = Array.isArray(data) ? data : data.members ?? []
      setResults(members)

      if (members.length === 0) {
        setSearchError('No unplaced members found matching your search.')
      }
    } catch {
      setSearchError('Network error. Please check your connection.')
    } finally {
      setSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  // ── Place ───────────────────────────────────────────────────────────────────

  const handlePlace = async () => {
    if (!selected) return
    setPlacing(true)
    setPlaceError(null)
    try {
      onPlace(selected)
    } catch {
      setPlaceError('Failed to place member. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  // ── Reset & close ───────────────────────────────────────────────────────────

  const handleClose = () => {
    setQuery('')
    setResults([])
    setSelected(null)
    setSearchError(null)
    setPlaceError(null)
    onClose()
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    // Mobile: bottom sheet. sm+: centered dialog.
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-gray-100 shrink-0"
          style={{ borderLeftWidth: 4, borderLeftColor: legColor }}
        >
          <div>
            <h2 className="text-lg sm:text-xl text-gray-900">
              Place{' '}
              <span style={{ color: legColor }} className="font-semibold">
                {legLabel}
              </span>{' '}
              — Existing Member
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Under{' '}
              <span className="font-semibold text-gray-700">{modal.parent.username}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 mt-0.5 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin note banner */}
        <div className="mx-5 sm:mx-6 mt-4 sm:mt-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 shrink-0">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Admin use only.</span> This feature is intended for
            members who were already registered by an administrator and are waiting to be placed
            into the network. Their account already exists — you are simply assigning their
            position in the tree.
          </p>
        </div>

        {/* Search bar */}
        <div className="px-5 sm:px-6 mt-4 sm:mt-5 shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search by username, email, or referral code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. john_doe, john@example.com…"
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-3 sm:px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {/* Hide label on very small screens to keep button compact */}
              <span className="hidden xs:inline sm:inline">Search</span>
            </button>
          </div>
        </div>

        {/* Results — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 mt-4 pb-2 min-h-0">
          {searchError && !searching && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {searchError}
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map((m) => {
                const isSelected = selected?.id === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelected(isSelected ? null : m)
                      setPlaceError(null)
                    }}
                    className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {m.profileImage ? (
                        <img
                          src={m.profileImage}
                          alt={m.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-gray-400">
                          {m.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {m.username}
                        </span>
                        <TierBadge tier={m.membershipTier} />
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{m.email}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{m.referralCode}</p>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && <UserCheck className="w-5 h-5 text-blue-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}

          {!searching && results.length === 0 && !searchError && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-400">Search for a member above to get started.</p>
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching…
            </div>
          )}
        </div>

        {/* Place error */}
        {placeError && (
          <div className="mx-5 sm:mx-6 mt-2 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {placeError}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-5 sm:px-6 py-4 sm:py-5 border-t border-gray-100 shrink-0 mt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePlace}
            disabled={!selected || placing}
            className="flex-1 px-4 py-3 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80"
            style={{ backgroundColor: selected && !placing ? legColor : undefined }}
          >
            {placing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Placing…
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Place {legLabel} Member
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}