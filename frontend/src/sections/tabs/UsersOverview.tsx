import { useState, useEffect } from 'react';
import { Search, Pencil, OctagonMinus } from 'lucide-react';

import CreateUserModal from '../modals/CreateUserModal';

const API_BASE = 'https://coprofitglobal-production.up.railway.app';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  age: number;
  contact: string;
  address: string;
  beneficiary: string;
  bday: string;
  password: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  profilePicture?: string;
  createdAt: string;
  createdTime: string;
  isActive: boolean;
  leftLegPoints: number;
  rightLegPoints: number;
  leftAvailablePoints: number;
  rightAvailablePoints: number;
}

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | null;

/* ── Helpers ──────────────────────────────────────────────────── */
function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm text-slate-900 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 min-h-9 flex items-center">
        {value || <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

const tierConfig: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  bronze:   { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200',  label: 'Bronze'   },
  silver:   { bg: 'bg-slate-50',  text: 'text-slate-600',  ring: 'ring-slate-200',  label: 'Silver'   },
  gold:     { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', label: 'Gold'     },
  platinum: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', label: 'Platinum' },
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

/* ── User Detail Modal ────────────────────────────────────────── */
function UserDetailModal({
  user,
  onClose,
  onToggleStatus,
  onDelete,
  onEditPoints,
}: {
  user: User;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onEditPoints: (user: User) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col">

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center gap-3 sm:gap-4 shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base shrink-0 overflow-hidden ${user.isActive ? 'bg-slate-900' : 'bg-slate-300'}`}>
            {user.profilePicture
              ? <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              : getInitials(user.name)
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-slate-900">{user.username}</h3>

              <button
                onClick={() => onToggleStatus(user.id)}
                title="Click to toggle status"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 transition-colors ${
                  user.isActive
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
                    : 'bg-red-50 text-red-600 ring-red-200 hover:bg-red-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {user.isActive ? 'Active' : 'Inactive'}
              </button>

              {user.tier ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${tierConfig[user.tier].bg} ${tierConfig[user.tier].text} ${tierConfig[user.tier].ring}`}>
                  {tierConfig[user.tier].label}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                  No Tier
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
          </div>

          <div className="text-right hidden sm:block shrink-0">
            <p className="text-xs text-slate-400 mb-0.5">Joined</p>
            <p className="text-sm font-medium text-slate-900">{user.createdAt}</p>
            <p className="text-xs text-slate-400">{user.createdTime}</p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1">

          {/* Personal Info */}
          <div className="px-6 py-5 border-b border-slate-100">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoField label="Full Name"   value={user.name} />
              <InfoField label="Age"         value={user.age?.toString() ?? '—'} />
              <InfoField label="Birthday"    value={user.bday || '—'} />
              <InfoField label="Contact"     value={user.contact || '—'} />
              <InfoField label="Beneficiary" value={user.beneficiary || '—'} />
              <InfoField label="Address"     value={user.address || '—'} />
            </div>
          </div>

          {/* Leg Points */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Available Points</h4>
              <button
                onClick={() => onEditPoints(user)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit Points
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Left Leg</p>
                <p className="text-2xl font-semibold text-slate-900">{user.leftAvailablePoints.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Right Leg</p>
                <p className="text-2xl font-semibold text-slate-900">{user.rightAvailablePoints.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={() => { onDelete(user.id); onClose(); }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
          >
            <OctagonMinus className="w-3.5 h-3.5" />
            Restrict User
          </button>
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── User Card ────────────────────────────────────────────────── */
function UserCard({ user, onClick }: { user: User; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 group ${
        user.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'
      }`}
    >
      {/* Avatar + Identity */}
      <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-base overflow-hidden ${
            user.isActive ? 'bg-slate-900' : 'bg-slate-300'
          }`}>
            {user.profilePicture
              ? <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              : getInitials(user.name)
            }
          </div>
          <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${user.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        </div>

        <h3 className="text-sm font-semibold text-slate-900 leading-tight truncate w-full">@{user.username}</h3>
        <p className="text-xs text-slate-400 mt-0.5 truncate w-full px-1">{user.email}</p>

        <div className="mt-2.5">
          {user.tier ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${tierConfig[user.tier].bg} ${tierConfig[user.tier].text} ${tierConfig[user.tier].ring}`}>
              {tierConfig[user.tier].label}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 ring-1 ring-slate-200">
              No Tier
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 mx-5" />

      {/* Leg Points */}
      <div className="px-4 py-4 grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">L. Leg</p>
          <p className="text-sm font-semibold text-slate-900">{user.leftAvailablePoints.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">R. Leg</p>
          <p className="text-sm font-semibold text-slate-900">{user.rightAvailablePoints.toLocaleString()}</p>
        </div>
      </div>

      {/* Hint */}
      <div className="pb-3 text-center">
        <p className="text-[10px] text-slate-200 group-hover:text-slate-400 transition-colors">
          Click to view details
        </p>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
function UsersOverview() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');
  const [displayCount, setDisplayCount] = useState(12);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '', username: '', email: '', age: '', contact: '',
    address: '', beneficiary: '', bday: '', password: '',
    packagePin: '', sponsorReferralCode: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editPointsUserId, setEditPointsUserId] = useState<string | null>(null);
  const [editPointsForm, setEditPointsForm] = useState({ leftAvailablePoints: '', rightAvailablePoints: '' });
  const [editPointsLoading, setEditPointsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const onCycleChanged = () => fetchUsers();
    window.addEventListener('cycle:changed', onCycleChanged);
    return () => window.removeEventListener('cycle:changed', onCycleChanged);
  }, []);

  // ─── API Helpers ──────────────────────────────────────────────────────────

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') ?? localStorage.getItem('accessToken');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  };

  const formatUserDateTime = (apiUser: any): User => {
    const createdDate = new Date(apiUser.createdAt);
    return {
      id: apiUser.id,
      name: apiUser.name,
      username: apiUser.username,
      email: apiUser.email,
      age: apiUser.age,
      contact: apiUser.contact,
      address: apiUser.address,
      beneficiary: apiUser.beneficiary,
      bday: apiUser.birthday,
      password: '',
      tier: apiUser.membershipTier || null,
      profilePicture: apiUser.profileImage,
      leftLegPoints: apiUser.leftLegPoints ?? 0,
      rightLegPoints: apiUser.rightLegPoints ?? 0,
      leftAvailablePoints: apiUser.leftAvailablePoints ?? 0,
      rightAvailablePoints: apiUser.rightAvailablePoints ?? 0,
      createdAt: createdDate.toISOString().split('T')[0],
      createdTime: createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isActive: apiUser.isActive !== undefined ? apiUser.isActive : true,
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') ?? localStorage.getItem('accessToken');
      if (!token) { setError('Not authenticated. Please log in again.'); return; }
      const response = await fetch(`${API_BASE}/admin/users`, { method: 'GET', headers: getAuthHeaders() });
      if (response.status === 401) { setError('Session expired. Please log in again.'); return; }
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
      const data = await response.json();
      setUsers(Array.isArray(data) ? data.map(formatUserDateTime) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name, username: formData.username || undefined,
          email: formData.email, password: formData.password,
          packagePin: formData.packagePin, role: 'user',
          ...(formData.age ? { age: parseInt(formData.age, 10) } : {}),
          ...(formData.contact ? { contact: formData.contact } : {}),
          ...(formData.address ? { address: formData.address } : {}),
          ...(formData.beneficiary ? { beneficiary: formData.beneficiary } : {}),
          ...(formData.bday ? { birthday: formData.bday } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to create user');
        return;
      }
      setFormData({ name: '', username: '', email: '', age: '', contact: '', address: '', beneficiary: '', bday: '', password: '', packagePin: '', sponsorReferralCode: '' });
      setFormErrors({});
      setShowCreateForm(false);
      setSuccessMessage(`User "${data.user?.name ?? formData.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
    } catch {
      setError('An error occurred. Please try again.');
    }
  };

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/available-points`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const pts = await res.json();
        setSelectedUser((prev) =>
          prev?.id === user.id
            ? { ...prev, leftAvailablePoints: pts.leftAvailablePoints ?? 0, rightAvailablePoints: pts.rightAvailablePoints ?? 0 }
            : prev
        );
      }
    } catch {
      // keep existing values if fetch fails
    }
  };

  const openEditPoints = async (user: User) => {
    setSelectedUser(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/available-points`, {
        headers: getAuthHeaders(),
      });
      const pts = res.ok ? await res.json() : { leftAvailablePoints: 0, rightAvailablePoints: 0 };
      setEditPointsForm({
        leftAvailablePoints: String(pts.leftAvailablePoints ?? 0),
        rightAvailablePoints: String(pts.rightAvailablePoints ?? 0),
      });
    } catch {
      setEditPointsForm({ leftAvailablePoints: '0', rightAvailablePoints: '0' });
    }
    setEditPointsUserId(user.id);
  };

  const handleUpdateLegPoints = async () => {
    if (!editPointsUserId) return;
    setEditPointsLoading(true);
    const parsedPoints = {
      leftAvailablePoints: Number(editPointsForm.leftAvailablePoints) || 0,
      rightAvailablePoints: Number(editPointsForm.rightAvailablePoints) || 0,
    };
    try {
      const response = await fetch(`${API_BASE}/admin/users/${editPointsUserId}/leg-points`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(parsedPoints),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update available points');
      }
      setUsers((prev) => prev.map((u) =>
        u.id === editPointsUserId ? { ...u, ...parsedPoints } : u
      ));
      setEditPointsUserId(null);
      setSuccessMessage('Available points updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      window.dispatchEvent(new CustomEvent('genealogy:refresh'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update available points');
    } finally {
      setEditPointsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newStatus = !user.isActive;
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ isActive: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: newStatus } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => prev ? { ...prev, isActive: newStatus } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.age || parseInt(formData.age, 10) < 1 || parseInt(formData.age, 10) > 150) errors.age = 'Valid age is required';
    if (!formData.contact.trim()) errors.contact = 'Contact is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.beneficiary.trim()) errors.beneficiary = 'Beneficiary is required';
    if (!formData.bday.trim()) errors.bday = 'Birthday is required';
    if (!formData.password.trim()) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!formData.packagePin.trim()) errors.packagePin = 'Package PIN is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'all' || user.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const displayedUsers = filteredUsers.slice(0, displayCount);

  const tierFilterActiveClass: Record<string, string> = {
    all:      'bg-slate-900 text-white',
    bronze:   'bg-amber-500 text-white',
    silver:   'bg-slate-500 text-white',
    gold:     'bg-yellow-500 text-white',
    platinum: 'bg-purple-600 text-white',
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Users Overview</h1>
            <p className="text-sm text-slate-400 mt-1">
              {users.length} total user{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!loading && users.length > 0 && (
              <button
                onClick={fetchUsers}
                className="text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
              >
                Refresh
              </button>
            )}
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-xs font-medium bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Add User
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
            {successMessage}
          </div>
        )}

        {/* Search & Filters */}
        {!loading && users.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, username or email…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setDisplayCount(12); }}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
                const count = tier === 'all' ? users.length : users.filter((u) => u.tier === tier).length;
                return (
                  <button
                    key={tier}
                    onClick={() => { setFilterTier(tier); setDisplayCount(12); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      filterTier === tier
                        ? tierFilterActiveClass[tier]
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tier === 'all' ? 'All' : tier} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <p className="text-slate-400 text-sm">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <p className="text-slate-400 text-sm">No users created yet</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <p className="text-slate-400 text-sm">No users match the selected filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onClick={() => handleSelectUser(user)}
                />
              ))}
            </div>

            {displayCount < filteredUsers.length && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setDisplayCount(displayCount + 12)}
                  className="text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-6 py-2.5 rounded-xl transition-colors"
                >
                  Show More ({filteredUsers.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteUser}
            onEditPoints={openEditPoints}
          />
        )}

        {/* Edit Leg Points Modal */}
        {editPointsUserId && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditPointsUserId(null)} />
            <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Edit Leg Points</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Update left and right leg values</p>
                </div>
                <button
                  onClick={() => setEditPointsUserId(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                {(['leftAvailablePoints', 'rightAvailablePoints'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                      {field === 'leftAvailablePoints' ? 'Left Available Points' : 'Right Available Points'}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editPointsForm[field]}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val))
                          setEditPointsForm((prev) => ({ ...prev, [field]: val }));
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setEditPointsUserId(null)}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateLegPoints}
                  disabled={editPointsLoading}
                  className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {editPointsLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        <CreateUserModal
          isOpen={showCreateForm}
          formData={formData}
          formErrors={formErrors}
          setFormData={setFormData}
          setFormErrors={setFormErrors}
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateUser}
        />
      </div>
    </div>
  );
}

export default UsersOverview;