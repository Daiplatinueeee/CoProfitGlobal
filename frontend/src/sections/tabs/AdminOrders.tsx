import { useCallback, useEffect, useState } from 'react';
import {
  Package, Clock, Truck, CheckCircle, XCircle, CalendarClock,
  MapPin, Phone, CreditCard, ShoppingBag, Search, X,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

type OrderStatus = 'pending' | 'shipping' | 'completed' | 'cancelled';

interface Order {
  id: string;
  userId: string;
  items: OrderLineItem[];
  total: number;
  fullName: string;
  contactNumber: string;
  address: string;
  paymentMethod: string;
  paymentAccountName: string;
  paymentAccountNumber: string;
  status: OrderStatus;
  createdAt: string;
}

type FilterTab = 'pending' | 'shipping' | 'completed';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gcash: 'GCash',
  paymaya: 'PayMaya',
  cod: 'Cash on Delivery',
};

function formatPrice(n: number) {
  return `₱${n.toLocaleString('en-PH')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function orderNumber(order: Order) {
  return order.id.slice(-6).toUpperCase();
}

function matchesOrderSearch(order: Order, query: string) {
  const normalized = query.trim().toUpperCase().replace(/^ORDER\s*/, '').replace(/#/g, '');
  if (!normalized) return true;
  return orderNumber(order).includes(normalized) || order.fullName.toUpperCase().includes(normalized);
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    apiFetch(`${API_BASE_URL}/order-online/all`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const shippingOrders = orders.filter(o => o.status === 'shipping');
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  const handleAccept = async (id: string) => {
    setActionError('');
    setAcceptingId(id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/order-online/${id}/accept`, { method: 'PATCH' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json?.message ?? 'Failed to accept order.');
      } else {
        await fetchOrders();
      }
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  const statusBadge = (status: OrderStatus) => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 ring-1 ring-amber-200 px-2.5 py-0.5 rounded-full">
          <CalendarClock size={11} /> Pending
        </span>
      );
    }
    if (status === 'shipping') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 ring-1 ring-blue-200 px-2.5 py-0.5 rounded-full">
          <Truck size={11} /> Shipping
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2.5 py-0.5 rounded-full">
          <CheckCircle size={11} /> Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 ring-1 ring-red-200 px-2.5 py-0.5 rounded-full">
        <XCircle size={11} /> Cancelled
      </span>
    );
  };

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'pending', label: 'Pending Orders', icon: <Clock size={13} />, count: pendingOrders.length },
    { id: 'shipping', label: 'Shipping Orders', icon: <Truck size={13} />, count: shippingOrders.length },
    { id: 'completed', label: 'Completed Orders', icon: <CheckCircle size={13} />, count: completedOrders.length },
  ];

  const visibleOrders = (activeTab === 'pending' ? pendingOrders : activeTab === 'shipping' ? shippingOrders : completedOrders)
    .filter(order => matchesOrderSearch(order, search));

  const OrderCard = ({ order }: { order: Order }) => (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div>
          <p className="text-xs font-semibold text-slate-700">Order #{orderNumber(order)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        {statusBadge(order.status)}
      </div>

      <div className="px-5 py-4 space-y-2.5">
        {order.items.map(item => (
          <div key={item.productId} className="flex items-center gap-3">
            <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
              <p className="text-[11px] text-slate-400">{formatPrice(item.price)} × {item.quantity}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 pb-4 space-y-1.5 border-t border-dashed border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-700">{order.fullName}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Phone size={11} className="shrink-0" />
          <span>{order.contactNumber}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{order.address}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <CreditCard size={11} className="shrink-0" />
          <span>
            {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
            {order.paymentAccountName && order.paymentAccountNumber && (
              <> — {order.paymentAccountName} ({order.paymentAccountNumber})</>
            )}
          </span>
        </div>
      </div>

      <div className="px-5 pb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">{formatPrice(order.total)}</span>
        {order.status === 'pending' && (
          <button
            onClick={() => handleAccept(order.id)}
            disabled={acceptingId === order.id}
            className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            {acceptingId === order.id ? 'Accepting…' : 'Accept Order'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Orders</h1>
            <p className="text-sm text-slate-400 mt-1">Manage online orders placed by members</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200 px-3 py-1 rounded-full shrink-0">
            <ShoppingBag size={11} />
            {orders.length} total order{orders.length !== 1 ? 's' : ''}
          </span>
        </div>

        {actionError && (
          <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Pending', value: pendingOrders.length, sub: 'Awaiting acceptance' },
            { label: 'Shipping', value: shippingOrders.length, sub: 'Currently out for delivery' },
            { label: 'Completed', value: completedOrders.length, sub: 'Received or cancelled' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative mb-5 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Order # (e.g. F95E22)"
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-0 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 ring-1 ring-slate-200 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Orders grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3">
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-8 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
              <Package size={28} className="text-slate-200" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              {search ? 'No matching orders' : 'No orders here'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              {search ? (
                <>No order found matching "{search}" in this tab.</>
              ) : (
                <>
                  {activeTab === 'pending' && 'New orders from members will show up here awaiting acceptance.'}
                  {activeTab === 'shipping' && 'Accepted orders currently being delivered will show up here.'}
                  {activeTab === 'completed' && 'Received and cancelled orders will show up here.'}
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </div>
  );
}
