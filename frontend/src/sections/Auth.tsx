'use client';

import { useState } from 'react';
import { Mail, Eye, EyeOff, ArrowRight, CircleUserRound, Asterisk} from 'lucide-react';
import { useNavigate } from "react-router-dom"
import OTPModal from "../modals/OTPModal";

import bg from "../assets/Gradient Loop Background - Dev Ashish Deval (1080p, h264).mp4";

export default function AuthPage() {
    const [isSignIn, setIsSignIn] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [accountType, setAccountType] = useState('user');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        referralCode: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Login failed');
                setIsLoading(false);
                return;
            }

            setUserEmail(formData.email);
            setAccountType(data.user.accountType);
            setShowOtpModal(true);

            // Send OTP for login
            await fetch('http://localhost:3000/api/users/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    isRegistration: false,
                }),
            });

            setIsLoading(false);
        } catch (err: any) {
            setError('An error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    username: formData.username,
                    accountType: 'user',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Registration failed');
                setIsLoading(false);
                return;
            }

            setUserEmail(formData.email);
            setAccountType('user');
            setShowOtpModal(true);

            // Send OTP for registration
            await fetch('http://localhost:3000/api/users/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    isRegistration: true,
                }),
            });

            setIsLoading(false);
        } catch (err: any) {
            setError('An error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        setIsVerifyingOtp(true);

        try {
            const verifyPayload: any = {
                email: userEmail,
                otp: otpCode,
                isRegistration: !isSignIn,
            };

            // Include additional data for registration
            if (!isSignIn) {
                verifyPayload.password = formData.password;
                verifyPayload.username = formData.username;
                verifyPayload.accountType = 'user';
            }

            const response = await fetch('http://localhost:3000/api/users/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(verifyPayload),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'OTP verification failed');
                setIsVerifyingOtp(false);
                return;
            }

            // Save token to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Navigate based on account type
            if (accountType === 'admin') {
                navigate('/admin');
            } else {
                navigate('/user');
            }
        } catch (err: any) {
            setError('An error occurred. Please try again.');
            setIsVerifyingOtp(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        if (isSignIn) {
            handleLogin(e);
        } else {
            handleRegister(e);
        }
    };

    return (
        <div className="flex h-screen bg-white overflow-hidden">
            {/* Left Side - Login Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-black">
                <div className="w-full max-w-sm">
                    {/* Logo and Header */}
                    <div className="mb-10 animate-fade-in">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="text-2xl text-yellow-400">CoProfitGlobal.</span>
                        </div>

                        <h1 className="text-4xl text-white mb-2 tracking-tight">
                            {isSignIn ? 'Welcome Back' : 'Create Account'}
                        </h1>
                        <p className="text-base text-gray-300">
                            {isSignIn ? 'Sign in to your account' : 'Join us to get started'}
                        </p>
                    </div>

                    {/* Tab Toggle */}
                    <div className="flex gap-2 mb-8 bg-transparent p-1.5 rounded-full animate-fade-in-delay">
                        <button
                            onClick={() => {
                                setIsSignIn(true);
                                setFormData({
                                    username: '',
                                    email: '',
                                    password: '',
                                    referralCode: '',
                                });
                            }}

                            className={`flex-1 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${isSignIn
                                ? 'bg-gray-700 text-white shadow-md'
                                : 'text-gray-600 hover:text-white'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => {
                                setIsSignIn(false);
                                setFormData({
                                    username: '',
                                    email: '',
                                    password: '',
                                    referralCode: '',
                                });
                                setError('');
                            }}
                            className={`flex-1 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${!isSignIn
                                ? 'bg-gray-700 text-white shadow-md'
                                : 'text-gray-600 hover:text-white'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-delay-2">
                        {/* Email (On Sign In) or Username (On Sign Up) */}
                        {isSignIn ? (
                            <div className="relative group">
                                <UnderlineInput
                                    label="Email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                                <CircleUserRound className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-black transition-colors duration-300" />
                            </div>
                        ) : (
                            <div className="relative group">
                                <UnderlineInput
                                    label="Username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    icon={<CircleUserRound className="w-5 h-5 mr-4" />}
                                />
                            </div>
                        )}

                        {/* Email (Only on Sign Up) */}
                        {!isSignIn && (
                            <div className="relative group">
                                <UnderlineInput
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    icon={<Mail className="w-5 h-5 mr-4" />}
                                />
                            </div>
                        )}

                        {/* Password Input */}
                        <div className="relative group mt-5">
                            <UnderlinePassword
                                label="Password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                showPassword={showPassword}
                                setShowPassword={setShowPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors duration-300"
                            >
                            </button>
                        </div>

                        {/* Referral Code (Only on Sign Up) */}
                        {!isSignIn && (
                            <div className="relative group">
                                <UnderlineInput
                                    label="Referral Code (Optional)"
                                    name="referralCode"
                                    type="text"
                                    value={formData.referralCode}
                                    onChange={handleInputChange}
                                    icon={<Asterisk className="w-5 h-5 mr-4" />}
                                />
                            </div>
                        )}


                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Remember Me and Forgot Password */}
                        {isSignIn && (
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={() => setRememberMe(!rememberMe)}
                                        className="w-4 h-4 bg-gray-500 border border-gray-300 rounded-md accent-black cursor-pointer transition-all duration-300"
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-yellow-500 transition-colors duration-300">Remember me</span>
                                </label>
                                <a
                                    href="#"
                                    className="text-sm text-gray-500 hover:text-yellow-500 font-medium transition-colors duration-300"
                                >
                                    Forgot Password?
                                </a>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-yellow-500/80 hover:bg-yellow-500 text-white font-medium py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2 mt-6 disabled:opacity-70 transform hover:scale-100 active:scale-95"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isSignIn ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Text */}
                    <p className="text-center text-xs text-gray-300 mt-8">
                        © 2025 CoProfitGlobal. All rights reserved.
                    </p>
                </div>
            </div>

            <OTPModal
                show={showOtpModal}
                onClose={() => setShowOtpModal(false)}
                userEmail={userEmail}
                error={error}
                otpCode={otpCode}
                setOtpCode={setOtpCode}
                handleVerifyOtp={handleVerifyOtp}
                isVerifyingOtp={isVerifyingOtp}
            />

            {/* Right Side - Video Background */}
            <div className="hidden md:flex w-1/2 bg-linear-to-br from-blue-600 to-blue-900 items-center justify-center relative overflow-hidden">
                <video
                    autoPlay
                    muted
                    loop
                    className="w-full h-full object-cover"
                    src={bg}
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/30"></div>

                {/* Floating License Text */}
                <div className="absolute bottom-6 left-6 right-6 bg-black/40 backdrop-blur-md rounded-2xl px-6 py-4 animate-fade-in-delay-3">
                    <p className="text-white text-xs leading-relaxed">
                        <span className="font-semibold">Unauthorized use or reproduction of any content or materials from this</span> presentation is prohibited. For more information, visit our Terms of Service{' '}
                        <a href="#" className="text-blue-300 hover:text-blue-200 underline transition-colors duration-300">
                            (pdf)
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ================= REUSABLE UNDERLINE INPUT ================= */

function UnderlineInput({
    label,
    name,
    value,
    onChange,
    type = "text",
    icon
}: any) {
    return (
        <div className="relative group">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder=" "
                className="w-full bg-transparent text-white py-2
                           border-b border-gray-600
                           focus:outline-none focus:border-yellow-500
                           transition-all duration-300 peer pr-8"
            />
            <label
                className="absolute left-0 top-2 text-gray-400 text-sm
                           transition-all duration-300
                           peer-focus:-top-4 peer-focus:text-xs peer-focus:text-yellow-500
                           peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm"
            >
                {label}
            </label>
            {icon && (
                <div className="absolute right-0 top-2 text-gray-400 group-focus-within:text-yellow-500">
                    {icon}
                </div>
            )}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-500 transition-all duration-300 group-focus-within:w-full"></span>
        </div>
    );
}

/* ================= PASSWORD UNDERLINE ================= */

function UnderlinePassword({
    label,
    name,
    value,
    onChange,
    showPassword,
    setShowPassword
}: any) {
    return (
        <div className="relative group">
            <input
                type={showPassword ? "text" : "password"}
                name={name}
                value={value}
                onChange={onChange}
                placeholder=" "
                className="w-full bg-transparent text-white py-2
                           border-b border-gray-600
                           focus:outline-none focus:border-yellow-500
                           transition-all duration-300 peer pr-8"
            />
            <label
                className="absolute left-0 top-2 text-gray-400 text-sm
                           transition-all duration-300
                           peer-focus:-top-4 peer-focus:text-xs peer-focus:text-yellow-500
                           peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm"
            >
                {label}
            </label>
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-2 text-gray-400 hover:text-yellow-500"
            >
                {showPassword ? <EyeOff className="w-5 h-5 mr-4" /> : <Eye className="w-5 h-5 mr-4" />}
            </button>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-500 transition-all duration-300 group-focus-within:w-full"></span>
        </div>
    );
}