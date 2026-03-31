'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, KeyRound, AlignLeft } from 'lucide-react';

type Step = 'form' | 'success';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [step, setStep] = useState<Step>('form');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        reason: '',
    });

    // Reset state whenever modal reopens
    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setError('');
            setFormData({ title: '', description: '', reason: '' });
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim() || !formData.description.trim() || !formData.reason.trim()) {
            setError('Please fill in all fields before submitting.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3000/auth/forgot-password-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to submit request. Please try again.');
                return;
            }

            setStep('success');
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        /* Backdrop — click outside to close */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Modal Panel */}
            <div
                className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-8 shadow-2xl"
                style={{ animation: 'modalIn 0.2s ease-out' }}
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-yellow-500 transition-colors duration-200"
                >
                    <X className="w-5 h-5" />
                </button>

                {step === 'form' ? (
                    <>
                        {/* Header */}
                        <div className="mb-7">
                            <h2 className="text-2xl font-semibold text-white tracking-tight mb-1">
                                Reset Password
                            </h2>
                            <p className="text-sm text-gray-400">
                                Submit a request to the admin team for a password reset.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Reason */}
                            <UnderlineSelect
                                label="Reason for Reset"
                                name="reason"
                                value={formData.reason}
                                onChange={handleInputChange}
                                icon={<AlignLeft className="w-4 h-4" />}
                                options={[
                                    { value: '', label: 'Select a reason...' },
                                    { value: 'forgot_password', label: 'Forgot my password' },
                                    { value: 'account_compromised', label: 'Account may be compromised' },
                                    { value: 'email_lost', label: 'Lost access to registered email' },
                                    { value: 'technical_issue', label: 'Technical issue / unable to login' },
                                    { value: 'other', label: 'Other' },
                                ]}
                            />

                            {/* Description */}
                            <UnderlineTextarea
                                label="Description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Briefly describe your situation (e.g. account locked, email no longer accessible)."
                            />

                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-full border border-zinc-600 text-gray-300 text-sm hover:border-zinc-400 hover:text-white transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 bg-yellow-500/80 hover:bg-yellow-500 text-white text-sm font-medium py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Submit Request
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    /* Success State */
                    <div className="flex flex-col items-center text-center py-4">
                        <div className="w-14 h-14 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mb-5">
                            <KeyRound className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">
                            Request Sent
                        </h2>
                        <p className="text-gray-400 text-sm leading-relaxed mb-7">
                            Your password reset request has been submitted. An admin will review it
                            and reach out to you shortly.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-yellow-500/80 hover:bg-yellow-500 text-white text-sm font-medium py-2.5 rounded-full transition-all duration-200 active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>

            {/* Modal entrance animation */}
            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
            `}</style>
        </div>
    );
}

/* ================= UNDERLINE TEXTAREA ================= */

function UnderlineTextarea({
    label, name, value, onChange, placeholder,
}: {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
}) {
    return (
        <div className="relative w-full">
            <label className="block text-yellow-500 text-xs mb-1 pointer-events-none">
                {label}
            </label>
            <div className="relative">
                <textarea
                    name={name} value={value} onChange={onChange} rows={3}
                    placeholder={placeholder}
                    className="peer w-full bg-transparent text-white pt-1 pb-2
                               border-b border-zinc-600 focus:outline-none focus:border-yellow-500
                               transition-all duration-300 resize-none text-sm
                               placeholder:text-gray-600 placeholder:text-xs"
                />
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-500 transition-all duration-300 peer-focus:w-full" />
            </div>
        </div>
    );
}

/* ================= UNDERLINE SELECT ================= */

function UnderlineSelect({
    label, name, value, onChange, options, icon,
}: {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
    icon?: React.ReactNode;
}) {
    return (
        <div className="relative w-full">
            <label className="block text-yellow-500 text-xs mb-1 pointer-events-none">
                {label}
            </label>
            <div className="relative">
                <select
                    name={name} value={value} onChange={onChange}
                    className="peer w-full bg-zinc-900 text-white py-2
                               border-b border-zinc-600 focus:outline-none focus:border-yellow-500
                               transition-all duration-300 pr-8 appearance-none cursor-pointer text-sm"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                            {opt.label}
                        </option>
                    ))}
                </select>
                {icon && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        {icon}
                    </div>
                )}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-500 transition-all duration-300 peer-focus:w-full" />
            </div>
        </div>
    );
}