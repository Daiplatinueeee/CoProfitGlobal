import React, { useState } from 'react';
import { Upload } from 'lucide-react';

import image1 from '../../assets/pk1.jpeg'
import image2 from '../../assets/pk2.jpeg'
import image3 from '../../assets/pk3.jpeg'
import image4 from '../../assets/pk4.jpeg'
import image5 from '../../assets/pk5.jpg'
import image6 from '../../assets/pk6.jpg'
import image7 from '../../assets/pk7.jpg'
import image8 from '../../assets/pk8.jpg'

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

export default function Unilevel() {
    const [products] = useState<Product[]>([
        {
            id: '1',
            name: 'Starter Bundle',
            price: 1500,
            pv: 15,
            description: 'Perfect for beginners',
            image: image1,
            features: ['Basic access', '15 PV points', 'Support']
        },
        {
            id: '2',
            name: 'Professional',
            price: 3000,
            pv: 30,
            description: 'Growing your network',
            image: image2,
            features: ['Full access', '30 PV points', 'Priority support']
        },
        {
            id: '3',
            name: 'Premium',
            price: 5000,
            pv: 50,
            description: 'For entrepreneurs',
            image: image3,
            features: ['Premium access', '50 PV points', '24/7 support']
        },
        {
            id: '4',
            name: 'Silver Bundle',
            price: 7500,
            pv: 75,
            description: 'Enhanced benefits',
            image: image4,
            features: ['Premium access', '75 PV points', 'Exclusive support']
        },
        {
            id: '5',
            name: 'Gold Bundle',
            price: 10000,
            pv: 100,
            description: 'Ultimate package',
            image: image5,
            features: ['VIP access', '100 PV points', 'Personal manager']
        },
        {
            id: '6',
            name: 'Gold Bundle',
            price: 10000,
            pv: 100,
            description: 'Ultimate package',
            image: image6,
            features: ['VIP access', '100 PV points', 'Personal manager']
        },
        {
            id: '7',
            name: 'Gold Bundle',
            price: 10000,
            pv: 100,
            description: 'Ultimate package',
            image: image7,
            features: ['VIP access', '100 PV points', 'Personal manager']
        },
        {
            id: '8',
            name: 'Gold Bundle',
            price: 10000,
            pv: 100,
            description: 'Ultimate package',
            image: image8,
            features: ['VIP access', '100 PV points', 'Personal manager']
        },
    ]);

    const [totalUnilevelPV] = useState(2500);
    const [maintenancePayments, setMaintenancePayments] = useState<MaintenancePayment[]>([
        { id: '1', month: 'January 2025', status: 'completed', paymentMethod: 'Bank Transfer', proofFile: 'proof_jan_2025.pdf', uploadDate: '2025-01-10' },
        { id: '2', month: 'February 2025', status: 'pending', paymentMethod: '', proofFile: null, uploadDate: null },
    ]);

    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    const handleSubmitPayment = (monthId: string) => {
        if (!selectedPaymentMethod || !uploadedFile) {
            alert('Please select a payment method and upload proof');
            return;
        }

        setMaintenancePayments(
            maintenancePayments.map((payment) =>
                payment.id === monthId
                    ? {
                        ...payment,
                        status: 'completed',
                        paymentMethod: selectedPaymentMethod,
                        proofFile: uploadedFile.name,
                        uploadDate: new Date().toISOString().split('T')[0],
                    }
                    : payment
            )
        );

        setSelectedMonth('');
        setSelectedPaymentMethod('');
        setUploadedFile(null);
    };

    const getMaintenanceStatus = (startDay: number, endDay: number) => {
        const today = new Date().getDate();
        if (today >= startDay && today <= endDay) {
            return 'warning';
        }
        return 'normal';
    };

    const convertedCash = (totalUnilevelPV * 1).toFixed(2);
    const maintenanceDeadlineStatus = getMaintenanceStatus(1, 15);

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
                {/* Header Section */}
                <div className="mb-10">
                    <h1 className="text-4xl font-semibold text-gray-900">Unilevel</h1>
                    <p className="text-gray-600 mt-2">Products and network management</p>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Total Unilevel PV Card */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <p className="text-gray-600 text-sm font-medium mb-2">Total Unilevel PV</p>
                        <p className="text-4xl font-semibold text-gray-900 mb-6">{totalUnilevelPV}</p>

                        <div className="space-y-3 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-sm">Conversion Rate</span>
                                <span className="font-medium text-gray-900">1 PV = ₱1.00</span>
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm mb-1">Converted Cash</p>
                                <p className="text-2xl font-semibold text-gray-900">₱{convertedCash}</p>
                            </div>
                            <p className="text-xs text-gray-600 pt-2 leading-relaxed">
                                Converted cash is added to your Available Balance. You can withdraw it on the Payout page.
                            </p>
                        </div>
                    </div>

                    {/* Monthly Maintenance Card */}
                    <div className={`rounded-xl p-6 border ${maintenanceDeadlineStatus === 'warning'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-green-50 border-green-200'}`}>
                        <p className={`${maintenanceDeadlineStatus === 'warning' ? 'text-orange-700' : 'text-green-700'} text-sm font-medium mb-2`}>
                            Monthly Maintenance Fee
                        </p>
                        <p className="text-4xl font-semibold text-gray-900 mb-6">₱1,500</p>

                        <div className="space-y-3 pt-4 border-t border-gray-200">
                            <p className="font-medium text-gray-900 text-sm">Deadline: 1st - 15th of each month</p>
                            <p className={`text-xs ${maintenanceDeadlineStatus === 'warning' ? 'text-orange-700' : 'text-green-700'}`}>
                                {maintenanceDeadlineStatus === 'warning'
                                    ? 'Payment deadline is active. Please complete your payment.'
                                    : 'Next deadline: 1st - 15th of next month'}
                            </p>
                            <p className="text-xs text-gray-600 pt-2">Required to maintain your account status and network benefits</p>
                        </div>
                    </div>
                </div>

                {/* Products Section */}
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Products</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-80"
                            >
                                <div className="h-32 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>

                                {/* Product Content */}
                                <div className="p-4 flex flex-col grow">
                                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{product.name}</h3>
                                    <p className="text-xs text-gray-600 mb-4 grow">{product.description}</p>

                                    {/* PV Badge */}
                                    <div className="mb-3">
                                        <span className="inline-block bg-gray-100 text-gray-900 px-2 py-1 rounded text-xs font-medium">
                                            {product.pv} PV
                                        </span>
                                    </div>

                                    {/* Price */}
                                    <div className="border-t border-gray-200 pt-3">
                                        <p className="text-lg font-semibold text-gray-900">₱{product.price.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Maintenance Payment Section */}
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Payment History</h2>

                    <div className="space-y-4">
                        {maintenancePayments.map((payment) => (
                            <div
                                key={payment.id}
                                className={`rounded-xl p-6 border ${payment.status === 'completed'
                                    ? 'bg-green-50 border-green-200'
                                    : payment.status === 'overdue'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-orange-50 border-orange-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{payment.month}</h3>
                                            <p className={`text-sm font-medium ${payment.status === 'completed'
                                                ? 'text-green-700'
                                                : payment.status === 'overdue'
                                                    ? 'text-red-700'
                                                    : 'text-orange-700'
                                                }`}>
                                                {payment.status === 'completed' && 'Completed'}
                                                {payment.status === 'pending' && 'Pending'}
                                                {payment.status === 'overdue' && 'Overdue'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">₱1,500</p>
                                </div>

                                {payment.status === 'pending' && (
                                    <div className="bg-white rounded-lg p-5 space-y-4 mt-4 border border-gray-200">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                                Payment Method
                                            </label>
                                            <select
                                                value={selectedMonth === payment.id ? selectedPaymentMethod : ''}
                                                onChange={(e) => {
                                                    setSelectedMonth(payment.id);
                                                    setSelectedPaymentMethod(e.target.value);
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            >
                                                <option value="">Select method</option>
                                                <option value="bank-transfer">Bank Transfer</option>
                                                <option value="gcash">GCash</option>
                                                <option value="debit-card">Debit Card</option>
                                                <option value="credit-card">Credit Card</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                                Upload Proof
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer">
                                                <input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    id={`file-upload-${payment.id}`}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                />
                                                <label htmlFor={`file-upload-${payment.id}`} className="cursor-pointer block">
                                                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                                                    <p className="text-xs font-medium text-gray-700">Click to upload</p>
                                                    {uploadedFile && (
                                                        <p className="text-xs text-green-700 font-medium mt-2">✓ {uploadedFile.name}</p>
                                                    )}
                                                </label>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSubmitPayment(payment.id)}
                                            disabled={selectedMonth !== payment.id || !selectedPaymentMethod || !uploadedFile}
                                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                )}

                                {payment.status === 'completed' && (
                                    <div className="mt-4 text-sm space-y-1">
                                        <p className="text-gray-700">Method: <span className="font-medium text-gray-900">{payment.paymentMethod}</span></p>
                                        <p className="text-gray-700">File: <span className="font-medium text-gray-900">{payment.proofFile}</span></p>
                                        <p className="text-gray-700">Submitted: <span className="font-medium text-gray-900">{payment.uploadDate}</span></p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}