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

function ReferalsHierarchy() {
  const [directReferrals, setDirectReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token, userId } = getAuthContext();
    if (!token || !userId) return;

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    fetch(`${API_BASE_URL}/genealogy/referrals/${userId}`, { headers })
      .then(r => r.json())
      .then((data) => {
        setDirectReferrals(data.direct ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getInitials = (username: string) => {
    return username?.slice(0, 2).toUpperCase() ?? '??';
  };

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

  const stats = [
    { label: 'Total Referrals', value: directReferrals.length },
    { label: 'This Month',      value: directReferrals.filter(r => (r.createdAt ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7)).length },
    { label: 'Active',          value: directReferrals.filter(r => r.status === 'active').length },
    { label: 'Pending',         value: directReferrals.filter(r => r.status === 'pending').length },
  ];

  const EmptyState = () => (
    <div className="flex flex-col items-center gap-2 py-16">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-lg">✦</div>
      <p className="text-slate-400 text-sm">No direct referrals yet</p>
      <p className="text-slate-300 text-xs">Share your referral link to get started</p>
    </div>
  );

  const Avatar = ({ referral }: { referral: any }) => (
    referral.profileImage
      ? <img src={referral.profileImage || defaultLogo} alt={referral.username}
             className="w-9 h-9 rounded-full object-cover border border-slate-100 shrink-0" />
      : <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
          {getInitials(referral.username)}
        </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Referral Hierarchy</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and track your direct referrals</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-3 sm:py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Direct Referrals</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Level 1 — {directReferrals.length} member{directReferrals.length !== 1 ? 's' : ''}
              </p>
            </div>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {directReferrals.length} total
            </span>
          </div>

          {/* ── Mobile card list (< sm) ── */}
          <div className="sm:hidden">
            {directReferrals.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-slate-50">
                {directReferrals.map((referral: any) => (
                  <li key={referral.id} className="px-4 py-4 flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar referral={referral} />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-slate-900 text-sm truncate">{referral.username}</span>
                        {referral.membershipTier
                          ? <TierBadge tier={referral.membershipTier} />
                          : <span className="text-slate-300 text-xs">—</span>
                        }
                      </div>
                      <p className="text-xs text-slate-500 truncate mb-1">{referral.email}</p>
                      <p className="text-xs text-slate-400">{formatDate(referral.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Desktop table (≥ sm) ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Member</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Tier</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {directReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  directReferrals.map((referral: any) => (
                    <tr key={referral.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar referral={referral} />
                          <span className="font-medium text-slate-900">{referral.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{referral.email}</td>
                      <td className="px-6 py-4">
                        {referral.membershipTier
                          ? <TierBadge tier={referral.membershipTier} />
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(referral.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
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
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  };

  const cls = styles[t] ?? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label[t] ?? tier}
    </span>
  );
}

export default ReferalsHierarchy;