import { useEffect, useState } from 'react';
import defaultLogo from './../../assets/refs/Logo.webp';

const API_BASE_URL = 'http://localhost:3000';

function getAuthContext() {
  const token = localStorage.getItem('accessToken');
  let userId = localStorage.getItem('userId');
  if (!userId) {
    const str = localStorage.getItem('user');
    if (str) {
      try {
        const obj = JSON.parse(str);
        userId = obj.id ?? obj._id ?? obj.userId;
      } catch {}
    }
  }
  return { token, userId };
}

interface DownlineMember {
  id: string;
  userId?: string;
  username: string;
  email: string;
  profileImage?: string;
  membershipTier?: string | null;
  status?: string;
  createdAt?: string;
  depth: number;
  parentUserId?: string | null;
  position?: 'left' | 'right' | null;
  sponsorId?: string | null;
}

function groupByLevel(members: DownlineMember[], rootUserId: string): Map<number, DownlineMember[]> {
  if (members.length === 0) return new Map();
  const map = new Map<number, DownlineMember[]>();
  const levelOf = new Map<string, number>();

  // BFS: assign level 1 to direct referrals (sponsorId === rootUserId), then traverse
  const queue: Array<{ id: string; level: number }> = [];
  for (const m of members) {
    const id = m.id ?? m.userId ?? '';
    if (m.sponsorId === rootUserId) {
      levelOf.set(id, 1);
      queue.push({ id, level: 1 });
    }
  }

  let qi = 0;
  while (qi < queue.length) {
    const { id: parentId, level } = queue[qi++];
    for (const m of members) {
      const mid = m.id ?? m.userId ?? '';
      if (m.sponsorId === parentId && !levelOf.has(mid)) {
        const childLevel = level + 1;
        levelOf.set(mid, childLevel);
        queue.push({ id: mid, level: childLevel });
      }
    }
  }

  for (const m of members) {
    const id = m.id ?? m.userId ?? '';
    const level = levelOf.get(id) ?? 1;
    if (!map.has(level)) map.set(level, []);
    map.get(level)!.push(m);
  }
  return map;
}

function ReferalsHierarchy() {
  const [members, setMembers] = useState<DownlineMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    const { token, userId } = getAuthContext();
    if (!token || !userId) return;

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    fetch(`${API_BASE_URL}/genealogy/downlines/${userId}`, { headers })
      .then(r => r.json())
      .then((data: DownlineMember[]) => {
        if (!Array.isArray(data)) { setMembers([]); return; }
        // Build a set of IDs within this user's own network (root + all downlines).
        const networkIds = new Set<string>([userId, ...data.map(m => m.id ?? m.userId ?? '')]);
        // Exclude spillover: members whose sponsor is outside this user's network.
        const filtered = data.filter(m => m.sponsorId != null && networkIds.has(m.sponsorId));
        setMembers(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleLevel = (level: number) => {
    setOpenLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getInitials = (username: string) => username?.slice(0, 2).toUpperCase() ?? '??';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading referrals...</p>
        </div>
      </div>
    );
  }

  const { userId: rootUserId } = getAuthContext();
  const levelMap = groupByLevel(members, rootUserId ?? '');
  const levelNumbers = Array.from(levelMap.keys()).sort((a, b) => a - b);

  const directCount   = levelMap.get(1)?.length ?? 0;
  const indirectCount = members.length - directCount;
  const stats = [
    { label: 'Total Network', value: members.length },
    { label: 'Direct',        value: directCount },
    { label: 'Indirect',      value: indirectCount },
  ];

  const EmptyState = () => (
    <div className="flex flex-col items-center gap-2 py-16">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
      <p className="text-slate-400 text-sm">No downlines yet</p>
      <p className="text-slate-300 text-xs">Share your referral link to get started</p>
    </div>
  );

  const Avatar = ({ member }: { member: DownlineMember }) => (
    member.profileImage
      ? <img src={member.profileImage || defaultLogo} alt={member.username}
             className="w-9 h-9 rounded-full object-cover border border-slate-100 shrink-0" />
      : <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
          {getInitials(member.username)}
        </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Referral Hierarchy</h1>
          <p className="text-sm text-slate-400 mt-1">Your full downline network grouped by level</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-3 sm:py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Level Sections */}
        {members.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <EmptyState />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {levelNumbers.map(level => {
              const levelMembers = levelMap.get(level)!;
              const isOpen = openLevels.has(level);

              return (
                <div key={level} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

                  {/* Level header — clickable toggle */}
                  <button
                    onClick={() => toggleLevel(level)}
                    className="w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150"
                  >
                    <div className="text-left">
                      <h2 className="text-base font-semibold text-slate-900">Level {level}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {levelMembers.length} member{levelMembers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                        {levelMembers.length} total
                      </span>
                      <span className={`text-slate-400 text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        ▾
                      </span>
                    </div>
                  </button>

                  {/* Collapsible content */}
                  {isOpen && (
                    <>
                      {/* Mobile card list */}
                      <div className="sm:hidden">
                        <ul className="divide-y divide-slate-50">
                          {levelMembers.map(member => (
                            <li key={member.id ?? member.userId} className="px-4 py-4 flex items-start gap-3">
                              <Avatar member={member} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-medium text-slate-900 text-sm truncate">{member.username}</span>
                                  <RelationBadge direct={level === 1} />
                                </div>
                                <p className="text-xs text-slate-500 truncate mb-1">{member.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {member.membershipTier
                                    ? <TierBadge tier={member.membershipTier} />
                                    : <span className="text-slate-300 text-xs">—</span>
                                  }
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{formatDate(member.createdAt)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Desktop table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Member</th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Email</th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Type</th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Tier</th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date Joined</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {levelMembers.map(member => (
                              <tr key={member.id ?? member.userId} className="hover:bg-slate-50 transition-colors duration-150">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar member={member} />
                                    <span className="font-medium text-slate-900">{member.username}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{member.email}</td>
                                <td className="px-6 py-4"><RelationBadge direct={level === 1} /></td>
                                <td className="px-6 py-4">
                                  {member.membershipTier
                                    ? <TierBadge tier={member.membershipTier} />
                                    : <span className="text-slate-300">—</span>
                                  }
                                </td>
                                <td className="px-6 py-4 text-slate-400">{formatDate(member.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

function RelationBadge({ direct }: { direct: boolean }) {
  return direct
    ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Direct</span>
    : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">Indirect</span>;
}

function TierBadge({ tier }: { tier: string }) {
  const t = tier.toLowerCase();

  const styles: Record<string, string> = {
    bronze:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    silver:   'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    gold:     'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
    platinum: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  };

  const label: Record<string, string> = {
    bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
  };

  const cls = styles[t] ?? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label[t] ?? tier}
    </span>
  );
}

export default ReferalsHierarchy;