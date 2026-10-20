import { useState, useEffect } from 'react';
import { Search, Pencil, OctagonMinus, ArrowUpCircle, KeyRound, X, ChevronLeft, ChevronRight, Users, Lock, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

import CreateUserModal from '../modals/CreateUserModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const PROTECTED_ADMIN_EMAIL = 'admin@coprofitglobal.com';
const isProtectedAdmin = (user: User) => user.email === PROTECTED_ADMIN_EMAIL;

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
  isFree: boolean;
  profilePicture?: string;
  createdAt: string;
  createdTime: string;
  isActive: boolean;
  isRestricted: boolean;
  restrictedReason?: string;
  leftLegPoints: number;
  rightLegPoints: number;
  leftAvailablePoints: number;
  rightAvailablePoints: number;
  totalPairingBonus: number;
  totalSign5Bonus: number;
  totalLeadershipBonus: number;
  totalDirectReferralIncome: number;
  totalIndirectReferralIncome: number;
  totalRepeatBinaryBonusIncome: number;
  totalStairstepBonusIncome: number;
  totalRoyaltyBonusIncome: number;
  unilevelPoints: number;
}

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | null;

const USERS_PER_PAGE = 6;

/* ── Helpers ──────────────────────────────────────────────────── */
function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="relative group">
        <div className="text-sm text-slate-900 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 min-h-9 flex items-center overflow-hidden">
          <span className="truncate">{value || <span className="text-slate-300">—</span>}</span>
        </div>
        {value && (
          <div className="absolute left-0 top-0 z-30 hidden group-hover:block px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-lg text-sm text-slate-900 min-w-full whitespace-normal wrap-break-word">
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

const tierConfig: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  free: { bg: 'bg-slate-50', text: 'text-slate-400', ring: 'ring-slate-200', label: 'Free' },
  bronze: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', label: 'Bronze' },
  silver: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', label: 'Silver' },
  gold: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', label: 'Gold' },
  platinum: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', label: 'Platinum' },
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

/* ── User Detail Modal ────────────────────────────────────────── */
function UserDetailModal({
  user,
  onClose,
  onToggleStatus,
  onEditPoints,
  onEditBonuses,
  onUpgrade,
  onChangePassword,
  onChangeName,
  onRestrict,
  onDelete,
}: {
  user: User;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onEditPoints: (user: User) => void;
  onEditBonuses: (user: User) => void;
  onUpgrade: (user: User) => void;
  onChangePassword: (user: User) => void;
  onChangeName: (user: User) => void;
  onRestrict: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const isAdmin = isProtectedAdmin(user);

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
            <h3 className="text-base font-semibold text-slate-900 truncate">{user.username}</h3>

            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {/* Protected admin badge */}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 whitespace-nowrap">
                  <Lock className="w-3 h-3" />
                  Admin Account
                </span>
              )}

              {!isAdmin && (
                <>
                  <button
                    onClick={() => onToggleStatus(user.id)}
                    title="Click to toggle status"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 transition-colors whitespace-nowrap ${user.isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-600 ring-red-200 hover:bg-red-100'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                  {user.isRestricted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-200 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      Restricted
                    </span>
                  )}
                </>
              )}

              {user.tier ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize whitespace-nowrap ${tierConfig[user.tier].bg} ${tierConfig[user.tier].text} ${tierConfig[user.tier].ring}`}>
                  {tierConfig[user.tier].label}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 ring-1 ring-slate-200 whitespace-nowrap">
                  No Tier
                </span>
              )}
              {user.isFree && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 ring-1 ring-slate-300 whitespace-nowrap">
                  Free
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

        {/* Protected admin notice banner */}
        {isAdmin && (
          <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5 shrink-0">
            <Lock className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-700">
              This is a protected system admin account. Deletion, password changes, package upgrades, and point edits are disabled.
            </p>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1">

          {/* Personal Info */}
          <div className="px-6 py-5 border-b border-slate-100">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoField label="Full Name" value={user.name} />
              <InfoField label="Age" value={user.age?.toString() ?? '—'} />
              <InfoField label="Birthday" value={user.bday || '—'} />
              <InfoField label="Contact" value={user.contact || '—'} />
              <InfoField label="Beneficiary" value={user.beneficiary || '—'} />
              <InfoField label="Address" value={user.address || '—'} />
            </div>
          </div>

          {/* Leg Points */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Available Points</h4>
              {!isAdmin && (
                <button
                  onClick={() => onEditPoints(user)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Points
                </button>
              )}
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

          {/* Bonuses & Income */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bonuses & Income</h4>
              {!isAdmin && (
                <button
                  onClick={() => onEditBonuses(user)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Bonuses
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {([
                { label: 'Total Pairing Bonus (PHP)', value: user.totalPairingBonus },
                { label: 'Total Sign-5 Bonus (PHP)', value: user.totalSign5Bonus },
                { label: 'Total Leadership Bonus (PHP)', value: user.totalLeadershipBonus },
                { label: 'Total Income of Direct Referrals (PHP)', value: user.totalDirectReferralIncome },
                { label: 'Total Income of Indirect Referrals (PHP)', value: user.totalIndirectReferralIncome },
                { label: 'Total Income of Repeat Binary Bonus (PHP)', value: user.totalRepeatBinaryBonusIncome },
                { label: 'Total Income of Stairstep Bonus (PHP)', value: user.totalStairstepBonusIncome },
                { label: 'Total Income of Royalty Bonus (PHP)', value: user.totalRoyaltyBonusIncome },
                { label: 'Unilevel Points / PV', value: user.unilevelPoints },
              ] as { label: string; value: number }[]).map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                  <p className="text-xs font-medium text-slate-400 mb-1 leading-tight">{label}</p>
                  <p className="text-lg font-semibold text-slate-900">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          {!isAdmin ? (
            <button
              onClick={() => { onClose(); onRestrict(user); }}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors border ${
                user.isRestricted
                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                  : 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
              }`}
            >
              <OctagonMinus className="w-3.5 h-3.5" />
              {user.isRestricted ? 'Unrestrict User' : 'Restrict User'}
            </button>
          ) : (
            <div /> /* spacer to keep Close button right-aligned */
          )}

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <>
                <button
                  onClick={() => onChangeName(user)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Change Name
                </button>
                <button
                  onClick={() => onChangePassword(user)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Change Password
                </button>
                <button
                  onClick={() => onUpgrade(user)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  Upgrade Package
                </button>
                <button
                  onClick={() => { onClose(); onDelete(user); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
function UsersOverview() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<Tier | 'all' | 'free'>('all');
  const [currentPage, setCurrentPage] = useState(1);
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

  // ── Change Password state ─────────────────────────────────────────────────
  const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // ── Change Name state ─────────────────────────────────────────────────────
  const [changeNameUser, setChangeNameUser] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [changeNameLoading, setChangeNameLoading] = useState(false);
  const [changeNameError, setChangeNameError] = useState<string | null>(null);

  // ── Restrict User state
  const [restrictUser, setRestrictUser] = useState<User | null>(null);
  const [restrictReason, setRestrictReason] = useState('');
  const [restrictLoading, setRestrictLoading] = useState(false);
  const [restrictError, setRestrictError] = useState<string | null>(null);

  // ── Delete All Users state (testing only) ────────────────────────────────
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  // ── Delete Single User state ──────────────────────────────────────────────
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Edit Bonuses state ────────────────────────────────────────────────────
  const [editBonusUser, setEditBonusUser] = useState<User | null>(null);
  const [editBonusForm, setEditBonusForm] = useState({
    totalPairingBonus: '',
    totalSign5Bonus: '',
    totalLeadershipBonus: '',
    totalDirectReferralIncome: '',
    totalIndirectReferralIncome: '',
    totalRepeatBinaryBonusIncome: '',
    totalStairstepBonusIncome: '',
    totalRoyaltyBonusIncome: '',
    unilevelPoints: '',
  });
  const [editBonusLoading, setEditBonusLoading] = useState(false);
  const [editBonusError, setEditBonusError] = useState<string | null>(null);

  // ── Upgrade Package state ─────────────────────────────────────────────────
  const [upgradeUser, setUpgradeUser] = useState<User | null>(null);
  const [upgradePin, setUpgradePin] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [generatePinTier, setGeneratePinTier] = useState<string>('');
  const [generatePinLoading, setGeneratePinLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const onCycleChanged = () => fetchUsers();
    window.addEventListener('cycle:changed', onCycleChanged);
    return () => window.removeEventListener('cycle:changed', onCycleChanged);
  }, []);

  // ─── API Helpers ──────────────────────────────────────────────────────────

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
      isFree: apiUser.isFree ?? false,
      profilePicture: apiUser.profileImage,
      leftLegPoints: apiUser.leftLegPoints ?? 0,
      rightLegPoints: apiUser.rightLegPoints ?? 0,
      leftAvailablePoints: apiUser.leftAvailablePoints ?? 0,
      rightAvailablePoints: apiUser.rightAvailablePoints ?? 0,
      totalPairingBonus: apiUser.totalPairingBonus ?? 0,
      totalSign5Bonus: apiUser.totalSign5Bonus ?? 0,
      totalLeadershipBonus: apiUser.totalLeadershipBonus ?? 0,
      totalDirectReferralIncome: apiUser.totalDirectReferralIncome ?? 0,
      totalIndirectReferralIncome: apiUser.totalIndirectReferralIncome ?? 0,
      totalRepeatBinaryBonusIncome: apiUser.totalRepeatBinaryBonusIncome ?? 0,
      totalStairstepBonusIncome: apiUser.totalStairstepBonusIncome ?? 0,
      totalRoyaltyBonusIncome: apiUser.totalRoyaltyBonusIncome ?? 0,
      unilevelPoints: apiUser.unilevelPoints ?? 0,
      createdAt: createdDate.toISOString().split('T')[0],
      createdTime: createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isActive: apiUser.isActive !== undefined ? apiUser.isActive : true,
      isRestricted: apiUser.isRestricted ?? false,
      restrictedReason: apiUser.restrictedReason ?? '',
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(`${API_BASE}/admin/users`);
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
      const response = await apiFetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await apiFetch(`${API_BASE}/admin/users/${user.id}/available-points`);
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
      const res = await apiFetch(`${API_BASE}/admin/users/${user.id}/available-points`);
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
      const response = await apiFetch(`${API_BASE}/admin/users/${editPointsUserId}/leg-points`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsedPoints),
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

  const openDeleteUser = (user: User) => {
    setDeleteError(null);
    setDeleteUser(user);
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${deleteUser.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        setDeleteError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to delete user.');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      setDeleteUser(null);
      setSuccessMessage(`User @${deleteUser.username} deleted successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setDeleteError('An unexpected error occurred.');
    } finally {
      setDeleteLoading(false);
    }
  };

const handleDeleteAllUsers = async () => {
    setDeleteAllLoading(true);
    setDeleteAllError(null);
    try {
      const deletableUsers = users.filter((u) => !isProtectedAdmin(u));
      const ids = deletableUsers.map((u) => u.id);
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      setUsers((prev) => prev.filter((u) => isProtectedAdmin(u)));
      setShowDeleteAllConfirm(false);
      if (failed > 0) {
        setSuccessMessage(`Deleted ${ids.length - failed} users. ${failed} failed.`);
      } else {
        setSuccessMessage(`All ${ids.length} users deleted successfully. Admin account preserved.`);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setDeleteAllError('An unexpected error occurred.');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const openChangePassword = (user: User) => {
    setSelectedUser(null);
    setNewPassword('');
    setChangePasswordError(null);
    setChangePasswordUser(user);
  };

  const handleChangePassword = async () => {
    if (!changePasswordUser) return;
    if (!newPassword.trim() || newPassword.length < 6) {
      setChangePasswordError('Password must be at least 6 characters.');
      return;
    }
    setChangePasswordLoading(true);
    setChangePasswordError(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${changePasswordUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setChangePasswordError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to update password.');
        return;
      }
      setChangePasswordUser(null);
      setNewPassword('');
      setSuccessMessage(`Password updated for @${changePasswordUser.username}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setChangePasswordError('An unexpected error occurred.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Members can't rename themselves (profile shows "contact the admin"), so the
  // admin applies verified name changes here.
  const openChangeName = (user: User) => {
    setSelectedUser(null);
    setNewName(user.name);
    setChangeNameError(null);
    setChangeNameUser(user);
  };

  const closeChangeName = () => {
    setChangeNameUser(null);
    setNewName('');
    setChangeNameError(null);
  };

  const handleChangeName = async () => {
    if (!changeNameUser) return;
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      setChangeNameError('Name must be at least 2 characters.');
      return;
    }
    setChangeNameLoading(true);
    setChangeNameError(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${changeNameUser.id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setChangeNameError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to update name.');
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === changeNameUser.id ? { ...u, name: trimmed } : u)));
      setSuccessMessage(`Name updated for @${changeNameUser.username}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      closeChangeName();
    } catch {
      setChangeNameError('An unexpected error occurred.');
    } finally {
      setChangeNameLoading(false);
    }
  };

  const openRestrict = (user: User) => {
    setSelectedUser(null);
    setRestrictReason('');
    setRestrictError(null);
    setRestrictUser(user);
  };

  const handleRestrictUser = async () => {
    if (!restrictUser) return;
    const willRestrict = !restrictUser.isRestricted;
    if (willRestrict && !restrictReason.trim()) {
      setRestrictError('Please provide a reason for restricting this account.');
      return;
    }
    setRestrictLoading(true);
    setRestrictError(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${restrictUser.id}/restrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRestricted: willRestrict, reason: willRestrict ? restrictReason.trim() : '' }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRestrictError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to update restriction.');
        return;
      }
      setUsers((prev) => prev.map((u) =>
        u.id === restrictUser.id
          ? { ...u, isRestricted: willRestrict, restrictedReason: willRestrict ? restrictReason.trim() : '' }
          : u
      ));
      setRestrictUser(null);
      setRestrictReason('');
      setSuccessMessage(
        willRestrict
          ? `@${restrictUser.username} has been restricted.`
          : `Restriction lifted for @${restrictUser.username}.`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setRestrictError('An unexpected error occurred.');
    } finally {
      setRestrictLoading(false);
    }
  };

  const openEditBonuses = (user: User) => {
    setEditBonusError(null);
    setEditBonusForm({
      totalPairingBonus: String(user.totalPairingBonus ?? 0),
      totalSign5Bonus: String(user.totalSign5Bonus ?? 0),
      totalLeadershipBonus: String(user.totalLeadershipBonus ?? 0),
      totalDirectReferralIncome: String(user.totalDirectReferralIncome ?? 0),
      totalIndirectReferralIncome: String(user.totalIndirectReferralIncome ?? 0),
      totalRepeatBinaryBonusIncome: String(user.totalRepeatBinaryBonusIncome ?? 0),
      totalStairstepBonusIncome: String(user.totalStairstepBonusIncome ?? 0),
      totalRoyaltyBonusIncome: String(user.totalRoyaltyBonusIncome ?? 0),
      unilevelPoints: String(user.unilevelPoints ?? 0),
    });
    setEditBonusUser(user);
  };

  const handleUpdateBonuses = async () => {
    if (!editBonusUser) return;
    setEditBonusLoading(true);
    setEditBonusError(null);
    const payload = {
      totalPairingBonus: Number(editBonusForm.totalPairingBonus) || 0,
      totalSign5Bonus: Number(editBonusForm.totalSign5Bonus) || 0,
      totalLeadershipBonus: Number(editBonusForm.totalLeadershipBonus) || 0,
      totalDirectReferralIncome: Number(editBonusForm.totalDirectReferralIncome) || 0,
      totalIndirectReferralIncome: Number(editBonusForm.totalIndirectReferralIncome) || 0,
      totalRepeatBinaryBonusIncome: Number(editBonusForm.totalRepeatBinaryBonusIncome) || 0,
      totalStairstepBonusIncome: Number(editBonusForm.totalStairstepBonusIncome) || 0,
      totalRoyaltyBonusIncome: Number(editBonusForm.totalRoyaltyBonusIncome) || 0,
      unilevelPoints: Number(editBonusForm.unilevelPoints) || 0,
    };
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${editBonusUser.id}/bonuses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update bonuses');
      }
      const updatedUser = { ...editBonusUser, ...payload };
      setUsers((prev) => prev.map((u) => u.id === editBonusUser.id ? updatedUser : u));
      setSelectedUser(updatedUser);
      setEditBonusUser(null);
      setSuccessMessage('Bonuses & income updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setEditBonusError(err instanceof Error ? err.message : 'Failed to update bonuses');
    } finally {
      setEditBonusLoading(false);
    }
  };

  const openUpgrade = (user: User) => {
    setSelectedUser(null);
    setUpgradePin('');
    setUpgradeError(null);
    setGeneratePinTier('');
    setUpgradeUser(user);
  };

  const handleGeneratePinForUpgrade = async () => {
    if (!generatePinTier) { setUpgradeError('Please select a tier to generate a PIN.'); return; }
    setGeneratePinLoading(true);
    setUpgradeError(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/pins/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: generatePinTier, quantity: 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setUpgradeError(
          Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to generate PIN.',
        );
        return;
      }
      const pins: any[] = Array.isArray(data) ? data : (data.pins ?? []);
      const generatedPin: string = pins[0]?.pin ?? '';
      if (!generatedPin || generatedPin.startsWith('$2')) {
        setUpgradeError('Generated PIN is hashed — please void it and try again.');
        return;
      }
      setUpgradePin(generatedPin);
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Failed to generate PIN.');
    } finally {
      setGeneratePinLoading(false);
    }
  };

  const handleUpgradePackage = async () => {
    if (!upgradeUser) return;
    const pin = upgradePin.trim();
    if (!pin) { setUpgradeError('Package PIN is required.'); return; }

    setUpgradeLoading(true);
    setUpgradeError(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/users/${upgradeUser.id}/upgrade-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packagePin: pin }),
      });
      const data = await response.json();
      if (!response.ok) {
        setUpgradeError(
          Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Upgrade failed.',
        );
        return;
      }
      const newTier: Tier = data.newTier ?? data.membershipTier ?? upgradeUser.tier;
      setUpgradeUser(null);
      setUpgradePin('');
      setGeneratePinTier('');
      setSuccessMessage(`Package upgraded to ${newTier ? tierConfig[newTier]?.label ?? newTier : 'new tier'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3500);
      await fetchUsers();
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newStatus = !user.isActive;
    try {
      const response = await apiFetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: newStatus }),
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
    let matchesTier: boolean;
    if (filterTier === 'all') matchesTier = true;
    else if ((filterTier as string) === 'free') matchesTier = user.isFree;
    else matchesTier = user.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * USERS_PER_PAGE, safePage * USERS_PER_PAGE);

  const tierFilterActiveClass: Record<string, string> = {
    all: 'bg-slate-900 text-white',
    free: 'bg-slate-400 text-white',
    bronze: 'bg-amber-500 text-white',
    silver: 'bg-slate-500 text-white',
    gold: 'bg-yellow-500 text-white',
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
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'free', 'bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
                const count = tier === 'all' ? users.length : tier === 'free' ? users.filter((u) => u.isFree).length : users.filter((u) => u.tier === tier).length;
                return (
                  <button
                    key={tier}
                    onClick={() => { setFilterTier(tier); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterTier === tier
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

        {/* Users Table */}
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
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

            {/* Table Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">All Users</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200 px-3 py-1 rounded-full">
                <Users className="w-3 h-3" />
                User Registry
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      User
                    </th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">
                      Email
                    </th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Tier
                    </th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                      L. Leg
                    </th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                      R. Leg
                    </th>
                    <th className="text-center px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                    >
                      {/* User */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 overflow-hidden ${user.isActive ? 'bg-slate-900' : 'bg-slate-300'}`}>
                            {user.profilePicture
                              ? <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                              : getInitials(user.name)
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 text-xs sm:text-sm truncate">@{user.username}</p>
                            <p className="text-xs text-slate-400 truncate md:hidden">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                        <p className="text-xs sm:text-sm text-slate-600 truncate max-w-50">{user.email}</p>
                      </td>

                      {/* Tier */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.tier && tierConfig[user.tier] ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${tierConfig[user.tier].bg} ${tierConfig[user.tier].text} ${tierConfig[user.tier].ring}`}>
                              {tierConfig[user.tier].label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                              No Tier
                            </span>
                          )}
                          {user.isFree && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 ring-1 ring-slate-300">
                              Free
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Left Leg */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 ring-1 ring-slate-200 px-2 py-0.5 rounded-full">
                          {user.leftAvailablePoints.toLocaleString()}
                        </span>
                      </td>

                      {/* Right Leg */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 ring-1 ring-slate-200 px-2 py-0.5 rounded-full">
                          {user.rightAvailablePoints.toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                        {user.isRestricted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            Restricted
                          </span>
                        ) : user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 ring-1 ring-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                        <p className="text-xs sm:text-sm font-medium text-slate-900">{user.createdAt}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{user.createdTime}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Showing <span className="font-medium text-slate-600">{(safePage - 1) * USERS_PER_PAGE + 1}–{Math.min(safePage * USERS_PER_PAGE, filteredUsers.length)}</span> of <span className="font-medium text-slate-600">{filteredUsers.length}</span> users
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-xs font-medium text-slate-600 px-1">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onToggleStatus={handleToggleStatus}
            onEditPoints={openEditPoints}
            onEditBonuses={openEditBonuses}
            onUpgrade={openUpgrade}
            onChangePassword={openChangePassword}
            onChangeName={openChangeName}
            onRestrict={openRestrict}
            onDelete={openDeleteUser}
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

        {/* Edit Bonuses Modal */}
        {editBonusUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setEditBonusUser(null); setEditBonusError(null); }} />
            <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Edit Bonuses & Income</h3>
                  <p className="text-xs text-slate-400 mt-0.5">@{editBonusUser.username}</p>
                </div>
                <button
                  onClick={() => { setEditBonusUser(null); setEditBonusError(null); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { key: 'totalPairingBonus', label: 'Total Pairing Bonus (PHP)' },
                    { key: 'totalSign5Bonus', label: 'Total Sign-5 Bonus (PHP)' },
                    { key: 'totalLeadershipBonus', label: 'Total Leadership Bonus (PHP)' },
                    { key: 'totalDirectReferralIncome', label: 'Total Income of Direct Referrals (PHP)' },
                    { key: 'totalIndirectReferralIncome', label: 'Total Income of Indirect Referrals (PHP)' },
                    { key: 'totalRepeatBinaryBonusIncome', label: 'Total Income of Repeat Binary Bonus (PHP)' },
                    { key: 'totalStairstepBonusIncome', label: 'Total Income of Stairstep Bonus (PHP)' },
                    { key: 'totalRoyaltyBonusIncome', label: 'Total Income of Royalty Bonus (PHP)' },
                    { key: 'unilevelPoints', label: 'Unilevel Points / PV' },
                  ] as { key: keyof typeof editBonusForm; label: string }[]).map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editBonusForm[key]}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val))
                            setEditBonusForm((prev) => ({ ...prev, [key]: val }));
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  ))}
                </div>
                {editBonusError && (
                  <p className="mt-4 text-xs text-red-600 flex items-start gap-1">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    {editBonusError}
                  </p>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end shrink-0">
                <button
                  onClick={() => { setEditBonusUser(null); setEditBonusError(null); }}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBonuses}
                  disabled={editBonusLoading}
                  className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {editBonusLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Package Modal */}
        {upgradeUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setUpgradeUser(null); setUpgradePin(''); setUpgradeError(null); setGeneratePinTier(''); }}
            />
            <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">

              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center">
                    <ArrowUpCircle className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Upgrade Package</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-45">@{upgradeUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setUpgradeUser(null); setUpgradePin(''); setUpgradeError(null); setGeneratePinTier(''); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current tier badge */}
              <div className="px-6 pt-5 pb-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Current Package</p>
                {upgradeUser.tier ? (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 capitalize ${tierConfig[upgradeUser.tier].bg} ${tierConfig[upgradeUser.tier].text} ${tierConfig[upgradeUser.tier].ring}`}>
                    {tierConfig[upgradeUser.tier].label}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                    No Package
                  </span>
                )}
              </div>

              {/* Generate PIN section */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Generate a New PIN</p>
                <div className="flex flex-wrap gap-2">
                  {(['bronze', 'silver', 'gold', 'platinum'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setGeneratePinTier(t); setUpgradeError(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ring-1 transition-colors ${generatePinTier === t
                        ? `${tierConfig[t].bg} ${tierConfig[t].text} ${tierConfig[t].ring} ring-2`
                        : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {tierConfig[t].label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGeneratePinForUpgrade}
                  disabled={generatePinLoading || !generatePinTier}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatePinLoading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-slate-400/40 border-t-slate-600 rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3 h-3" />
                      Generate & Auto-fill PIN
                    </>
                  )}
                </button>
              </div>

              {/* PIN input */}
              <div className="px-6 py-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Package PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter or generate a package PIN"
                      value={upgradePin}
                      onChange={(e) => { setUpgradePin(e.target.value); setUpgradeError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpgradePackage(); }}
                      autoFocus
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 transition-colors ${upgradeError
                        ? 'border-red-300 focus:ring-red-100'
                        : upgradePin
                          ? 'border-emerald-300 focus:ring-emerald-100'
                          : 'border-slate-200 focus:ring-slate-200'
                        }`}
                    />
                  </div>
                  {upgradeError && (
                    <p className="mt-2 text-xs text-red-600 flex items-start gap-1">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      {upgradeError}
                    </p>
                  )}
                  {upgradePin && !upgradeError && (
                    <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                      <span>✓</span> PIN ready — click Confirm Upgrade to proceed.
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Generate a new PIN above, or paste an existing one. The tier is determined automatically by the PIN.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => { setUpgradeUser(null); setUpgradePin(''); setUpgradeError(null); setGeneratePinTier(''); }}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpgradePackage}
                  disabled={upgradeLoading || !upgradePin.trim()}
                  className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {upgradeLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Upgrading…
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      Confirm Upgrade
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restrict User Modal */}
        {restrictUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setRestrictUser(null); setRestrictReason(''); setRestrictError(null); }}
            />
            <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${restrictUser.isRestricted ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <OctagonMinus className={`w-4 h-4 ${restrictUser.isRestricted ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {restrictUser.isRestricted ? 'Lift Restriction' : 'Restrict Account'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-45">@{restrictUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setRestrictUser(null); setRestrictReason(''); setRestrictError(null); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {restrictUser.isRestricted ? (
                  <p className="text-sm text-slate-600">
                    This account is currently restricted
                    {restrictUser.restrictedReason ? ` for: <span className="font-medium">${restrictUser.restrictedReason}</span>` : ''}.
                    Lifting the restriction will allow the user to log in again.
                  </p>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                      Reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain why this account is being restricted…"
                      value={restrictReason}
                      onChange={(e) => { setRestrictReason(e.target.value); setRestrictError(null); }}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 resize-none transition-colors ${
                        restrictError ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:ring-slate-200'
                      }`}
                    />
                    {restrictError && (
                      <p className="mt-2 text-xs text-red-600 flex items-start gap-1">
                        <span className="mt-0.5 shrink-0">⚠</span>
                        {restrictError}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  {restrictUser.isRestricted
                    ? 'The user will be able to log in immediately after lifting the restriction.'
                    : 'The user will be logged out of all active sessions and blocked from logging in.'}
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => { setRestrictUser(null); setRestrictReason(''); setRestrictError(null); }}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestrictUser}
                  disabled={restrictLoading || (!restrictUser.isRestricted && !restrictReason.trim())}
                  className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors ${
                    restrictUser.isRestricted
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {restrictLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {restrictUser.isRestricted ? 'Lifting…' : 'Restricting…'}
                    </>
                  ) : (
                    <>
                      <OctagonMinus className="w-3.5 h-3.5" />
                      {restrictUser.isRestricted ? 'Lift Restriction' : 'Confirm Restrict'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Name Modal */}
        {changeNameUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeChangeName} />
            <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Pencil className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Change Name</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-45">@{changeNameUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={closeChangeName}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setChangeNameError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleChangeName(); }}
                    autoFocus
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 transition-colors ${changeNameError ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:ring-slate-200'}`}
                  />
                  {changeNameError && (
                    <p className="mt-2 text-xs text-red-600 flex items-start gap-1">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      {changeNameError}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Members cannot change their own name. Only apply a change after verifying the member's request.
                </p>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={closeChangeName}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeName}
                  disabled={changeNameLoading || newName.trim().length < 2 || newName.trim() === changeNameUser.name}
                  className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {changeNameLoading ? 'Saving…' : 'Save Name'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {changePasswordUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setChangePasswordUser(null); setNewPassword(''); setChangePasswordError(null); }}
            />
            <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-45">@{changePasswordUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setChangePasswordUser(null); setNewPassword(''); setChangePasswordError(null); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setChangePasswordError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
                      autoFocus
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 transition-colors ${changePasswordError
                        ? 'border-red-300 focus:ring-red-100'
                        : newPassword.length >= 6
                          ? 'border-emerald-300 focus:ring-emerald-100'
                          : 'border-slate-200 focus:ring-slate-200'
                        }`}
                    />
                  </div>
                  {changePasswordError && (
                    <p className="mt-2 text-xs text-red-600 flex items-start gap-1">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      {changePasswordError}
                    </p>
                  )}
                  {newPassword.length >= 6 && !changePasswordError && (
                    <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                      <span>✓</span> Password looks good — click Save to confirm.
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  This will immediately update the password for this user. They will need to use the new password on their next login.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => { setChangePasswordUser(null); setNewPassword(''); setChangePasswordError(null); }}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordLoading || newPassword.length < 6}
                  className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {changePasswordLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      Save Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete All Users Modal (Testing Only) */}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !deleteAllLoading && setShowDeleteAllConfirm(false)}
            />
            <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Delete All Users</h3>
                    <p className="text-xs text-red-500 font-medium mt-0.5">⚠ Testing purposes only</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  disabled={deleteAllLoading}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Body */}
              <div className="px-6 py-5 space-y-3">
                <p className="text-sm text-slate-700">
                  This will permanently delete <span className="font-semibold text-red-600">{users.filter((u) => !isProtectedAdmin(u)).length} user{users.filter((u) => !isProtectedAdmin(u)).length !== 1 ? 's' : ''}</span>. This action cannot be undone.
                </p>
                <p className="text-xs text-indigo-600 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 shrink-0" />
                  The protected admin account (<span className="font-medium">{PROTECTED_ADMIN_EMAIL}</span>) will be preserved.
                </p>
                {deleteAllError && (
                  <p className="text-xs text-red-600 flex items-start gap-1">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    {deleteAllError}
                  </p>
                )}
              </div>
              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  disabled={deleteAllLoading}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllUsers}
                  disabled={deleteAllLoading}
                  className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {deleteAllLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {deleteUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !deleteLoading && setDeleteUser(null)}
            />
            <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Delete User</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-45">@{deleteUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteUser(null)}
                  disabled={deleteLoading}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-3">
                <p className="text-sm text-slate-700">
                  Are you sure you want to permanently delete <span className="font-semibold text-slate-900">@{deleteUser.username}</span>? This action cannot be undone.
                </p>
                {deleteError && (
                  <p className="text-xs text-red-600 flex items-start gap-1">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    {deleteError}
                  </p>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteUser(null)}
                  disabled={deleteLoading}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {deleteLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete User
                    </>
                  )}
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