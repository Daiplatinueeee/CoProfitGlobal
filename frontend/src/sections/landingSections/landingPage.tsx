'use client';

import { useState, useEffect, useRef } from 'react';
import { Pause, Play, VolumeX, Volume2, Maximize, Minimize, ShoppingCart } from 'lucide-react';

import CollectionsSection from './productsOverview';
import BlogSection from './blogSection';
import MissionVisionSection from './missionVision';
import TeamSection from './teamSection';
import CartModal from './cartContents/cartModal';
import { useCart } from './cartContents/cartContext';

import { useNavigate } from "react-router-dom"

import prod1 from "../../assets/prod2.jpeg"

import training1 from "../../assets/video refs/0c81c791-4c78-4c3e-a3ed-26d13b0244e9.mp4"

// Platinum
import pk1 from "../../assets/pk1.jpg"
import pk2 from "../../assets/pk2.jpg"

// Bronze
import pk3 from "../../assets/pk3.jpg"
import pk4 from "../../assets/pk1.jpeg"

// Gold
import pk5 from "../../assets/pk5.jpg"
import pk6 from "../../assets/pk6.jpg"

// Silver
import pk8 from "../../assets/pk7.jpg"
import pk7 from "../../assets/pk8.jpg"

import logo from '../../assets/logoWithName(small).png'
import genealogy from '../../assets/genealogy.png'
import coprofit from '../../assets/coprofit.jpg'


export default function LandingPage() {
    const [, setIsVideoPlaying] = useState(false);
    const videoRef = useRef<HTMLIFrameElement>(null);
    const heroVideoRef = useRef<HTMLVideoElement>(null);
    const [heroPlaying, setHeroPlaying] = useState(true);
    const [heroMuted, setHeroMuted] = useState(true);

    const toggleHeroPlay = () => {
        if (!heroVideoRef.current) return;
        if (heroPlaying) {
            heroVideoRef.current.pause();
        } else {
            heroVideoRef.current.play();
        }
        setHeroPlaying(!heroPlaying);
    };

    const toggleHeroMute = () => {
        if (!heroVideoRef.current) return;
        heroVideoRef.current.muted = !heroMuted;
        setHeroMuted(!heroMuted);
    };

    const [heroFullscreen, setHeroFullscreen] = useState(false);
    const heroSectionRef = useRef<HTMLElement>(null);

    const toggleHeroFullscreen = () => {
        if (!heroSectionRef.current) return;
        if (!document.fullscreenElement) {
            heroSectionRef.current.requestFullscreen().then(() => setHeroFullscreen(true)).catch(() => { });
        } else {
            document.exitFullscreen().then(() => setHeroFullscreen(false)).catch(() => { });
        }
    };

    useEffect(() => {
        const onFsChange = () => {
            setHeroFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const productPackages = [
        { id: 1, name: 'Bronze Package A', image: pk4, description: 'Starts with ₱1,998 only, get yours now!' },
        { id: 2, name: 'Silver Package A', image: pk8, description: 'Starts with ₱5,998 only, get yours now!' },
        { id: 3, name: 'Gold Package A', image: pk6, description: 'Starts with ₱8,998 only, get yours now!' },
        { id: 4, name: 'Platinum Package A', image: pk1, description: 'Starts with ₱12,998 only, get yours now!' },
        { id: 5, name: 'Bronze Package B', image: pk3, description: 'Starts with ₱1,998 only, get yours now!' },
        { id: 6, name: 'Silver Package B', image: pk7, description: 'Starts with ₱5,998 only, get yours now!' },
        { id: 7, name: 'Gold Package B', image: pk5, description: 'Starts with ₱8,998 only, get yours now!' },
        { id: 8, name: 'Platinum Package B', image: pk2, description: 'Starts with ₱12,998 only, get yours now!' },
    ];


    const individualProducts = [
        { id: 1, name: 'RelieFlex Liniment Oil', price: '₱1,500', image: prod1, category: 'Liniment oil' },
    ];

    const mainVideo = {
        thumbnail: training1,
        url: training1,
    };

    const blogPosts = [
        {
            id: 1,
            title: 'CoProfit Global: Your Path to Financial Freedom',
            description: 'Discover how CoProfit Global empowers everyday Filipinos to build sustainable income streams through our proven network marketing system and premium product line.',
            date: 'Feb 20, 2026',
            category: 'Business',
            thumbnail: logo as string | null,
            thumbnailLabel: 'CoProfit Global',
        },
        {
            id: 2,
            title: 'The Power of Network Marketing in the Philippines',
            description: 'Network marketing has transformed thousands of lives across the Philippines. Learn the strategies top earners use to grow their teams and generate consistent passive income.',
            date: 'Dec 18, 2025',
            category: 'Marketing',
            thumbnail: genealogy as string | null,
            thumbnailLabel: 'Network Marketing',
        },
        {
            id: 3,
            title: 'Introducing CoProfit Global',
            description: 'We are proud to officially launch CoProfit Global Corporation — a bold new chapter in Philippine network marketing. Find out what sets us apart from the rest.',
            date: 'Nov 19, 2025',
            category: 'Product',
            thumbnail: coprofit as string | null,
            thumbnailLabel: 'Experience liftoff',
        },
    ];

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && videoRef.current) {
                        setIsVideoPlaying(true);
                        if (videoRef.current.src === '') {
                            videoRef.current.src = mainVideo.url;
                        }
                    }
                });
            },
            { threshold: 0.5 }
        );

        if (videoRef.current) {
            observer.observe(videoRef.current.parentElement!);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    const offices = {
        headOffice: {
            name: 'Main Office',
            owner: 'TBA',
            address: 'C7 Modena Town Square, Tunghaan, Minglanilla Cebu',
            phone: 'TBA',
        },
        hubs: [
            {
                name: 'Hub Office',
                owner: 'Estela Colarte',
                address: 'Mahayag San Miguel, Bohol',
                phone: '# 0997 417 4308',
            },
            {
                name: 'Satellite Office',
                owner: 'Atty. Jessie Ancog',
                address: 'Cogon, Tagbilaran City, Bohol',
                phone: '# 0917 701 2547',
            },
            {
                name: 'Daro Dumaguete City, Negros Oriental',
                owner: 'Engr. Gerry Velicaria',
                address:
                    'Purok Apitong, Tubtubon, Sibulan, Negros Oriental, Near Tubtubon Barangay Hall',
                phone: '# 0917 724 0022',
            },
        ],
    };

    const navigate = useNavigate()
    const { cartCount, setCartIconRef } = useCart();
    const [cartOpen, setCartOpen] = useState(false);

    const navigateToLogin = () => {
        navigate("/auth")
    }

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="w-full overflow-hidden bg-slate-950">
            {/* Cart Modal */}
            <CartModal isOpen={cartOpen} onClose={() => setCartOpen(false)} />

            <style>{`
                @keyframes cartBadgePop {
                    0%   { transform: scale(0); }
                    70%  { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
                html {
                    scroll-behavior: smooth;
                }
            `}</style>

            {/* Navbar */}
            <nav className="fixed top-0 w-full bg-slate-950/95 backdrop-blur z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="text-2xl font-bold text-yellow-500">CoProfitGlobal</div>
                    <div className="hidden md:flex gap-8 items-center">
                        <button onClick={() => scrollToSection('hero')} className="text-white hover:text-yellow-500 transition bg-transparent border-none cursor-pointer">Home</button>
                        <button onClick={() => scrollToSection('collections')} className="text-white hover:text-yellow-500 transition bg-transparent border-none cursor-pointer">Products</button>
                        <button onClick={() => scrollToSection('blogs')} className="text-white hover:text-yellow-500 transition bg-transparent border-none cursor-pointer">Blogs</button>
                        <button onClick={() => scrollToSection('team')} className="text-white hover:text-yellow-500 transition bg-transparent border-none cursor-pointer">Our Team</button>
                        <button onClick={() => scrollToSection('core-values')} className="text-white hover:text-yellow-500 transition bg-transparent border-none cursor-pointer">Core Values</button>
                        <button onClick={() => scrollToSection('contact')} className="text-white hover:text-yellow-500 transition bg-transparent border-none cursor-pointer">Contact Us</button>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Cart Icon Button */}
                        <button
                            ref={setCartIconRef}
                            onClick={() => setCartOpen(true)}
                            style={{
                                position: 'relative',
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                border: '1px solid rgba(234,179,8,0.4)',
                                background: 'rgba(234,179,8,0.06)',
                                color: '#EAB308',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.22s',
                                flexShrink: 0,
                            }}
                            onMouseEnter={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(234,179,8,0.15)';
                                b.style.borderColor = '#EAB308';
                            }}
                            onMouseLeave={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(234,179,8,0.06)';
                                b.style.borderColor = 'rgba(234,179,8,0.4)';
                            }}
                        >
                            <ShoppingCart size={18} />
                            {cartCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: '#EAB308',
                                    color: '#0a0a0a',
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    borderRadius: '10px',
                                    minWidth: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                    lineHeight: 1,
                                    border: '2px solid #0a0f1e',
                                    animation: 'cartBadgePop 0.3s ease',
                                }}>
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </button>

                        <button className="bg-yellow-500 text-slate-950 px-6 py-2 rounded-full font-semibold hover:bg-yellow-400 transition" onClick={navigateToLogin}>
                            Login
                        </button>
                    </div>
                </div>
            </nav>

            {/* Section 1: Cinematic Hero */}
            <section
                id="hero"
                ref={heroSectionRef}
                className="relative w-full overflow-hidden border-b border-yellow-600/40"
                style={{ height: '100vh', minHeight: '600px' }}
            >
                {/* ── FULL-FRAME VIDEO ── */}
                <video
                    ref={heroVideoRef}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'brightness(0.78) contrast(1.06)',
                        zIndex: 0,
                    }}
                    src={training1}
                />

                {/* Subtle bottom gradient only — keeps most of video clear */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 28%, rgba(0,0,0,0) 55%)',
                }} />

                {/* Left-edge vignette so left text stays readable */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%)',
                }} />

                {/* ── BOTTOM-LEFT BLOCK: typography + controls stacked ── */}
                <div style={{
                    position: 'absolute',
                    bottom: '36px',
                    left: '44px',
                    zIndex: 20,
                    maxWidth: '420px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                }}>
                    {/* Eyebrow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '24px', height: '1px', background: 'rgba(234,179,8,0.75)' }} />
                        <span style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '0.58rem',
                            letterSpacing: '0.28em',
                            color: 'rgba(234,179,8,0.8)',
                            textTransform: 'uppercase',
                        }}>CoProfit Global · Est. 2024</span>
                    </div>

                    {/* Headline */}
                    <div>
                        <div style={{
                            fontSize: 'clamp(1.5rem, 3.2vw, 2.6rem)',
                            fontWeight: 300,
                            lineHeight: 1.08,
                            letterSpacing: '-0.01em',
                            color: '#ffffff',
                            textShadow: '0 2px 24px rgba(0,0,0,0.9)',
                        }}>Your Life,</div>
                        <div style={{
                            fontSize: 'clamp(1.5rem, 3.2vw, 2.6rem)',
                            fontWeight: 500,
                            fontStyle: 'italic',
                            lineHeight: 1.08,
                            letterSpacing: '-0.01em',
                            color: '#EAB308',
                        }}>Your Fragrance.</div>
                    </div>

                    {/* Body */}
                    <p style={{
                        fontSize: '0.78rem',
                        lineHeight: 1.75,
                        color: 'rgba(210,210,200,0.82)',
                        fontWeight: 400,
                        textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                        margin: 0,
                    }}>
                        Unlock wellness &amp; wealth with CoProfit Global.<br />
                        Starting at just ₱8,998 — your first step toward<br />
                        financial freedom and personal transformation.
                    </p>

                    {/* CTA row */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{
                            fontSize: '0.62rem',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            padding: '10px 20px',
                            border: '1px solid rgba(234,179,8,0.5)',
                            background: 'transparent',
                            color: 'rgba(234,179,8,0.9)',
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,179,8,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                            Learn More
                        </button>
                        <button style={{
                            fontSize: '0.62rem',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            padding: '10px 20px',
                            border: '1px solid #EAB308',
                            background: '#EAB308',
                            color: '#0a0a0a',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FCD34D'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EAB308'; }}>
                            Explore Collection
                        </button>
                    </div>

                    {/* ── VIDEO CONTROLS ROW ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        paddingTop: '4px',
                    }}>
                        {/* Play/Pause */}
                        <button
                            onClick={toggleHeroPlay}
                            title={heroPlaying ? 'Pause' : 'Play'}
                            style={{
                                width: '40px', height: '40px',
                                borderRadius: '50%',
                                border: '1px solid rgba(234,179,8,0.55)',
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(12px)',
                                color: '#EAB308',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.22s',
                                flexShrink: 0,
                                marginBottom: '15px',
                            }}
                            onMouseEnter={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(234,179,8,0.2)';
                                b.style.borderColor = '#EAB308';
                                b.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(0,0,0,0.5)';
                                b.style.borderColor = 'rgba(234,179,8,0.55)';
                                b.style.transform = 'scale(1)';
                            }}
                        >
                            {heroPlaying ? <Pause size={15} /> : <Play size={15} />}
                        </button>

                        {/* Mute/Unmute */}
                        <button
                            onClick={toggleHeroMute}
                            title={heroMuted ? 'Unmute' : 'Mute'}
                            style={{
                                width: '40px', height: '40px',
                                borderRadius: '50%',
                                border: '1px solid rgba(234,179,8,0.55)',
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(12px)',
                                color: '#EAB308',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.22s',
                                flexShrink: 0,
                                marginBottom: '15px',
                            }}
                            onMouseEnter={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(234,179,8,0.2)';
                                b.style.borderColor = '#EAB308';
                                b.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(0,0,0,0.5)';
                                b.style.borderColor = 'rgba(234,179,8,0.55)';
                                b.style.transform = 'scale(1)';
                            }}
                        >
                            {heroMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>

                        {/* Fullscreen */}
                        <button
                            onClick={toggleHeroFullscreen}
                            title={heroFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            style={{
                                width: '40px', height: '40px',
                                borderRadius: '50%',
                                border: '1px solid rgba(234,179,8,0.55)',
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(12px)',
                                color: '#EAB308',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.22s',
                                flexShrink: 0,
                                marginBottom: '15px',
                            }}
                            onMouseEnter={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(234,179,8,0.2)';
                                b.style.borderColor = '#EAB308';
                                b.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={e => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.background = 'rgba(0,0,0,0.5)';
                                b.style.borderColor = 'rgba(234,179,8,0.55)';
                                b.style.transform = 'scale(1)';
                            }}
                        >
                            {heroFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                        </button>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '20px', background: 'rgba(234,179,8,0.25)', margin: '0 2px', marginBottom: '15px', }} />

                        {/* Status text */}
                        <span style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '0.55rem',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: 'rgba(234,179,8,0.55)',
                            marginBottom: '15px',
                        }}>
                            {heroPlaying ? '▶ Live' : '⏸ Paused'} · {heroMuted ? 'Muted' : 'Audio On'}
                        </span>
                    </div>
                </div>

            </section>


            {/* Section 2: Perfumes & Packages — E-commerce Style */}
            <div id="collections">
                <CollectionsSection individualProducts={individualProducts} productPackages={productPackages} />
            </div>

            {/* Section 3: Latest Blogs */}
            <div id="blogs">
                <BlogSection blogPosts={blogPosts} />
            </div>

            {/* Section 4: Team Members - Family Tree */}
            <div id="team">
                <TeamSection />
            </div>

            {/* Section 5: Mission & Vision */}
            <div id="core-values">
                <MissionVisionSection />
            </div>

            {/* ── FOOTER ── */}
            <footer id="contact" className="relative bg-[#060606] border-t border-yellow-700/30 overflow-hidden">

                {/* background dot grid */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage: `radial-gradient(circle, #ca8a04 1px, transparent 1px)`,
                        backgroundSize: '28px 28px',
                    }}
                />
                {/* top glow */}
                <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-175 h-40 bg-yellow-600/6 blur-3xl rounded-full" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* ── OFFICE CARDS ── */}
                    <div className="py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

                        {/* Head Office */}
                        <div className="rounded-xl border border-yellow-600/25 bg-yellow-600/4 p-5 flex flex-col gap-3 hover:border-yellow-500/50 transition-colors duration-300">
                            <div className="flex items-center gap-2">
                                {/* pin icon */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500 shrink-0">
                                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                                <span className="text-yellow-500 text-[10px] font-bold tracking-[0.3em] uppercase">Head Office</span>
                            </div>
                            <div className="w-8 h-px bg-yellow-600/40" />
                            <p className="text-white text-sm font-semibold leading-snug">{offices.headOffice.name}</p>
                            <div className="mt-auto space-y-1 pt-2 border-t border-white/5">
                                <p className="text-gray-500 text-xs">Owner: <span className="text-gray-300">{offices.headOffice.owner}</span></p>
                                {offices.headOffice.address !== 'TBA' && (
                                    <p className="text-gray-500 text-xs">{offices.headOffice.address}</p>
                                )}
                                {offices.headOffice.phone !== 'TBA' && (
                                    <p className="text-yellow-600/80 text-xs">{offices.headOffice.phone}</p>
                                )}
                            </div>
                        </div>

                        {/* Hub Offices */}
                        {offices.hubs.map((hub, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl border border-white/5 bg-white/2 p-5 flex flex-col gap-3 hover:border-yellow-600/30 hover:bg-yellow-600/3 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-700 shrink-0">
                                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                    <span className="text-yellow-700 text-[10px] font-bold tracking-[0.3em] uppercase">Hub Office</span>
                                </div>
                                <div className="w-6 h-px bg-yellow-700/30" />
                                <p className="text-white text-sm font-semibold leading-snug">{hub.name}</p>
                                <div className="mt-auto space-y-1 pt-2 border-t border-white/5">
                                    <p className="text-gray-500 text-xs">Owner: <span className="text-gray-300">{hub.owner}</span></p>
                                    {hub.address && hub.address !== 'TBA' && (
                                        <p className="text-gray-500 text-xs leading-relaxed">{hub.address}</p>
                                    )}
                                    {hub.phone && hub.phone !== 'TBA' && (
                                        <p className="text-yellow-600/80 text-xs">{hub.phone}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── TOP BAND: brand + tagline ── */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-10 border-b border-white/5">
                        <div>
                            <p className="text-yellow-500 font-bold text-xl tracking-tight">CoProfitGlobal</p>
                            <p className="text-gray-600 text-xs tracking-widest uppercase mt-0.5">© 2026 CoProfit Global Corporation. All rights reserved.</p>
                        </div>
                        <p className="text-gray-600 text-xs text-center sm:text-right max-w-xs leading-relaxed">
                            Building communities through quality products&nbsp;&amp;&nbsp;shared prosperity.
                        </p>
                    </div>

                </div>
            </footer>
        </div>
    );
}