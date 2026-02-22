'use client';

import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, CircleUserRound } from 'lucide-react';
import { useNavigate } from "react-router-dom";

import bg from "../assets/Gradient Loop Background - Dev Ashish Deval (1080p, h264).mp4";

export default function AuthPage() {
    const [isSignIn,] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        referralCode: '',
    });

    const navigate = useNavigate();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /** 🔐 HARDCODED LOGIN LOGIC */
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            const { email, password } = formData;

            if (email === 'testuser' && password === 'testpass') {
                navigate('/user');
            }
            else if (email === 'testadmin' && password === 'testpass') {
                navigate('/admin');
            }
            else {
                setError('Invalid username or password');
            }

            setIsLoading(false);
        }, 800); // fake loading delay
    };

    const handleSubmit = (e: React.FormEvent) => {
        if (isSignIn) {
            handleLogin(e);
        } else {
            setError('Registration is disabled in demo mode.');
        }
    };

    return (
        <div className="flex h-screen bg-white overflow-hidden">
            {/* LEFT SIDE */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-black">
                <div className="w-full max-w-sm">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-4xl text-white mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-gray-300">
                            Demo login only
                        </p>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div className="relative">
                            <UnderlineInput
                                label="Username"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                            <CircleUserRound className="absolute right-2 top-2 text-gray-400 w-5 h-5" />
                        </div>

                        {/* Password */}
                        <UnderlinePassword
                            label="Password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                        />

                        {/* ERROR */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Remember Me */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={() => setRememberMe(!rememberMe)}
                                />
                                <span className="text-sm text-gray-300">Remember me</span>
                            </label>
                        </div>

                        {/* BUTTON */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-full flex justify-center gap-2"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-8">
                        Demo Credentials:
                        <br />
                        user → testuser / testpass
                        <br />
                        admin → testadmin / testpass
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE VIDEO */}
            <div className="hidden md:flex w-1/2 relative">
                <video autoPlay muted loop className="w-full h-full object-cover" src={bg} />
                <div className="absolute inset-0 bg-black/40" />
            </div>
        </div>
    );
}

/* ===== INPUT COMPONENTS ===== */

function UnderlineInput({ label, name, value, onChange }: any) {
    return (
        <div className="relative">
            <input
                name={name}
                value={value}
                onChange={onChange}
                placeholder=" "
                className="
                    peer
                    w-full bg-transparent text-white py-2
                    border-b border-gray-600
                    focus:outline-none focus:border-yellow-500
                "
            />
            <label
                className="
                    absolute left-0
                    text-gray-400 text-sm
                    transition-all duration-300
                    top-2
                    peer-focus:-top-4 peer-focus:text-xs peer-focus:text-yellow-500
                    peer-not-placeholder-shown:-top-4
                    peer-not-placeholder-shown:text-xs
                "
            >
                {label}
            </label>
        </div>
    );
}

function UnderlinePassword({
    label,
    name,
    value,
    onChange,
    showPassword,
    setShowPassword
}: any) {
    return (
        <div className="relative">
            <input
                type={showPassword ? "text" : "password"}
                name={name}
                value={value}
                onChange={onChange}
                placeholder=" "
                className="
                    peer
                    w-full bg-transparent text-white py-2
                    border-b border-gray-600
                    focus:outline-none focus:border-yellow-500
                    pr-8
                "
            />
            <label
                className="
                    absolute left-0
                    text-gray-400 text-sm
                    transition-all duration-300
                    top-2
                    peer-focus:-top-4 peer-focus:text-xs peer-focus:text-yellow-500
                    peer-not-placeholder-shown:-top-4
                    peer-not-placeholder-shown:text-xs
                "
            >
                {label}
            </label>

            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-400 hover:text-yellow-500"
            >
                {showPassword ? <EyeOff /> : <Eye />}
            </button>
        </div>
    );
}