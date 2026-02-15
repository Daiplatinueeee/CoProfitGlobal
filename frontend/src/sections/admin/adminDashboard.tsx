import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Lock,
  QrCode,
  Wallet,
  ShoppingBag,
  BarChart3,
  Network,
  Download,
  Clock,
  LogOut,
  ChevronLeft,
  Zap,
  Gift,
  FileText,
  CheckCircle,
  History,
  Package,
} from 'lucide-react';

import Genealogy from '../tabs/Genealogy';

export default function adminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setProfileModalOpen] = useState(false);
  const [profilePicture,] = useState('CP');

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  const menuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'genealogy', label: 'Genealogy', icon: Network },
    { id: 'generate-pin', label: 'Generate PIN', icon: Lock },
    { id: 'generate-free-code', label: 'Generate Free Code', icon: QrCode },
    { id: 'all-generated-pin', label: 'All Generated PIN', icon: Zap },
    { id: 'withdrawal-gc-approval', label: 'Withdrawal GC Approval', icon: CheckCircle },
    { id: 'package-requests', label: 'Package Requests', icon: Package },
    { id: 'approve-withdrawals', label: 'Approve Withdrawals', icon: Download },
    { id: 'withdrawal-history', label: 'Withdrawal History', icon: History },
    { id: 'member-balances', label: 'Member Balances', icon: Wallet },
    { id: 'withdraw-gift-certificate', label: 'Withdraw Gift Certificate', icon: Gift },
    { id: 'unilevel-product-request', label: 'Unilevel Product Request', icon: ShoppingBag },
    { id: 'unilevel-monthly-subscription', label: 'Unilevel Monthly Subscription', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
  ], []);

  const renderDashboardContent = () => (
    <div className="space-y-6 pb-6 bg-white">
      {/* Total Income Card - Apple Inspired */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100 shadow-lg">
        <p className="text-sm font-medium text-blue-600 mb-2">Total Payouts</p>
        <p className="text-3xl font-bold text-gray-900 mb-4">₱442,410.00</p>
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">Total Members</span>
            <span className="text-2xl font-semibold text-gray-900">944</span>
          </div>
          <div className="w-px h-12 bg-blue-200"></div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">New Members (7 days)</span>
            <span className="text-2xl font-semibold text-blue-600">15</span>
          </div>
        </div>
      </div>

      {/* Income Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Clicks</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Direct Referral</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Total Indirect Referral</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Lifetime Income</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Pending Withdrawals</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱0.00</p>
        </div>

         <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Activation Codes</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">1,192</p>
        </div>

      </div>

      {/* Recent Signups */}
      <div className="flex gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Signups</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {[
              { date: 'Feb 14, 2025 - 3:45 PM', type: 'Pairing Bonus', amount: '+₱450.00', color: 'emerald' },
              { date: 'Feb 13, 2025 - 2:20 PM', type: 'Gift Certificate', amount: '+₱250.00', color: 'rose' },
              { date: 'Feb 12, 2025 - 11:10 AM', type: 'Payout', amount: '+₱1,200.00', color: 'blue' },
              { date: 'Feb 11, 2025 - 8:30 PM', type: 'Pairing Bonus', amount: '+₱380.00', color: 'emerald' },
            ].map((payout, idx) => (
              <div key={idx} className={`p-3 bg-${payout.color}-50 rounded border border-${payout.color}-200`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-xs font-medium text-${payout.color}-900 flex items-center gap-2`}>
                      <Clock className="w-3 h-3" />
                      {payout.date}
                    </p>
                    <p className={`text-sm font-medium text-${payout.color}-900 mt-1`}>{payout.type}</p>
                  </div>
                  <p className={`text-lg font-bold text-${payout.color}-900 whitespace-nowrap ml-2`}>{payout.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    const contents: Record<string, React.ReactElement> = {
      genealogy: <Genealogy />,
      'generate-pin': <div className="text-center py-12"><p className="text-gray-600">Generate PIN view coming soon</p></div>,
      'generate-free-code': <div className="text-center py-12"><p className="text-gray-600">Generate Free Code view coming soon</p></div>,
      'all-generated-pin': <div className="text-center py-12"><p className="text-gray-600">All Generated PIN view coming soon</p></div>,
      'withdrawal-gc-approval': <div className="text-center py-12"><p className="text-gray-600">Withdrawal GC Approval view coming soon</p></div>,
      'package-requests': <div className="text-center py-12"><p className="text-gray-600">Package Requests view coming soon</p></div>,
      'approve-withdrawals': <div className="text-center py-12"><p className="text-gray-600">Approve Withdrawals view coming soon</p></div>,
      'withdrawal-history': <div className="text-center py-12"><p className="text-gray-600">Withdrawal History view coming soon</p></div>,
      'member-balances': <div className="text-center py-12"><p className="text-gray-600">Member Balances view coming soon</p></div>,
      'withdraw-gift-certificate': <div className="text-center py-12"><p className="text-gray-600">Withdraw Gift Certificate view coming soon</p></div>,
      'unilevel-product-request': <div className="text-center py-12"><p className="text-gray-600">Unilevel Product Request view coming soon</p></div>,
      'unilevel-monthly-subscription': <div className="text-center py-12"><p className="text-gray-600">Unilevel Monthly Subscription view coming soon</p></div>,
      'reports': <div className="text-center py-12"><p className="text-gray-600">Reports view coming soon</p></div>,
    };
    return contents[activeTab] || <div></div>;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Apple Inspired */}
      <div
        className={`fixed lg:static inset-y-0 left-0 bg-white text-gray-900 sidebar-smooth z-40 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
          } overflow-hidden border-r border-gray-100`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h1 className={`text-xl text-gray-900 ${sidebarOpen ? 'block' : 'hidden'}`}>
              CoProfitGlobal.
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className={`w-5 h-5 text-gray-600 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    } ${sidebarOpen ? 'justify-start' : 'justify-center lg:justify-center'}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className={`border-t border-gray-100 p-4 space-y-3 ${sidebarOpen ? 'block' : 'hidden lg:flex lg:flex-col'}`}>
            <button
              onClick={() => setProfileModalOpen(true)}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition active:bg-gray-100 ${sidebarOpen ? 'w-full' : 'w-full lg:justify-center'}`}
            >
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-yellow-500">{profilePicture}</span>
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">CoProfit - Admin</p>
                  <p className="text-xs text-gray-500 truncate">coprofitadmin@gmail.com</p>
                </div>
              )}
            </button>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Logout</span>
              </button>
            )}
            {!sidebarOpen && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' ? renderDashboardContent() : renderTabContent()}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
} 