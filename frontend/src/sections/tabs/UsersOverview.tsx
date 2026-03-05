import { useState } from 'react';
import { Search, X } from 'lucide-react';

import CreateUserModal from './CreateUserModal';

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
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const tierColors: Record<string, { bg: string; border: string; text: string }> = {
    bronze: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    silver: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
    gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    platinum: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    null: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 150) errors.age = 'Valid age is required';
    if (!formData.contact.trim()) errors.contact = 'Contact is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.beneficiary.trim()) errors.beneficiary = 'Beneficiary is required';
    if (!formData.bday.trim()) errors.bday = 'Birthday is required';
    if (!formData.password.trim()) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = () => {
    if (!validateForm()) return;

    const { createdAt, createdTime } = getCurrentDateTime();
    const newUser: User = {
      id: Date.now().toString(),
      name: formData.name,
      username: formData.username,
      email: formData.email,
      age: parseInt(formData.age),
      contact: formData.contact,
      address: formData.address,
      beneficiary: formData.beneficiary,
      bday: formData.bday,
      password: formData.password,
      tier: null,
      createdAt,
      createdTime,
      isActive: true,
    };

    setUsers([newUser, ...users]);
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
    });
    setFormErrors({});
    setShowCreateForm(false);
  };

  const getCurrentDateTime = (): { createdAt: string; createdTime: string } => {
    const now = new Date();
    const createdAt = now.toISOString().split('T')[0];
    const createdTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { createdAt, createdTime };
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setUsers(users.filter((user) => user.id !== userId));
    }
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, isActive: !user.isActive } : user
      )
    );
  };

  const getFilteredUsers = (): User[] => {
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = filterTier === 'all' ? true : user.tier === filterTier;
      return matchesSearch && matchesTier;
    });
  };

  const filteredUsers = getFilteredUsers();
  const displayedUsers = filteredUsers.slice(0, displayCount);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Header Section */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-gray-900">Users Overview</h1>
            <p className="text-gray-600 mt-2">Manage and view all registered users</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Create an account
          </button>
        </div>

        {/* Search and Filter Section */}
        {users.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayCount(5);
                }}
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tier Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setFilterTier('all');
                  setDisplayCount(5);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterTier === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => {
                  setFilterTier('bronze');
                  setDisplayCount(5);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterTier === 'bronze'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Bronze ({users.filter((u) => u.tier === 'bronze').length})
              </button>
              <button
                onClick={() => {
                  setFilterTier('silver');
                  setDisplayCount(5);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterTier === 'silver'
                  ? 'bg-slate-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Silver ({users.filter((u) => u.tier === 'silver').length})
              </button>
              <button
                onClick={() => {
                  setFilterTier('gold');
                  setDisplayCount(5);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterTier === 'gold'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Gold ({users.filter((u) => u.tier === 'gold').length})
              </button>
              <button
                onClick={() => {
                  setFilterTier('platinum');
                  setDisplayCount(5);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterTier === 'platinum'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Platinum ({users.filter((u) => u.tier === 'platinum').length})
              </button>
            </div>
          </div>
        )}

        {/* Users List Section */}
        <div>
          {users.length === 0 ? (
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
                    className={`rounded-xl p-6 border transition-all ${user.isActive
                      ? 'border-gray-200 bg-white hover:shadow-md'
                      : 'border-gray-300 bg-gray-50 opacity-75'
                      }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {/* Profile Picture */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${user.isActive
                        ? 'bg-linear-to-br from-blue-400 to-blue-600'
                        : 'bg-linear-to-br from-gray-300 to-gray-500'
                        }`}>
                        {getInitials(user.name)}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-lg text-gray-900">{user.username}</h3>
                          {/* Status Indicator */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${user.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            onClick={() => handleToggleStatus(user.id)}
                            title="Click to toggle status"
                          >
                            <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {user.tier && (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${tierColors[user.tier].bg
                                } ${tierColors[user.tier].text}`}
                            >
                              {user.tier}
                            </span>
                          )}
                          {!user.tier && (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                              No Tier
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>

                      {/* Created Info */}
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Created</p>
                        <p className="font-medium text-gray-900">{user.createdAt}</p>
                        <p className="text-xs text-gray-500">{user.createdTime}</p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* User Details */}
                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Name</p>
                        <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Age</p>
                        <p className="font-medium text-gray-900 text-sm">{user.age}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Contact</p>
                        <p className="font-medium text-gray-900 text-sm">{user.contact}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Birthday</p>
                        <p className="font-medium text-gray-900 text-sm">{user.bday}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Address</p>
                        <p className="font-medium text-gray-900 text-sm">{user.address}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium mb-1">Beneficiary</p>
                        <p className="font-medium text-gray-900 text-sm">{user.beneficiary}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show More Button */}
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