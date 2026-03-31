'use client';

import { useState, useEffect } from 'react';
import { Mail, Eye, EyeOff, ArrowRight, CircleUserRound, Asterisk } from 'lucide-react';
import { useNavigate } from "react-router-dom"

import bg from "../assets/Gradient Loop Background - Dev Ashish Deval (1080p, h264).mp4";
import ForgotPasswordModal from './tabs/ForgotPassword';

const BASE_URL = 'https://coprofitglobal-production.up.railway.app';

export default function AuthPage() {
    const [isSignIn, ] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [, setUserEmail] = useState('');
    const [, setRole] = useState('user');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        referralCode: '',
    });

    // On mount: restore saved credentials if Remember Me was previously checked
    useEffect(() => {
        const savedEmail    = localStorage.getItem('rememberedEmail');
        const savedPassword = localStorage.getItem('rememberedPassword');
        if (savedEmail && savedPassword) {
            setRememberMe(true);
            setFormData((prev) => ({ ...prev, email: savedEmail, password: savedPassword }));
        }
    }, []);

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
            const response = await fetch(`${BASE_URL}/auth/login`, {
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

            // Save auth data
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Remember Me — save or clear credentials
            if (rememberMe) {
                localStorage.setItem('rememberedEmail',    formData.email);
                localStorage.setItem('rememberedPassword', formData.password);
            } else {
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
            }

            // Navigate based on role
            if (data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/user');
            }

        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    username: formData.username,
                    role: 'user',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Registration failed');
                setIsLoading(false);
                return;
            }

            setUserEmail(formData.email);
            setRole('user');

            setIsLoading(false);
        } catch (err: any) {
            setError('An error occurred. Please try again.');
            setIsLoading(false);
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
                                    onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}
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
                        © 2026 CoProfitGlobal. All rights reserved.
                    </p>
                </div>
            </div>

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
            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                isOpen={showForgotPassword}
                onClose={() => setShowForgotPassword(false)}
            />
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
        <div className="relative w-full">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder=" "
                className="peer w-full bg-transparent text-white py-3
                           border-b border-gray-600
                           focus:outline-none focus:border-yellow-500
                           transition-all duration-300
                           pr-10"
            />

            <label
                className="absolute left-0 top-3 text-gray-400 text-sm
                           transition-all duration-300
                           pointer-events-none
                           peer-placeholder-shown:translate-y-0
                           peer-placeholder-shown:text-sm
                           peer-focus:-translate-y-6
                           peer-focus:text-xs
                           peer-focus:text-yellow-500
                           peer-not-placeholder-shown:-translate-y-6
                           peer-not-placeholder-shown:text-xs"
            >
                {label}
            </label>

            {icon && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400">
                    {icon}
                </div>
            )}

            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-500 transition-all duration-300 peer-focus:w-full"></span>
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
        <div className="relative w-full">
            <input
                type={showPassword ? "text" : "password"}
                name={name}
                value={value}
                onChange={onChange}
                placeholder=" "
                className="peer w-full bg-transparent text-white py-3
                           border-b border-gray-600
                           focus:outline-none focus:border-yellow-500
                           transition-all duration-300
                           pr-10"
            />

            <label
                className="absolute left-0 top-3 text-gray-400 text-sm
                           transition-all duration-300
                           pointer-events-none
                           peer-placeholder-shown:translate-y-0
                           peer-placeholder-shown:text-sm
                           peer-focus:-translate-y-6
                           peer-focus:text-xs
                           peer-focus:text-yellow-500
                           peer-not-placeholder-shown:-translate-y-6
                           peer-not-placeholder-shown:text-xs"
            >
                {label}
            </label>

            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500"
            >
                {showPassword
                    ? <EyeOff className="w-5 h-5" />
                    : <Eye className="w-5 h-5" />
                }
            </button>

            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-500 transition-all duration-300 peer-focus:w-full"></span>
        </div>
    );
}