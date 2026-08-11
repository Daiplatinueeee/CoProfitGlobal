import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import {
  CheckCircle, AlertCircle, KeyRound, ShoppingBag,
  Lock, ShieldCheck, Sparkles,
  ArrowRight, Upload, X, Clock,
  XCircle, CalendarClock,
} from 'lucide-react';

import defaultProductImg from '../../assets/logoWithName.png';
import sampleProducts from './json/unilevel.products.data.json';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiProduct {
  _id: string;
  name: string;
  price: number;
  pv: number;
  description: string;
  imageUrl: string;
  features: string[];
  status: 'active' | 'inactive';
}

interface PvStatus {
  monthKey: string;
  totalPv: number;
  availablePv: number;
  totalPrice: number;
  threshold: number;
  qualified: boolean;
}

function resolveImage(imageUrl: string): string {
  return imageUrl && imageUrl.trim() !== '' ? imageUrl : defaultProductImg;
}

// ─── PIN format validator: 3 uppercase letters + 3 digits ─────────────────────
function formatPinInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = cleaned.replace(/[^A-Z]/g, '').slice(0, 3);
  const digits = cleaned.replace(/[^0-9]/g, '').slice(0, 3);
  return letters + digits;
}

function isPinValid(pin: string): boolean {
  return /^[A-Z]{3}[0-9]{3}$/.test(pin);
}

// ─── Package features list ────────────────────────────────────────────────────
const PACKAGE_FEATURES = [
  'Access to all Unilevel products',
  'Earn PV on every purchase',
  'Leadership Bonus qualification',
  'Lifestyle Rewards redemption',
  'Monthly coupon benefits',
  'Priority member support',
];

// ─── Payment Modal ────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: 'gcash' as const,   label: 'GCash',         emoji: '💙', account: '09XX-XXX-XXXX', bg: 'bg-blue-50',  ring: 'ring-blue-400',  text: 'text-blue-700'  },
  { id: 'paymaya' as const, label: 'PayMaya',        emoji: '💚', account: '09XX-XXX-XXXX', bg: 'bg-green-50', ring: 'ring-green-400', text: 'text-green-700' },
  { id: 'cash' as const,    label: 'Cash on Hand',  emoji: '💵', account: null,            bg: 'bg-amber-50', ring: 'ring-amber-400', text: 'text-amber-700' },
] as const;

type PaymentMethodId = 'gcash' | 'paymaya' | 'cash';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethodId>('gcash');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setMethod('gcash'); setFile(null); setPreview(null); setError(''); setSubmitting(false); };

  const handleClose = () => { reset(); onClose(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (method !== 'cash' && !file) { setError('Please attach your proof of payment.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('paymentMethod', method);
      formData.append('amount', '1500');
      if (file) formData.append('proof', file);
      const res = await apiFetch(`${API_BASE_URL}/unilevel-products/purchase-request`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message ?? 'Submission failed. Please try again.');
      }
      reset();
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === method)!;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Purchase Unilevel Package</h2>
            <p className="text-xs text-slate-400 mt-0.5">₱1,500 · One-time activation · Pending admin review</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Mode of Payment</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setMethod(pm.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                    method === pm.id ? `border-slate-900 ${pm.bg}` : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xl">{pm.emoji}</span>
                  <span className={`text-xs font-semibold leading-tight text-center ${method === pm.id ? pm.text : 'text-slate-500'}`}>
                    {pm.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Account info */}
            {selectedMethod.account && (
              <div className={`mt-3 flex items-center gap-3 px-4 py-3 rounded-xl ${selectedMethod.bg} border ${method === 'gcash' ? 'border-blue-100' : 'border-green-100'}`}>
                <span className="text-lg">{selectedMethod.emoji}</span>
                <div>
                  <p className={`text-xs font-semibold ${selectedMethod.text}`}>{selectedMethod.label} Number</p>
                  <p className="text-sm font-mono font-bold text-slate-800">{selectedMethod.account}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Send exactly <span className="font-semibold text-slate-700">₱1,500</span> and attach the screenshot below</p>
                </div>
              </div>
            )}
            {method === 'cash' && (
              <div className="mt-3 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  For cash payments, coordinate directly with your admin or upline. You may optionally attach a receipt or note.
                </p>
              </div>
            )}
          </div>

          {/* Proof upload */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              Proof of Payment
              {method === 'cash' && <span className="ml-1 font-normal text-slate-400 normal-case">(optional for cash)</span>}
            </p>

            {!preview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-7 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all group"
              >
                <Upload size={24} className="mx-auto mb-2 text-slate-300 group-hover:text-slate-400 transition-colors" />
                <p className="text-sm font-medium text-slate-500">Click to upload screenshot</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF — max 10 MB</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                <img src={preview} alt="Proof of payment" className="w-full max-h-52 object-contain bg-slate-50" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <button
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md border border-slate-200 text-slate-500 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-white/90 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 truncate">{file?.name}</span>
                  </div>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex gap-3 shrink-0 border-t border-slate-100">
          <button onClick={handleClose} disabled={submitting} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? 'Submitting…' : <>Submit for Review <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UnilevelProducts() {
  // ── Purchase state ────────────────────────────────────────────────────────
  const [hasPurchased, setHasPurchased] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState('');
  // monthKey of when the package was approved — overdue only kicks in the month after
  const [purchaseMonthKey, setPurchaseMonthKey] = useState<string | null>(null);

  // ── Core data ─────────────────────────────────────────────────────────────
  const [products] = useState<ApiProduct[]>(sampleProducts as ApiProduct[]);
  const [pvStatus, setPvStatus] = useState<PvStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // ── PIN redemption ────────────────────────────────────────────────────────
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const refreshPv = useCallback(() => {
    return apiFetch(`${API_BASE_URL}/unilevel-products/my/pv-status`)
      .then(r => r.json())
      .then(pvJson => setPvStatus(pvJson?.monthKey ? pvJson : null));
  }, []);

  const refreshData = useCallback(() => {
    setLoading(true);
    refreshPv().catch(() => { }).finally(() => setLoading(false));
  }, [refreshPv]);

  const fetchPurchaseStatus = useCallback(() => {
    apiFetch(`${API_BASE_URL}/unilevel-products/my/purchase-status`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.status === 'approved') {
          setHasPurchased(true);
          setRequestStatus('approved');
          if (data?.approvedAt) {
            const d = new Date(data.approvedAt);
            setPurchaseMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }
        } else if (data?.status === 'pending') {
          setRequestStatus('pending');
        } else if (data?.status === 'rejected') {
          setRequestStatus('rejected');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshData(); fetchPurchaseStatus(); }, [refreshData, fetchPurchaseStatus]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const currentPv = pvStatus?.totalPv ?? 0;
  const availablePv = pvStatus?.availablePv ?? 0;
  // ₱ actually spent this month (product price, not PV) — price and PV are not
  // 1:1 per product, so PV alone can't stand in for the peso amount required.
  const currentSpend = pvStatus?.totalPrice ?? 0;

  // ── Monthly requirement ───────────────────────────────────────────────────
  const MONTHLY_PRICE_REQUIRED = 1500;
  const DEADLINE_DAY = 15;
  const today = new Date();
  const dayOfMonth = today.getDate();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  // Overdue only applies starting the month AFTER purchase — no penalty in the purchase month
  const isFirstPurchaseMonth = purchaseMonthKey === currentMonthKey;
  const isPastDeadline = dayOfMonth > DEADLINE_DAY && !isFirstPurchaseMonth;
  const daysUntilDeadline = DEADLINE_DAY - dayOfMonth;
  const monthlyRequirementMet = currentSpend >= MONTHLY_PRICE_REQUIRED;
  const monthName = today.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  // Past the 15th without hitting the ₱ requirement — collapses the whole store
  // down to just the product catalogue + Redeem Product PIN (see LockedStoreView
  // below). PIN redemption stays fully active since it's the only mechanism that
  // increases this month's ₱ total — locking it too would make recovery
  // impossible. The lock lifts automatically the moment currentSpend crosses
  // MONTHLY_PRICE_REQUIRED.
  const isLockedOut = isPastDeadline && !monthlyRequirementMet;

  // ── Monthly PV cap progress ───────────────────────────────────────────────
  const PV_MONTHLY_CAP = 5000;
  const pctProgress = PV_MONTHLY_CAP > 0 ? Math.min(100, Math.round((currentPv / PV_MONTHLY_CAP) * 100)) : 0;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRedeemPin = async () => {
    // Intentionally NOT gated on isLockedOut — PIN redemption is the only
    // mechanism that increases this month's ₱ total, so it must stay active
    // even while the rest of the store is restricted; otherwise recovery
    // from the locked state would be impossible.
    const pin = pinInput.trim().toUpperCase();
    if (!isPinValid(pin)) {
      setPinError('PIN must be 3 uppercase letters followed by 3 digits (e.g. ABC123).');
      return;
    }
    setPinLoading(true);
    setPinError('');
    setPinSuccess('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/unilevel-products/redeem-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'PIN redemption failed');
      setPinInput('');
      setPinSuccess(json?.message ?? 'PIN redeemed successfully!');
      refreshPv();
    } catch (err: any) {
      setPinError(err.message ?? 'Something went wrong');
    } finally {
      setPinLoading(false);
    }
  };

  const formatPrice = (price: number | null | undefined) =>
    !price ? 'N/A' : price.toLocaleString();

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PURCHASE GATE ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const PurchaseGate = () => (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">

      {/* Locked hero card */}
      <div className="w-full max-w-lg">

        {/* Light package card */}
        <div className="relative bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 mb-6">

          {/* Decorative background rings */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-slate-200/60 pointer-events-none" />
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border border-slate-200/70 pointer-events-none" />

          {/* Lock badge */}
          <div className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Lock size={14} className="text-slate-400" />
          </div>

          <div className="px-7 py-8">
            {/* Label */}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-5">
              <Sparkles size={11} />
              Unilevel Package
            </span>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-400 text-sm font-medium">₱</span>
                <span className="text-5xl font-bold text-slate-900 tracking-tight">1,500</span>
                <span className="text-slate-400 text-sm font-medium self-end mb-1">PHP</span>
              </div>
              <p className="text-slate-400 text-xs mt-1.5">One-time package purchase · unlocks all Unilevel features</p>
            </div>

            {/* Features */}
            <ul className="space-y-2.5 mb-7">
              {PACKAGE_FEATURES.map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <CheckCircle size={9} className="text-emerald-500" />
                  </span>
                  {feat}
                </li>
              ))}
            </ul>

            {/* Status note */}
            {requestStatus === 'pending' ? (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-3">
                <Clock size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-0.5">Purchase request submitted</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your payment is under review. You'll be notified once an admin approves your request and unlocks the package.
                  </p>
                </div>
              </div>
            ) : requestStatus === 'rejected' ? (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-3">
                <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-0.5">Purchase request rejected</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Your last request was not approved. Please verify your payment and resubmit, or contact your admin.
                  </p>
                </div>
              </div>
            ) : purchaseSuccessMsg ? (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 mb-3">
                <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800 mb-0.5">Request submitted!</p>
                  <p className="text-xs text-emerald-700 leading-relaxed">{purchaseSuccessMsg}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-3">
                <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Package not yet activated</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Purchase the ₱1,500 Unilevel Package to unlock the shop, PIN redemption, and lifestyle rewards. Pay via GCash, PayMaya, or cash — then submit your proof for admin review.
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            {requestStatus === 'pending' ? (
              <button disabled className="w-full flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-400 text-sm font-medium py-3 rounded-xl cursor-not-allowed">
                <Clock size={14} />
                Pending Admin Review…
              </button>
            ) : (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
              >
                {requestStatus === 'rejected' ? 'Resubmit Payment' : 'Purchase Package'}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SHOP PANEL ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const ShopPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Available Products</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''} available`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200 px-3 py-1 rounded-full">
          <ShoppingBag size={11} />
          Product Catalogue
        </span>
      </div>

      {/* ── Table (untouched) ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Product Name
              </th>
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">
                Description
              </th>
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                Features
              </th>
              <th className="text-left px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Price
              </th>
              <th className="text-center px-3 sm:px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                PV
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">Loading…</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                      <ShoppingBag size={18} />
                    </div>
                    <p className="text-slate-400 text-sm">No products available yet</p>
                    <p className="text-slate-300 text-xs">Products will appear here</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product._id} className="hover:bg-slate-50 transition-colors duration-150">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={resolveImage(product.imageUrl)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="font-medium text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                        {product.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                    <p className="text-xs text-slate-500 max-w-50 line-clamp-2">{product.description}</p>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                    <div className="flex flex-col gap-0.5">
                      {product.features.slice(0, 3).map((f, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs text-slate-500">
                          <CheckCircle size={9} className="text-emerald-500 shrink-0" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">₱{formatPrice(product.price)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">per unit</p>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                      +{product.pv} PV
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ROOT RENDER ───────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-white min-h-screen">
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {
          setRequestStatus('pending');
          setPurchaseSuccessMsg('Your payment proof has been submitted. An admin will review and approve your request shortly.');
          setPaymentModalOpen(false);
        }}
      />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* ── Page Header ── */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                Unilevel Products
              </h1>
              {hasPurchased && isLockedOut ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 ring-1 ring-red-200 px-2.5 py-0.5 rounded-full">
                  <Lock size={11} />
                  Restricted
                </span>
              ) : hasPurchased ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck size={11} />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 ring-1 ring-slate-200 px-2.5 py-0.5 rounded-full">
                  <Lock size={11} />
                  Locked
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {hasPurchased && isLockedOut
                ? 'Store restricted — redeem a Product PIN to reach ₱1,500 in purchases this month and restore full access'
                : hasPurchased
                ? 'Buy products to earn PV and keep your monthly access active'
                : 'Purchase the ₱1,500 package to unlock all Unilevel features'}
            </p>
          </div>

        </div>

        {/* ── Gate or main content ── */}
        {!hasPurchased ? (
          <PurchaseGate />
        ) : isLockedOut ? (
          <>
            {/* ── Overdue notice ── */}
            <div className="mb-4 flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-red-50 border border-red-200">
              <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-700">Monthly requirement overdue — store restricted</p>
                <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                  The {monthName} deadline (15th) has passed without reaching ₱1,500 in purchases. You need <span className="font-semibold">₱{(MONTHLY_PRICE_REQUIRED - currentSpend).toLocaleString()} more</span> to restore full access. Redeem a Product PIN below to catch up — everything else is locked until then.
                </p>
              </div>
            </div>

            {/* ── Simplified: product catalogue only ── */}
            <div className="mb-6"><ShopPanel /></div>

            {/* ── Redeem Product PIN — the only active action while locked ── */}
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl px-5 sm:px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="shrink-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <KeyRound size={14} className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">Redeem Product PIN</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={pinInput}
                      onChange={e => {
                        setPinInput(formatPinInput(e.target.value));
                        setPinError('');
                        setPinSuccess('');
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleRedeemPin()}
                      placeholder="AAA000"
                      maxLength={6}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-mono text-sm tracking-[0.25em] placeholder:text-slate-300 placeholder:tracking-[0.25em] focus:outline-none focus:ring-2 transition-all uppercase ${pinError ? 'border-red-400 focus:ring-red-200' :
                        pinSuccess ? 'border-emerald-400 focus:ring-emerald-200' :
                          'border-slate-200 focus:ring-slate-300/50'
                        }`}
                    />
                    {pinInput.length > 0 && pinInput.length < 6 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                        {pinInput.length}/6
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRedeemPin}
                    disabled={!isPinValid(pinInput) || pinLoading}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <KeyRound size={14} />
                    {pinLoading ? 'Redeeming…' : 'Redeem PIN'}
                  </button>
                </div>
              </div>

              {(pinSuccess || pinError) && (
                <div className={`mt-3 flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${pinSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                  {pinSuccess
                    ? <CheckCircle size={13} className="shrink-0" />
                    : <AlertCircle size={13} className="shrink-0" />
                  }
                  {pinSuccess || pinError}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* ── Monthly Requirement Reminder ── */}
            {pvStatus && (
              monthlyRequirementMet ? (
                <div className="mb-4 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 flex-1">
                    <span className="font-semibold">Monthly requirement met</span> — You've spent ₱{currentSpend.toLocaleString()} this {monthName}. Keep it up!
                  </p>
                </div>
              ) : (
                <div className="mb-4 flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <CalendarClock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-700">Monthly purchase reminder</p>
                    <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                      Buy products worth at least <span className="font-semibold">₱1,500</span> before the 15th of each month to keep your access active.
                      {daysUntilDeadline > 0 && <> <span className="font-semibold">{daysUntilDeadline} day{daysUntilDeadline !== 1 ? 's' : ''} remaining.</span></>}
                    </p>
                  </div>
                </div>
              )
            )}

            {/* ── PV Status Banner ── */}
            <div className="mb-6 bg-white border border-slate-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">

              {/* Left: PV figures */}
              <div className="flex items-center gap-5 shrink-0">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Monthly PV</p>
                  <p className="text-xl font-bold text-slate-900">{currentPv} <span className="text-sm font-medium text-slate-400">/ 5,000</span></p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Available PV</p>
                  <p className="text-xl font-bold text-violet-700">{availablePv.toLocaleString()}</p>
                </div>
              </div>

              {/* Center: progress bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-400">
                    Monthly PV progress
                  </p>
                  <p className="text-xs font-semibold text-slate-700">{pctProgress}%</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${pctProgress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    style={{ width: `${pctProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {currentPv.toLocaleString()} / {PV_MONTHLY_CAP.toLocaleString()} PV
                </p>
              </div>

              {/* Right: status chip */}
              <div className="shrink-0">
                {pctProgress >= 100 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-3 py-1.5 rounded-full">
                    <ShieldCheck size={12} />
                    PV Cap Reached
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 ring-1 ring-violet-200 px-3 py-1.5 rounded-full">
                    <Sparkles size={12} />
                    {availablePv.toLocaleString()} PV available
                  </span>
                )}
              </div>
            </div>

            {/* ── Inline PIN Redemption ── */}
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl px-5 sm:px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Label */}
                <div className="shrink-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <KeyRound size={14} className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">Redeem Product PIN</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={pinInput}
                      onChange={e => {
                        setPinInput(formatPinInput(e.target.value));
                        setPinError('');
                        setPinSuccess('');
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleRedeemPin()}
                      placeholder="AAA000"
                      maxLength={6}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-mono text-sm tracking-[0.25em] placeholder:text-slate-300 placeholder:tracking-[0.25em] focus:outline-none focus:ring-2 transition-all uppercase ${pinError ? 'border-red-400 focus:ring-red-200' :
                        pinSuccess ? 'border-emerald-400 focus:ring-emerald-200' :
                          'border-slate-200 focus:ring-slate-300/50'
                        }`}
                    />
                    {/* Live format hint */}
                    {pinInput.length > 0 && pinInput.length < 6 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                        {pinInput.length}/6
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRedeemPin}
                    disabled={!isPinValid(pinInput) || pinLoading}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <KeyRound size={14} />
                    {pinLoading ? 'Redeeming…' : 'Redeem PIN'}
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {(pinSuccess || pinError) && (
                <div className={`mt-3 flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${pinSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                  {pinSuccess
                    ? <CheckCircle size={13} className="shrink-0" />
                    : <AlertCircle size={13} className="shrink-0" />
                  }
                  {pinSuccess || pinError}
                </div>
              )}
            </div>

            {/* ── Product catalogue ── */}
            <ShopPanel />
          </>
        )}
      </div>
    </div>
  );
}