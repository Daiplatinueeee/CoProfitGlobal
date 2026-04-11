import React, { useState } from 'react';
import { Upload, CheckCircle, ShoppingCart, X, AlertCircle } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    price: number;
    pv: number;
    description: string;
    image: string;
    features: string[];
}

interface MaintenancePayment {
    id: string;
    month: string;
    status: 'pending' | 'completed' | 'overdue';
    paymentMethod: string;
    proofFile: string | null;
    uploadDate: string | null;
}

import image1 from '../../assets/pk1.jpeg'
import image2 from '../../assets/pk2.jpeg'
import image3 from '../../assets/pk3.jpeg'
import image4 from '../../assets/pk4.jpeg'
import image5 from '../../assets/pk5.jpg'
import image6 from '../../assets/pk6.jpg'
import image7 from '../../assets/pk7.jpg'
import image8 from '../../assets/pk8.jpg'

const paymentMethods = [
    { id: "gcash",   name: "GCash",        account: "09XX-XXXX-XXX",       icon: "💳" },
    { id: "bank",    name: "Bank Transfer", account: "XX-XXXXXX-XXXX",      icon: "🏦" },
    { id: "paymaya", name: "PayMaya",       account: "XXXX-XXXX-XXXX-XXXX", icon: "💰" },
];

export default function Unilevel() {
    const [products] = useState<Product[]>([
        { id: '1', name: 'Starter Bundle',  price: 1500,  pv: 15,  description: 'Perfect for beginners',  image: image1, features: ['Basic access', '15 PV points', 'Support'] },
        { id: '2', name: 'Professional',    price: 3000,  pv: 30,  description: 'Growing your network',    image: image2, features: ['Full access', '30 PV points', 'Priority support'] },
        { id: '3', name: 'Premium',         price: 5000,  pv: 50,  description: 'For entrepreneurs',       image: image3, features: ['Premium access', '50 PV points', '24/7 support'] },
        { id: '4', name: 'Silver Bundle',   price: 7500,  pv: 75,  description: 'Enhanced benefits',       image: image4, features: ['Premium access', '75 PV points', 'Exclusive support'] },
        { id: '5', name: 'Gold Bundle',     price: 10000, pv: 100, description: 'Ultimate package',        image: image5, features: ['VIP access', '100 PV points', 'Personal manager'] },
        { id: '6', name: 'Platinum Bundle', price: 10000, pv: 100, description: 'Ultimate package',        image: image6, features: ['VIP access', '100 PV points', 'Personal manager'] },
        { id: '7', name: 'Diamond Bundle',  price: 10000, pv: 100, description: 'Ultimate package',        image: image7, features: ['VIP access', '100 PV points', 'Personal manager'] },
        { id: '8', name: 'Elite Bundle',    price: 10000, pv: 100, description: 'Ultimate package',        image: image8, features: ['VIP access', '100 PV points', 'Personal manager'] },
    ]);

    const [totalUnilevelPV, setTotalUnilevelPV] = useState(2500);
    const [maintenancePayments, setMaintenancePayments] = useState<MaintenancePayment[]>([
        { id: '1', month: 'January 2025',  status: 'completed', paymentMethod: 'Bank Transfer', proofFile: 'proof_jan_2025.pdf', uploadDate: '2025-01-10' },
        { id: '2', month: 'February 2025', status: 'pending',   paymentMethod: '',              proofFile: null,                uploadDate: null },
    ]);

    const [selectedMonth, setSelectedMonth]             = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [uploadedFile, setUploadedFile]               = useState<File | null>(null);

    const [selectedProduct, setSelectedProduct]         = useState<Product | null>(null);
    const [purchaseQuantity, setPurchaseQuantity]       = useState(1);
    const [showPurchaseModal, setShowPurchaseModal]     = useState(false);
    const [showMaintenanceSheet, setShowMaintenanceSheet] = useState(false);

    const [maintenancePayMethod, setMaintenancePayMethod] = useState('gcash');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setUploadedFile(e.target.files[0]);
    };

    const handleSubmitPayment = (monthId: string) => {
        if (!selectedPaymentMethod || !uploadedFile) {
            alert('Please select a payment method and upload proof');
            return;
        }
        setMaintenancePayments(maintenancePayments.map((p) =>
            p.id === monthId
                ? { ...p, status: 'completed', paymentMethod: selectedPaymentMethod, proofFile: uploadedFile.name, uploadDate: new Date().toISOString().split('T')[0] }
                : p
        ));
        setSelectedMonth('');
        setSelectedPaymentMethod('');
        setUploadedFile(null);
        setShowMaintenanceSheet(false);
    };

    const getMaintenanceStatus = (startDay: number, endDay: number) => {
        const today = new Date().getDate();
        if (today >= startDay && today <= endDay) return 'warning';
        return 'normal';
    };

    const convertedCash = (totalUnilevelPV * 1).toFixed(2);
    const maintenanceDeadlineStatus = getMaintenanceStatus(1, 15);

    const handleBuyClick = (product: Product) => {
        setSelectedProduct(product);
        setPurchaseQuantity(1);
        setShowPurchaseModal(true);
    };

    const handleClosePurchaseModal = () => {
        setShowPurchaseModal(false);
        setSelectedProduct(null);
        setPurchaseQuantity(1);
    };

    const handlePurchase = () => {
        if (!selectedProduct) return;
        const totalCost = selectedProduct.pv * purchaseQuantity;
        if (totalUnilevelPV < totalCost) {
            alert('Insufficient PV balance. You need ' + totalCost + ' PV but only have ' + totalUnilevelPV + ' PV.');
            return;
        }
        setTotalUnilevelPV(totalUnilevelPV - totalCost);
        alert(`Successfully purchased ${purchaseQuantity}x ${selectedProduct.name} for ${totalCost} PV!`);
        handleClosePurchaseModal();
    };

    const getTotalPurchaseCost  = () => (!selectedProduct ? 0 : selectedProduct.pv    * purchaseQuantity);
    const getTotalPurchasePrice = () => (!selectedProduct ? 0 : selectedProduct.price  * purchaseQuantity);

    const tierStats = [
        { label: "Total Unilevel PV", value: String(totalUnilevelPV), sub: "Available balance" },
        { label: "Converted Cash",    value: `₱${convertedCash}`,     sub: "1 PV = ₱1.00" },
        { label: "Maintenance Fee",   value: "₱1,500",                 sub: "Due 1st – 15th monthly" },
    ];

    /* ─── Maintenance Form (shared between sidebar & bottom sheet) ─── */
    const MaintenanceForm = () => (
        <div className="px-4 sm:px-6 py-5 space-y-4">
            {/* Payment Method */}
            <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Payment Method
                </label>
                <div className="space-y-2">
                    {paymentMethods.map((method) => (
                        <label
                            key={method.id}
                            htmlFor={`maint-${method.id}`}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                                maintenancePayMethod === method.id
                                    ? "border-slate-900 bg-slate-50"
                                    : "border-slate-200 hover:border-slate-300"
                            }`}
                        >
                            <input
                                type="radio"
                                id={`maint-${method.id}`}
                                name="maintenancePayMethod"
                                value={method.id}
                                checked={maintenancePayMethod === method.id}
                                onChange={(e) => {
                                    setMaintenancePayMethod(e.target.value);
                                    setSelectedPaymentMethod(e.target.value);
                                }}
                                className="sr-only"
                            />
                            <span className="text-base">{method.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900">{method.name}</p>
                                <p className="text-xs text-slate-400">{method.account}</p>
                            </div>
                            {maintenancePayMethod === method.id && (
                                <div className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                            )}
                        </label>
                    ))}
                </div>
            </div>

            {/* File Upload */}
            <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Payment Proof
                </label>
                <div className="relative">
                    <input
                        type="file"
                        onChange={handleFileUpload}
                        className="sr-only"
                        id="maintenanceFileInput"
                        accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <label
                        htmlFor="maintenanceFileInput"
                        className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-5 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                    >
                        <Upload size={20} className="text-slate-300 mb-1.5" />
                        <p className="text-xs font-medium text-slate-500">Click to upload</p>
                        <p className="text-xs text-slate-300 mt-0.5">PNG, JPG, PDF up to 10MB</p>
                    </label>
                    {uploadedFile && (
                        <div className="mt-2 flex items-center gap-2 text-emerald-600">
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium truncate">{uploadedFile.name}</span>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => {
                    const pending = maintenancePayments.find(p => p.status === 'pending');
                    if (pending) handleSubmitPayment(pending.id);
                }}
                disabled={!selectedPaymentMethod || !uploadedFile}
                className="w-full bg-slate-900 hover:bg-slate-700 active:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
                Submit Payment
            </button>
        </div>
    );

    /* ─── Payment History Panel (reused) ─── */
    const PaymentHistory = () => (
        <div className="px-4 sm:px-6 py-5 space-y-4">
            {paymentMethods.map((method) => (
                <div
                    key={method.id}
                    className={`rounded-xl border px-4 sm:px-5 py-4 transition-colors ${
                        maintenancePayMethod === method.id
                            ? "border-slate-200 bg-slate-50"
                            : "border-slate-100"
                    }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{method.icon}</span>
                        <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Account Number</p>
                    <p className="text-sm font-mono font-medium text-slate-700">{method.account}</p>
                </div>
            ))}

            {/* Monthly records */}
            <div className="space-y-3">
                {maintenancePayments.map((payment) => (
                    <div
                        key={payment.id}
                        className={`rounded-xl border px-4 sm:px-5 py-4 transition-colors ${
                            payment.status === 'completed'
                                ? 'border-slate-100 bg-slate-50'
                                : payment.status === 'overdue'
                                ? 'border-red-200 bg-red-50'
                                : 'border-slate-200'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{payment.month}</p>
                                <p className={`text-xs font-medium mt-0.5 ${
                                    payment.status === 'completed' ? 'text-emerald-600'
                                    : payment.status === 'overdue' ? 'text-red-600'
                                    : 'text-amber-600'
                                }`}>
                                    {payment.status === 'completed' && '✓ Completed'}
                                    {payment.status === 'pending'   && '⏳ Pending'}
                                    {payment.status === 'overdue'   && '⚠ Overdue'}
                                </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">₱1,500</p>
                        </div>

                        {payment.status === 'completed' && (
                            <div className="mt-2 space-y-1">
                                {[
                                    { label: "Method",    value: payment.paymentMethod },
                                    { label: "File",      value: payment.proofFile },
                                    { label: "Submitted", value: payment.uploadDate },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">{row.label}</span>
                                        <span className="text-xs font-medium text-slate-900 truncate max-w-[60%] text-right">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Steps */}
            <div className="rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                    Steps to complete payment
                </p>
                <ol className="space-y-2.5">
                    {[
                        "Choose a payment method from the form.",
                        "Send ₱1,500 to the account shown for that method.",
                        "Upload a screenshot or photo of your payment proof.",
                        "Click Submit Payment and wait for confirmation.",
                    ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium flex items-center justify-center mt-0.5">
                                {i + 1}
                            </span>
                            {step}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );

    return (
        <div className="bg-white">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

                {/* Header */}
                <div className="flex items-start justify-between mb-6 sm:mb-8 gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                            Unilevel Products
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Products, PV balance, and monthly maintenance management
                        </p>
                    </div>

                    {/* Mobile: open maintenance form sheet */}
                    <button
                        onClick={() => setShowMaintenanceSheet(true)}
                        className="lg:hidden shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                        <Upload size={13} />
                        Pay Maintenance
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
                    {tierStats.map(stat => (
                        <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-4 sm:px-5 py-4">
                            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                            <p className="text-xl sm:text-2xl font-semibold text-slate-900">{stat.value}</p>
                            <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Products Section (commented out in original, preserving as-is) */}
                {/* <div className="mb-10"> ... </div> */}

                {/* Maintenance Payment Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

                    {/* Desktop: Payment Form Sidebar */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden sticky top-6">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">Submit Maintenance</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Monthly fee: ₱1,500</p>
                                </div>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ${
                                    maintenanceDeadlineStatus === 'warning'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    <AlertCircle size={11} />
                                    {maintenanceDeadlineStatus === 'warning' ? 'Due soon' : 'On time'}
                                </span>
                            </div>
                            <MaintenanceForm />
                        </div>
                    </div>

                    {/* Payment History Panel */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden h-full">
                            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">Payment History</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Monthly maintenance records</p>
                                </div>
                                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <AlertCircle size={11} />
                                    Due 1st – 15th
                                </span>
                            </div>
                            <PaymentHistory />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Mobile: Maintenance Bottom Sheet ─── */}
            {showMaintenanceSheet && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowMaintenanceSheet(false)}
                    />

                    {/* Sheet */}
                    <div className="relative bg-white rounded-t-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        {/* Sheet header */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Submit Maintenance</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Monthly fee: ₱1,500</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                    maintenanceDeadlineStatus === 'warning'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    <AlertCircle size={10} />
                                    {maintenanceDeadlineStatus === 'warning' ? 'Due soon' : 'On time'}
                                </span>
                                <button
                                    onClick={() => setShowMaintenanceSheet(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                    aria-label="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable form */}
                        <div className="overflow-y-auto overscroll-contain flex-1">
                            <MaintenanceForm />
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Purchase Modal (responsive, already centered) ─── */}
            {showPurchaseModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 w-full sm:max-w-md sm:w-full p-5 sm:p-6 relative shadow-xl max-h-[92dvh] overflow-y-auto">
                        {/* Handle (mobile only) */}
                        <div className="flex justify-center mb-4 sm:hidden">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        <button
                            onClick={handleClosePurchaseModal}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            <X size={14} />
                        </button>

                        <h3 className="text-base font-semibold text-slate-900 mb-5 pr-8">Purchase Product</h3>

                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                <img
                                    src={selectedProduct.image}
                                    alt={selectedProduct.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{selectedProduct.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.description}</p>
                                <p className="text-xs font-medium text-slate-600 mt-1">{selectedProduct.pv} PV per unit</p>
                            </div>
                        </div>

                        {/* PV Balance */}
                        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 mb-5">
                            <p className="text-xs text-slate-400 mb-0.5">Your Available PV</p>
                            <p className="text-2xl font-semibold text-slate-900">{totalUnilevelPV} PV</p>
                        </div>

                        {/* Quantity */}
                        <div className="mb-5">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                                Quantity
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg font-semibold text-slate-900 transition-colors text-sm shrink-0"
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    value={purchaseQuantity}
                                    onChange={(e) => setPurchaseQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-center text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                                />
                                <button
                                    onClick={() => setPurchaseQuantity(purchaseQuantity + 1)}
                                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg font-semibold text-slate-900 transition-colors text-sm shrink-0"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="rounded-xl border border-slate-100 px-4 py-3 mb-5 space-y-2">
                            {[
                                { label: "Unit Price", value: `₱${selectedProduct.price.toLocaleString()}` },
                                { label: "Unit PV",    value: `${selectedProduct.pv} PV` },
                                { label: "Quantity",   value: String(purchaseQuantity) },
                            ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">{row.label}</span>
                                    <span className="text-xs font-semibold text-slate-900">{row.value}</span>
                                </div>
                            ))}
                            <div className="border-t border-slate-100 pt-2 mt-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-900">Total Price</span>
                                    <span className="text-sm font-semibold text-slate-900">₱{getTotalPurchasePrice().toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-900">Total PV Cost</span>
                                    <span className="text-sm font-semibold text-slate-900">{getTotalPurchaseCost()} PV</span>
                                </div>
                            </div>
                        </div>

                        {getTotalPurchaseCost() > totalUnilevelPV && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-4">
                                <p className="text-xs font-medium text-red-700">
                                    Insufficient PV. You need {getTotalPurchaseCost() - totalUnilevelPV} more PV.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleClosePurchaseModal}
                                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePurchase}
                                disabled={getTotalPurchaseCost() > totalUnilevelPV}
                                className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-700 active:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                Purchase
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}