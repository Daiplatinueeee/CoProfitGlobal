import React, { useState, useMemo, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, LogOut, ChevronLeft, Users, ClipboardClock, Tag, Trophy, PackageCheck, ShoppingBag, FileText } from 'lucide-react';

import GeneratePin from '../tabs/GeneratePin';
import GenerateProductPin from '../tabs/GenerateProductPin';
import UsersOverview from '../tabs/UsersOverview';
import PendingPayouts from '../tabs/PendingPayouts';
import PayoutReport from '../tabs/PayoutReport';
import PendingWithdrawGC from '../tabs/PendingWithdrawGC';
import Leaderboards from '../tabs/Leaderboards';
import PendingRequests from '../tabs/PendingRequests';
import PendingUnilevelPackages from '../tabs/PendingUnilevelPackages';
import AdminOrders from '../tabs/AdminOrders';
import MaintenanceControl from '../tabs/MaintenanceControl';

/* ── Main dashboard component ── */
export default function AdminDashboard() {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  // Only meaningful for regular ADMIN — SUPER_ADMIN uses the sidebar-free
  // early-return render path below and never reads activeTab.
  const [activeTab, setActiveTab] = useState('generate-pin');

  const lastPeriodKey = useRef<string | null>(null);
  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/pairing/current-period`);
        if (!res.ok) return;
        const { periodKey } = await res.json();
        if (lastPeriodKey.current && lastPeriodKey.current !== periodKey) {
          window.dispatchEvent(new CustomEvent('cycle:changed'));
        }
        lastPeriodKey.current = periodKey;
      } catch { /* silently ignore network errors */ }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  // Role isn't exposed via AuthContext in this app — every component that
  // needs it reads the same localStorage 'user' blob Auth.tsx wrote at login
  // (see Auth.tsx handleLogin). SUPER_ADMIN gets an entirely separate,
  // sidebar-free render path below (just Maintenance Mode + logout) — the
  // menuItems/renderTabContent below are only ever reached by regular ADMIN,
  // even though RolesGuard grants SUPER_ADMIN full ADMIN API access underneath.
  const isSuperAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.role === 'super_admin';
    } catch {
      return false;
    }
  }, []);

  const menuItems = useMemo(() => [
    { id: 'generate-pin', label: 'Generate Package PIN', icon: Lock },
    { id: 'product-pins', label: 'Generate Product PIN', icon: Tag },
    { id: 'users', label: 'Users Overview', icon: Users },
    { id: 'pendingPayouts', label: 'Pending Payouts', icon: ClipboardClock },
    { id: 'payoutReport', label: 'Payout Report', icon: FileText },
    { id: 'pendingWithdrawGC', label: 'Pending Withdrawals (GC)', icon: ClipboardClock },
    { id: 'pendingRequests', label: 'Pending Requests', icon: ClipboardClock },
    { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
    { id: 'unilevel-packages', label: 'Unilevel Packages', icon: PackageCheck },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
  ], []);

  const renderTabContent = () => {
    const map: Record<string, React.ReactElement> = {
      'generate-pin': <GeneratePin />,
      'product-pins': <GenerateProductPin />,
      'users': <UsersOverview />,
      'pendingPayouts': <PendingPayouts />,
      'payoutReport': <PayoutReport />,
      'pendingWithdrawGC': <PendingWithdrawGC />,
      'pendingRequests': <PendingRequests />,
      'leaderboards': <Leaderboards />,
      'unilevel-packages': <PendingUnilevelPackages />,
      'orders': <AdminOrders />,
    };
    return map[activeTab] ?? <div />;
  };

  const handleLogout = logout;

  // Super admin gets a dedicated, sidebar-free layout — just the Maintenance
  // Mode panel and a logout button, since it's a single-purpose account.
  if (isSuperAdmin) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
          <h1 className="text-lg sm:text-xl text-gray-900">CoProfitGlobalCorp.</h1>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <MaintenanceControl />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">

      {/* ── Sidebar ── */}
      <div className={`fixed lg:static inset-y-0 left-0 bg-white text-gray-900 z-40 transition-all duration-300 overflow-hidden border-r border-gray-100 shrink-0 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'}`}>
        <div className="flex flex-col h-full">

          {/* logo */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between min-w-[256px]">
            <h1 className={`text-xl text-gray-900 ${sidebarOpen ? 'block' : 'hidden'}`}>
              CoProfitGlobalCorp.
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {/* X on mobile when open, chevron on desktop */}
              <span className="lg:hidden">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <span className="hidden lg:block">
                <ChevronLeft className={`w-5 h-5 text-gray-600 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
          </div>

          {/* nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 min-w-[256px] lg:min-w-0">
            {menuItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${activeTab === id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="text-sm">{label}</span>}
              </button>
            ))}
          </nav>

          <div className={`border-t border-gray-100 p-4 space-y-3 min-w-[256px] lg:min-w-0 ${sidebarOpen ? 'block' : 'hidden lg:flex lg:flex-col'}`}>

            {sidebarOpen ? (
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            ) : (
              <button onClick={handleLogout} className="w-full flex items-center justify-center p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                <LogOut className="w-4 h-4" />
              </button>
            )}
            {/* Copyright Footer */}
            <div className="px-4 py-2.5 bg-transparent text-center">
              <p className="text-[12px] text-gray-400 text-center leading-relaxed">
                v1.0.1 &nbsp;·&nbsp; © 2026 CoProfitGlobal.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700">
            {menuItems.find(m => m.id === activeTab)?.label ?? 'Dashboard'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}