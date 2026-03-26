import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

import CreateUserModal from './CreateUserModal';

const API_BASE = 'http://localhost:3000';

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
}

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | null;

function UsersOverview() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');
  const [displayCount, setDisplayCount] = useState(5);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    age: '',
    contact: '',
    address: '',
    beneficiary: '',
    bday: '',
    password: '',
    packagePin: '',
    sponsorReferralCode: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const formatUserDateTime = (apiUser: any): User => {
    const createdDate = new Date(apiUser.createdAt);
    const createdAt = createdDate.toISOString().split('T')[0];
    const createdTime = createdDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

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
      createdAt,
      createdTime,
      isActive: apiUser.isActive !== undefined ? apiUser.isActive : true,
    };
  };

  // ─── API calls ────────────────────────────────────────────────────────────

  /**
   * GET /users  — fetches all users
   * Fixed: was calling a non-existent route; now targets the correct endpoint.
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');

      if (!token) {
        setError('Not authenticated. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        console.error('Server response:', text);
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      const formattedUsers = Array.isArray(data) ? data.map(formatUserDateTime) : [];
      setUsers(formattedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * POST /admin/users — create a new user via the admin service.
   * Sends all form fields including profile data.
   */
  const handleCreateUser = async () => {
  if (!validateForm()) return;

  setError(null);

  try {
    const response = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: formData.name,
        username: formData.username || undefined,
        email: formData.email,
        password: formData.password,
        ...(formData.age ? { age: parseInt(formData.age, 10) } : {}),
        ...(formData.contact ? { contact: formData.contact } : {}),
        ...(formData.address ? { address: formData.address } : {}),
        ...(formData.beneficiary ? { beneficiary: formData.beneficiary } : {}),
        ...(formData.bday ? { birthday: formData.bday } : {}),
        packagePin: formData.packagePin,
        ...(formData.sponsorReferralCode
          ? { sponsorReferralCode: formData.sponsorReferralCode }
          : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(
        Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'Failed to create user',
      );
      return;
    }

    setFormData({
      name: '',
      username: '',
      email: '',
      age: '',
      contact: '',
      address: '',
      beneficiary: '',
      bday: '',
      password: '',
      packagePin: '',
      sponsorReferralCode: '',
    });

    setFormErrors({});
    setShowCreateForm(false);
    setSuccessMessage(`User "${data.user?.name ?? formData.name}" created successfully!`);
    setTimeout(() => setSuccessMessage(null), 3000);
    await fetchUsers();
  } catch (err: any) {
    setError('An error occurred. Please try again.');
    console.error('Error creating user:', err);
  }
};

  /**
   * DELETE /users/:id  — hard-deletes a user
   * Fixed: was not implemented / calling a non-existent endpoint.
   */
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  /**
   * PATCH /users/:id/status  — toggles isActive
   * Fixed: was not implemented / calling a non-existent endpoint.
   */
  const handleToggleStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newStatus = !user.isActive;

    try {
      const response = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: newStatus } : u)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      console.error('Error toggling status:', err);
    }
  };

  // ─── Form validation ──────────────────────────────────────────────────────

 const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  if (!formData.name.trim()) errors.name = 'Name is required';
  if (!formData.username.trim()) errors.username = 'Username is required';
  if (!formData.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Invalid email format';
  }

  if (!formData.age || parseInt(formData.age, 10) < 1 || parseInt(formData.age, 10) > 150) {
    errors.age = 'Valid age is required';
  }

  if (!formData.contact.trim()) errors.contact = 'Contact is required';
  if (!formData.address.trim()) errors.address = 'Address is required';
  if (!formData.beneficiary.trim()) errors.beneficiary = 'Beneficiary is required';
  if (!formData.bday.trim()) errors.bday = 'Birthday is required';

  if (!formData.password.trim()) errors.password = 'Password is required';
  else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!formData.packagePin.trim()) {
    errors.packagePin = 'Package PIN is required';
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};


  // ─── Derived state ────────────────────────────────────────────────────────

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

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

  const tierColors: Record<string, { bg: string; border: string; text: string }> = {
    bronze: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    silver: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
    gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    platinum: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    null: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users Overview</h1>
            <p className="text-gray-500 text-sm mt-1">
              {users.length} total user{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-sky-400 hover:bg-sky-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + Add User
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {/* Search & Filters */}
        {!loading && users.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, username or email…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayCount(5);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Tier filters */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
                const count =
                  tier === 'all'
                    ? users.length
                    : users.filter((u) => u.tier === tier).length;

                const activeClass: Record<string, string> = {
                  all: 'bg-blue-600 text-white',
                  bronze: 'bg-amber-600 text-white',
                  silver: 'bg-slate-600 text-white',
                  gold: 'bg-yellow-600 text-white',
                  platinum: 'bg-purple-600 text-white',
                };

                return (
                  <button
                    key={tier}
                    onClick={() => {
                      setFilterTier(tier);
                      setDisplayCount(5);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                      filterTier === tier
                        ? activeClass[tier]
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tier === 'all' ? 'All' : tier} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Users list */}
        <div>
          {!loading && users.length > 0 && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={fetchUsers}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Refresh Users
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">Loading users…</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No users created yet</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No users match the selected filter.</p>
            </div>
          ) : (
            <div>
              <div className="space-y-4">
                {displayedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`rounded-xl p-6 border transition-all ${
                      user.isActive
                        ? 'border-gray-200 bg-white hover:shadow-md'
                        : 'border-gray-300 bg-gray-50 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {/* Avatar */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                          user.isActive
                            ? 'bg-linear-to-br from-blue-400 to-blue-600'
                            : 'bg-linear-to-br from-gray-300 to-gray-500'
                        }`}
                      >
                        {getInitials(user.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {user.username}
                          </h3>

                          {/* Status badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                              user.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                            onClick={() => handleToggleStatus(user.id)}
                            title="Click to toggle status"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                user.isActive ? 'bg-green-600' : 'bg-red-600'
                              }`}
                            />
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>

                          {/* Tier badge */}
                          {user.tier ? (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${tierColors[user.tier].bg} ${tierColors[user.tier].text}`}
                            >
                              {user.tier}
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                              No Tier
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>

                      {/* Created date */}
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Created</p>
                        <p className="font-medium text-gray-900">{user.createdAt}</p>
                        <p className="text-xs text-gray-500">{user.createdTime}</p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Detail grid */}
                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Name</p>
                        <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Age</p>
                        <p className="font-medium text-gray-900 text-sm">{user.age ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Contact</p>
                        <p className="font-medium text-gray-900 text-sm">{user.contact || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Birthday</p>
                        <p className="font-medium text-gray-900 text-sm">{user.bday || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Address</p>
                        <p className="font-medium text-gray-900 text-sm">{user.address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Beneficiary</p>
                        <p className="font-medium text-gray-900 text-sm">{user.beneficiary || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show more */}
              {displayCount < filteredUsers.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setDisplayCount(displayCount + 5)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Show More ({filteredUsers.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create modal */}
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