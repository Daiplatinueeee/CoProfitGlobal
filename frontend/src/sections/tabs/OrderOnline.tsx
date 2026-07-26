import { useCallback, useEffect, useState } from 'react';
import {
  ShoppingBag, ShoppingCart, Plus, Minus, X, Trash2,
  CheckCircle, MapPin, Phone, User, CreditCard, Truck,
  Package, History, Clock, XCircle, CalendarClock, AlertCircle, Search,
} from 'lucide-react';

import { apiFetch } from '../../lib/apiFetch';
import { useCart } from '../landingSections/cartContents/cartContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

import pk1 from '../../assets/pk1.jpg';
import pk2 from '../../assets/pk2.jpg';
import pk3 from '../../assets/pk3.jpg';
import pk4 from '../../assets/pk1.jpeg';
import pk5 from '../../assets/pk5.jpg';
import pk6 from '../../assets/pk6.jpg';
import pk7 from '../../assets/pk8.jpg';
import pk8 from '../../assets/pk7.jpg';
import prod1 from '../../assets/prod2.jpeg';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Perfume {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
}

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
  items: OrderLineItem[];
  total: number;
  fullName: string;
  contactNumber: string;
  address: string;
  paymentMethod: PaymentMethodId;
  paymentAccountName: string;
  paymentAccountNumber: string;
  status: OrderStatus;
  createdAt: string;
}

type MainTab = 'shop' | 'current' | 'history';

// ─── Catalogue ────────────────────────────────────────────────────────────────

const PERFUMES: Perfume[] = [
  { id: 'pk-bronze-a', name: 'Bronze Package A', price: 1998, image: pk4, category: 'Bronze', description: 'Entry-level fragrance set — a great starting collection.' },
  { id: 'pk-silver-a', name: 'Silver Package A', price: 5998, image: pk8, category: 'Silver', description: 'A richer scent collection for everyday wear.' },
  { id: 'pk-gold-a', name: 'Gold Package A', price: 8998, image: pk6, category: 'Gold', description: 'Premium fragrance bundle with signature scents.' },
  { id: 'pk-platinum-a', name: 'Platinum Package A', price: 12998, image: pk1, category: 'Platinum', description: 'Our top-tier fragrance collection, fully loaded.' },
  { id: 'pk-bronze-b', name: 'Bronze Package B', price: 1998, image: pk3, category: 'Bronze', description: 'Entry-level fragrance set — a great starting collection.' },
  { id: 'pk-silver-b', name: 'Silver Package B', price: 5998, image: pk7, category: 'Silver', description: 'A richer scent collection for everyday wear.' },
  { id: 'pk-gold-b', name: 'Gold Package B', price: 8998, image: pk5, category: 'Gold', description: 'Premium fragrance bundle with signature scents.' },
  { id: 'pk-platinum-b', name: 'Platinum Package B', price: 12998, image: pk2, category: 'Platinum', description: 'Our top-tier fragrance collection, fully loaded.' },
  { id: 'relieflex-oil', name: 'RelieFlex Liniment Oil', price: 1500, image: prod1, category: 'Individual', description: 'Best-selling standalone item from our catalogue.' },
];

const CATEGORY_STYLES: Record<string, string> = {
  Bronze: 'bg-amber-50 text-amber-700 ring-amber-200',
  Silver: 'bg-slate-100 text-slate-600 ring-slate-200',
  Gold: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  Platinum: 'bg-violet-50 text-violet-700 ring-violet-200',
  Individual: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const PAYMENT_METHODS = [
  { id: 'gcash', label: 'GCash' },
  { id: 'paymaya', label: 'PayMaya' },
  { id: 'cod', label: 'Cash on Delivery' },
] as const;

type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  gcash: 'GCash',
  paymaya: 'PayMaya',
  cod: 'Cash on Delivery',
};

const PAYMENT_ACCOUNT_LABELS: Partial<Record<PaymentMethodId, { name: string; number: string }>> = {
  gcash: { name: 'GCash Name', number: 'GCash Number' },
  paymaya: { name: 'PayMaya Name', number: 'PayMaya Number' },
};

function formatPrice(n: number) {
  return `₱${n.toLocaleString('en-PH')}`;
}

function orderNumber(order: Order) {
  return order.id.slice(-6).toUpperCase();
}

function matchesOrderSearch(order: Order, query: string) {
  const normalized = query.trim().toUpperCase().replace(/^ORDER\s*/, '').replace(/#/g, '');
  if (!normalized) return true;
  return orderNumber(order).includes(normalized);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderOnline() {
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

  const [activeTab, setActiveTab] = useState<MainTab>('shop');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('gcash');
  const [paymentAccountName, setPaymentAccountName] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const fetchOrders = useCallback(() => {
    setOrdersLoading(true);
    apiFetch(`${API_BASE_URL}/order-online/my`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const perfumeIds = new Set(PERFUMES.map(p => p.id));
  const orderCartItems = cartItems.filter(i => perfumeIds.has(String(i.id)));
  const cartCount = orderCartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = orderCartItems.reduce((sum, i) => {
    const price = parseFloat(String(i.price).replace(/[^0-9.]/g, '')) || 0;
    return sum + price * i.quantity;
  }, 0);

  const currentOrders = orders
    .filter(o => o.status === 'pending' || o.status === 'shipping')
    .filter(o => matchesOrderSearch(o, orderSearch));
  const pastOrders = orders
    .filter(o => o.status === 'completed' || o.status === 'cancelled')
    .filter(o => matchesOrderSearch(o, orderSearch));

  const handleAddToCart = (perfume: Perfume, e: React.MouseEvent) => {
    addToCart({
      id: perfume.id,
      name: perfume.name,
      price: formatPrice(perfume.price),
      image: perfume.image,
      category: perfume.category,
    }, e);
  };

  const needsPaymentAccount = paymentMethod === 'gcash' || paymentMethod === 'paymaya';

  const handlePlaceOrder = async () => {
    if (!fullName.trim() || !contactNumber.trim() || !address.trim()) return;
    if (needsPaymentAccount && (!paymentAccountName.trim() || !paymentAccountNumber.trim())) return;

    setPlacingOrder(true);
    setCheckoutError('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/order-online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderCartItems.map(i => ({
            productId: String(i.id),
            name: i.name,
            price: parseFloat(String(i.price).replace(/[^0-9.]/g, '')) || 0,
            image: i.image,
            quantity: i.quantity,
          })),
          fullName: fullName.trim(),
          contactNumber: contactNumber.trim(),
          address: address.trim(),
          paymentMethod,
          ...(needsPaymentAccount && {
            paymentAccountName: paymentAccountName.trim(),
            paymentAccountNumber: paymentAccountNumber.trim(),
          }),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message ?? 'Failed to place order. Please try again.');
      }
      const created: Order = await res.json();
      setOrders(prev => [created, ...prev]);
      setOrderPlaced(true);
      orderCartItems.forEach(item => removeFromCart(item.id));
    } catch (err: any) {
      setCheckoutError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setOrderPlaced(false);
    setCheckoutError('');
    setFullName('');
    setContactNumber('');
    setAddress('');
    setPaymentMethod('gcash');
    setPaymentAccountName('');
    setPaymentAccountNumber('');
  };

  const markAsReceived = async (id: string) => {
    const res = await apiFetch(`${API_BASE_URL}/order-online/${id}/received`, { method: 'PATCH' });
    if (res.ok) {
      const updated: Order = await res.json();
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    }
  };

  const cancelOrder = async (id: string) => {
    const res = await apiFetch(`${API_BASE_URL}/order-online/${id}/cancel`, { method: 'PATCH' });
    if (res.ok) {
      const updated: Order = await res.json();
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'shop', label: 'Shop', icon: <ShoppingBag size={13} /> },
    { id: 'current', label: 'Current Orders', icon: <Clock size={13} /> },
    { id: 'history', label: 'Order History', icon: <History size={13} /> },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SHOP PANEL ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const ShopPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Available Products</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {PERFUMES.length} product{PERFUMES.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200 px-3 py-1 rounded-full">
          <ShoppingBag size={11} />
          Perfume Catalogue
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6">
        {PERFUMES.map(perfume => {
          const inCartItem = orderCartItems.find(i => i.id === perfume.id);
          return (
            <div key={perfume.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
              <div className="aspect-video overflow-hidden bg-slate-100">
                <img src={perfume.image} alt={perfume.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex flex-col flex-1 gap-2">
                <span className={`self-start inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${CATEGORY_STYLES[perfume.category] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                  {perfume.category}
                </span>
                <p className="text-sm font-semibold text-slate-900">{perfume.name}</p>
                <p className="text-xs text-slate-400 line-clamp-2">{perfume.description}</p>
                <p className="text-sm font-bold text-slate-800 mt-auto">{formatPrice(perfume.price)}</p>

                {inCartItem ? (
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                    <button
                      onClick={() => updateQuantity(perfume.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-xs font-semibold text-slate-700">{inCartItem.quantity} in cart</span>
                    <button
                      onClick={() => updateQuantity(perfume.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => handleAddToCart(perfume, e)}
                    className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium py-2.5 rounded-lg transition-colors"
                  >
                    <ShoppingCart size={12} />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ORDER CARD (shared by Current + History) ─────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

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
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{order.address}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <CreditCard size={11} className="shrink-0" />
          <span>
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
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
            onClick={() => cancelOrder(order.id)}
            className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        {order.status === 'shipping' && (
          <button
            onClick={() => markAsReceived(order.id)}
            className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Mark as Received
          </button>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ORDER SEARCH BAR (shared by Current + History) ────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const OrderSearchBar = () => (
    <div className="relative mb-5 max-w-sm">
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
      <input
        type="text"
        value={orderSearch}
        onChange={e => setOrderSearch(e.target.value)}
        placeholder="Search Order # (e.g. F95E22)"
        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
      />
      {orderSearch && (
        <button
          onClick={() => setOrderSearch('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── CURRENT ORDERS PANEL ───────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const CurrentOrdersPanel = () => (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">Current Orders</h2>
        <p className="text-xs text-slate-400 mt-0.5">Orders awaiting acceptance and orders currently shipping</p>
      </div>

      <OrderSearchBar />

      {ordersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : currentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
            <Package size={28} className="text-slate-200" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            {orderSearch ? 'No matching orders' : 'No orders in progress'}
          </p>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            {orderSearch
              ? <>No order found matching "{orderSearch}".</>
              : 'Orders you place from the Shop tab will show up here until they\'re delivered.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentOrders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ORDER HISTORY PANEL ────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const OrderHistoryPanel = () => (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">Order History</h2>
        <p className="text-xs text-slate-400 mt-0.5">Completed and cancelled orders</p>
      </div>

      <OrderSearchBar />

      {ordersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : pastOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
            <History size={28} className="text-slate-200" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            {orderSearch ? 'No matching orders' : 'No past orders yet'}
          </p>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            {orderSearch
              ? <>No order found matching "{orderSearch}".</>
              : 'Orders marked as received or cancelled will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastOrders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ROOT RENDER ───────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-white min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* ── Page Header ── */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Order Online
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Browse our perfume catalogue and order directly — pay online and we'll arrange delivery.
            </p>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="relative shrink-0 flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-xs sm:text-sm font-medium px-3.5 sm:px-4 py-2.5 rounded-xl transition-colors"
          >
            <ShoppingCart size={15} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab navigation ── */}
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
              {tab.id === 'current' && currentOrders.length > 0 && (
                <span className="ml-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 ring-1 ring-blue-100 px-1.5 py-0.5 rounded-full">
                  {currentOrders.length}
                </span>
              )}
              {tab.id === 'history' && pastOrders.length > 0 && (
                <span className="ml-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 ring-1 ring-slate-200 px-1.5 py-0.5 rounded-full">
                  {pastOrders.length}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'shop' && <ShopPanel />}
        {activeTab === 'current' && <CurrentOrdersPanel />}
        {activeTab === 'history' && <OrderHistoryPanel />}
      </div>

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setCartOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Your Cart</h3>
              <button onClick={() => setCartOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {orderCartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <ShoppingCart size={32} className="text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Your cart is empty</p>
                  <p className="text-xs text-slate-400 mt-1">Add products to get started</p>
                </div>
              ) : (
                orderCartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.price}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:text-slate-800">
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-medium text-slate-700 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:text-slate-800">
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {orderCartItems.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">Subtotal</span>
                  <span className="text-base font-bold text-slate-900">{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
                >
                  <Truck size={14} />
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {!orderPlaced ? (
              <>
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Checkout</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Total: {formatPrice(cartTotal)}</p>
                  </div>
                  <button onClick={closeCheckout} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <User size={11} /> Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <Phone size={11} /> Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={e => setContactNumber(e.target.value)}
                      placeholder="09XX-XXX-XXXX"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <MapPin size={11} /> Delivery Address
                    </label>
                    <textarea
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="House No., Street, Barangay, City"
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <CreditCard size={11} /> Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(pm => (
                        <button
                          key={pm.id}
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`text-xs font-medium py-2.5 rounded-xl border-2 transition-all ${
                            paymentMethod === pm.id ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {needsPaymentAccount && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                          <User size={11} /> {PAYMENT_ACCOUNT_LABELS[paymentMethod]?.name}
                        </label>
                        <input
                          type="text"
                          value={paymentAccountName}
                          onChange={e => setPaymentAccountName(e.target.value)}
                          placeholder={`Enter ${PAYMENT_ACCOUNT_LABELS[paymentMethod]?.name.toLowerCase()}`}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                          <Phone size={11} /> {PAYMENT_ACCOUNT_LABELS[paymentMethod]?.number}
                        </label>
                        <input
                          type="tel"
                          value={paymentAccountNumber}
                          onChange={e => setPaymentAccountNumber(e.target.value)}
                          placeholder="09XX-XXX-XXXX"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
                        />
                      </div>
                    </>
                  )}
                </div>

                {checkoutError && (
                  <div className="mx-6 mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle size={13} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{checkoutError}</p>
                  </div>
                )}

                <div className="px-6 pb-6 pt-4 flex gap-3 shrink-0 border-t border-slate-100">
                  <button onClick={closeCheckout} disabled={placingOrder} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={
                      !fullName.trim() || !contactNumber.trim() || !address.trim() || placingOrder ||
                      (needsPaymentAccount && (!paymentAccountName.trim() || !paymentAccountNumber.trim()))
                    }
                    className="flex-1 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                  >
                    {placingOrder ? 'Placing Order…' : 'Place Order'}
                  </button>
                </div>
              </>
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Order Placed!</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Thank you, {fullName}. Our team will reach out to {contactNumber} shortly to confirm your {paymentMethod === 'cod' ? 'delivery' : 'payment'} and delivery details. Track it under <span className="font-semibold text-slate-600">Current Orders</span>.
                </p>
                <button
                  onClick={() => { closeCheckout(); setActiveTab('current'); }}
                  className="mt-6 w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  View Current Orders
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
