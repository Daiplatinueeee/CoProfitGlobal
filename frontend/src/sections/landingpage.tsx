'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Package, ShoppingCart, Presentation, Split as Spotlight, Pause, Play, VolumeX, Volume2, Maximize, Minimize } from 'lucide-react';

import { useNavigate } from "react-router-dom"

import prod1 from "../assets/prod2.jpeg"

import training1 from "../assets/video refs/0c81c791-4c78-4c3e-a3ed-26d13b0244e9.mp4"

import pk1 from "../assets/pk1.jpeg"
import pk2 from "../assets/pk2.jpeg"
import pk3 from "../assets/pk3.jpeg"
import pk4 from "../assets/pk4.jpeg"
import pk5 from "../assets/pk5.jpg"
import pk6 from "../assets/pk6.jpg"
import pk7 from "../assets/pk7.jpg"
import pk8 from "../assets/pk8.jpg"

import ms1 from "../assets/ms1.webp"
import ms2 from "../assets/ms2.webp"

import mar from "../assets/margery.webp"
import cel from "../assets/celso.webp"
import eli from "../assets/eli.webp"
import angelo from "../assets/angelou.webp"
import glende from "../assets/glende.webp"
import ryan from "../assets/ryan.webp"
import elmer from "../assets/elmer.webp"

export default function LandingPage() {
    const [selectedMember, setSelectedMember] = useState<number | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
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

    const teamMembers = [
        {
            id: 1,
            name: 'Margery M. Cartagenas',
            role: 'Chief Finance Officer',
            bio: 'Margery Cartagenas is a licensed pharmacist, long-time entrepreneur, and public servant. She has 10 years of experience in community healthcare, has successfully operated Pacific Cellular Shoppe for over 20 years, and currently serves as a Barangay Councilor of Guindarohan, Cebu, reflecting her strong commitment to community service and leadership.',
            image: mar,
        },
        {
            id: 2,
            name: 'Celso Lagancia',
            role: 'Chief Operating Officer',
            bio: 'Celso Lagancia is a Cebu-based businessman and entrepreneur from Camotes Island. Currently studying at the Maritime School of the University of Cebu, he serves as Chief Operating Officer of CoProfit Global Corporation, overseeing operations across three branches and managing over ten area stockists nationwide, contributing significantly to the company’s growth and success.',
            image: cel,
        },
        {
            id: 3,
            name: 'Eli Angela Cartagenas',
            role: 'VP - Marketing',
            bio: 'Eli Angela Cartagenas is a 22-year-old Cebu-based professional specializing in digital marketing and financial services. A Magna Cum Laude graduate of the University of San Jose–Recoletos, she works as a funnel designer and marketing specialist, a licensed Insurance Advisor for Manulife Philippines, and a Sales Associate at Industrious. Alongside her professional career, Eli brings a strong background in the performing arts, with experience in theatre, competitive singing, and performances on local, national, and international stages.',
            image: eli,
        },
        {
            id: 4,
            name: 'Angelou R. Trimidal',
            role: 'VP - Sales & Operations',
            bio: 'Angelou Rodriguez Trimidal is a 26-year-old entrepreneur from Surigao del Sur and a graduate of the University of Cebu – Lapu-Lapu and Mandaue with a degree in Hotel and Restaurant Management. He is the founder of Kamayo Unlimited Seafoods, a popular restaurant in Marigondon, Lapu-Lapu City, launched in 2022. Through strategic social media marketing and influencer collaborations, he drove rapid business growth, and since 2023, he has also been a top earner in a multi-level marketing company, leading a large team toward success.',
            image: angelo,
        },
        {
            id: 5,
            name: 'Glende S. Pastorpili',
            role: 'VP - Administrative  ',
            bio: 'Glende Sagarino Pastorpili is a dynamic entrepreneur and business leader from Carnaza Island, Daan Bantayan, Cebu. Currently pursuing a BS in Information Technology at the University of Cebu, she combines her academic training with extensive experience in the networking marketing industry. Formerly serving as Executive Director and now Vice President for Administration, Glende is recognized for her strategic leadership, commitment to continuous learning, and passion for empowering others through mentorship and professional development.',
            image: glende,
        },
        {
            id: 6,
            name: 'Ryan H. Cartagenas',
            role: 'VP - Research & Business Development',
            bio: 'Ryan Cartagenas is an electronics and communications engineering graduate from the University of San Jose–Recoletos with a strong background in the tech industry. Formerly a Production Manager at Kyocera Kinseki Corporation Philippines, he played a key role in semiconductor technology transfer and manufacturing operations. He is now an entrepreneur and the proprietor of Eli Delights Cafe, a Sebucha Cafe franchisee, demonstrating his adaptability and leadership across industries.',
            image: ryan,
        },
        {
            id: 7,
            name: 'Elmer Alo Desamparado',
            role: 'Chief Executive Officer & President',
            bio: 'Elmer Alo Desamparado is a servant-visionary leader from Bantayan Island, Cebu, with a background in education, network marketing, and business leadership. A graduate of the University of Cebu with a degree in Secondary Education major in General Science and Physics, he is a licensed Financial Advisor and Real Estate Salesperson. Currently serving as CEO and President of CoProfit Global Corporation, Elmer oversees multiple branches and area stockists nationwide, bringing extensive leadership experience, resilience, and a strong commitment to excellence and professional growth.',
            image: elmer,
        },
    ];

    const individualProducts = [
        { id: 1, name: 'RelieFlex Liniment Oil', price: '₱1,500', image: prod1, category: 'Liniment oil' },
    ];

    const mainVideo = {
        thumbnail: training1,
        url: training1,
    };

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
            name: 'C7 Modena Town Square, Tunghaan, Minglanilla Cebu',
            owner: 'TBA',
            address: 'TBA',
            phone: 'TBA',
        },
        hubs: [
            {
                name: 'Mahayag San Miguel, Bohol',
                owner: 'Estela Colarte',
                address: 'TBA',
                phone: '# 0997 417 4308',
            },
            {
                name: 'Tagbiliran Bohol',
                owner: 'Atty. Jessie Ancog',
                address: 'TBA',
                phone: 'TBA',
            },
            {
                name: 'Tagbilaran Bohol',
                owner: 'Atty. Jessie Ancog',
                address: 'TBA',
                phone: 'TBA',
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

    const navigateToLogin = () => {
        navigate("/auth")
    }

    return (
        <div className="w-full overflow-hidden bg-slate-950">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-slate-950/95 backdrop-blur z-50 border-b border-yellow-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="text-2xl font-bold text-yellow-500">CoProfitGlobal</div>
                    <div className="hidden md:flex gap-8 items-center">
                        <a href="#collections" className="text-white hover:text-yellow-500 transition">Packages</a>
                        <a href="#products-list" className="text-white hover:text-yellow-500 transition">Products</a>
                        <a href="#team" className="text-white hover:text-yellow-500 transition">Team</a>
                        <a href="#videos" className="text-white hover:text-yellow-500 transition">Videos</a>
                        <a href="#mission" className="text-white hover:text-yellow-500 transition">Mission</a>
                        <a href="#contact" className="text-white hover:text-yellow-500 transition">Contact</a>
                    </div>
                    <button className="bg-yellow-500 text-slate-950 px-6 py-2 rounded-full font-semibold hover:bg-yellow-400 transition " onClick={navigateToLogin}  >
                        Login
                    </button>
                </div>
            </nav>

            {/* Section 1: Cinematic Hero */}
            <section
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
                            fontWeight: 700,
                            fontStyle: 'italic',
                            lineHeight: 1.08,
                            letterSpacing: '-0.01em',
                            color: '#EAB308',
                            textShadow: '0 0 40px rgba(234,179,8,0.4), 0 2px 24px rgba(0,0,0,0.9)',
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

                {/* Gold thin horizontal rule above bottom bar */}
                <div style={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '44px',
                    right: '44px',
                    height: '1px',
                    zIndex: 15,
                    background: 'linear-gradient(to right, rgba(234,179,8,0.5), rgba(234,179,8,0.08) 60%, rgba(234,179,8,0))',
                }} />

            </section>


            {/* Section 2: Products by Package (Collections) */}
            <section id="collections" className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-b border-yellow-600">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 flex flex-col items-center">
                        <Package className='text-white mb-3 h-11.5 w-11.5' strokeWidth={1.5} />
                        <h2 className="text-5xl text-white mb-4">Our Packages</h2>
                        <p className="text-xl text-gray-300">Curated packages designed for every taste</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {productPackages.map((pkg) => (
                            <div
                                key={pkg.id}
                                className="group bg-slate-900 rounded-lg overflow-hidden hover:shadow-2xl transition duration-300 border border-yellow-600/30 hover:border-yellow-500"
                            >
                                <div className="overflow-hidden bg-slate-800 h-100">
                                    <img
                                        src={pkg.image || "/placeholder.svg"}
                                        alt={pkg.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                </div>
                                <div className="p-6">
                                    <h3 className="text-2xl text-white mb-2">{pkg.name}</h3>
                                    <p className="text-gray-400 mb-4">{pkg.description}</p>
                                    <button className="text-yellow-500 font-semibold hover:text-yellow-400 transition">
                                        View Package →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="products-list" className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-b border-yellow-600">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 flex flex-col items-center">
                        <ShoppingCart className='text-white mb-3 h-11.5 w-11.5' strokeWidth={1.5} />
                        <h2 className="text-5xl text-white mb-4">Our Products</h2>
                        <p className="text-xl text-gray-300">Explore our complete product range</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {individualProducts.map((product) => (
                            <div
                                key={product.id}
                                className="group bg-slate-900 rounded-lg overflow-hidden hover:shadow-2xl transition duration-300 border border-yellow-600/30 hover:border-yellow-500"
                            >
                                <div className="overflow-hidden bg-slate-800 h-72">
                                    <img
                                        src={product.image || "/placeholder.svg"}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    />
                                </div>
                                <div className="p-6">
                                    <p className="text-yellow-500 text-sm font-semibold mb-2">{product.category}</p>
                                    <h3 className="text-2xl text-white mb-2">{product.name}</h3>
                                    <p className="text-yellow-400 text-lg font-bold mb-4">{product.price}</p>
                                    <button className="w-full bg-yellow-500 text-slate-950 py-2 rounded font-semibold hover:bg-yellow-400 transition">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 3: Video Section */}
            <section id="videos" className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-b border-yellow-600">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 flex flex-col items-center">
                        <Presentation className='text-white mb-3 h-11.5 w-11.5' strokeWidth={1.5} />
                        <h2 className="text-5xl text-white mb-4">Our Training Programs</h2>
                        <p className="text-xl text-gray-300">Watch our journey and passion in motion</p>
                    </div>

                    <div className="relative w-full">
                        <div className="relative overflow-hidden rounded-lg border-2 border-yellow-600 aspect-video bg-slate-900 h-full w-full">
                            <iframe
                                ref={videoRef}
                                width="100%"
                                height="100%"
                                src={undefined}
                                frameBorder="0"
                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share;"
                                allowFullScreen
                                className="absolute inset-0"
                            />
                            {!isVideoPlaying && (
                                <img
                                    src={mainVideo.thumbnail || "/placeholder.svg"}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: Team Members - Family Tree */}
            <section id="team" className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-b border-yellow-600">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 flex flex-col items-center">
                        <Spotlight className='text-white mb-3 h-11.5 w-11.5' strokeWidth={1.5} />
                        <h2 className="text-5xl text-white mb-4">Our Leadership Tree</h2>
                        <p className="text-xl text-gray-300">Meet the visionaries behind our brand - click to learn more</p>
                    </div>

                    {/* Family Tree Container */}
                    <div className="relative w-full h-auto min-h-screen flex flex-col items-center justify-start py-12 px-4">
                        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} preserveAspectRatio="xMidYMid">
                            {/* Line from CEO to COO */}
                            <line x1="50%" y1="120" x2="50%" y2="180" stroke="#eab308" strokeWidth="2" />
                            <line x1="50%" y1="180" x2="25%" y2="180" stroke="#eab308" strokeWidth="2" />
                            <line x1="25%" y1="180" x2="25%" y2="240" stroke="#eab308" strokeWidth="2" />

                            {/* Horizontal line connecting to other VPs */}
                            <line x1="25%" y1="420" x2="75%" y2="420" stroke="#eab308" strokeWidth="2" />

                            {/* Lines from horizontal to VPs */}
                            <line x1="25%" y1="420" x2="25%" y2="480" stroke="#eab308" strokeWidth="2" />
                            <line x1="35%" y1="420" x2="35%" y2="480" stroke="#eab308" strokeWidth="2" />
                            <line x1="50%" y1="420" x2="50%" y2="480" stroke="#eab308" strokeWidth="2" />
                            <line x1="65%" y1="420" x2="65%" y2="480" stroke="#eab308" strokeWidth="2" />
                            <line x1="75%" y1="420" x2="75%" y2="480" stroke="#eab308" strokeWidth="2" />
                        </svg>

                        {/* CEO - Top Center */}
                        <div className="relative z-10 mb-20">
                            <div
                                className="relative cursor-pointer group w-56"
                                onClick={() => setSelectedMember(selectedMember === 7 ? null : 7)}
                            >
                                <div className="overflow-hidden rounded-lg bg-slate-900 h-64 mb-4 relative border-2 border-yellow-500 group-hover:border-yellow-400 transition duration-300 shadow-lg shadow-yellow-500/50 group-hover:shadow-yellow-500/80">
                                    <img
                                        src={elmer || "/placeholder.svg"}
                                        alt="Elmer Alo Desamparado"
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <p className="text-yellow-500 font-semibold text-center">Click to learn more</p>
                                    </div>
                                </div>
                                <h3 className="text-xl text-white text-center font-bold">Elmer Alo Desamparado</h3>
                                <p className="text-yellow-500 font-semibold text-center">Chief Executive Officer & President</p>
                            </div>
                        </div>

                        {/* COO - Lower Left */}
                        <div className="absolute top-72 left-4 md:left-12 z-10">
                            <div
                                className="relative cursor-pointer group w-48"
                                onClick={() => setSelectedMember(selectedMember === 2 ? null : 2)}
                            >
                                <div className="overflow-hidden rounded-lg bg-slate-900 h-56 mb-3 relative border-2 border-yellow-500 group-hover:border-yellow-400 transition duration-300 shadow-lg shadow-yellow-500/30 group-hover:shadow-yellow-500/60">
                                    <img
                                        src={cel || "/placeholder.svg"}
                                        alt="Celso Lagancia"
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <p className="text-yellow-500 font-semibold text-center text-sm">Click to learn more</p>
                                    </div>
                                </div>
                                <h3 className="text-lg text-white text-center font-bold">Celso Lagancia</h3>
                                <p className="text-yellow-500 font-semibold text-center text-sm">Chief Operating Officer</p>
                            </div>
                        </div>

                        {/* VPs - Branching from COO */}
                        <div className="absolute top-150 w-full px-4 flex justify-center gap-2 md:gap-8 flex-wrap z-10">
                            {/* CFO - Margery */}
                            <div
                                className="relative cursor-pointer group w-40"
                                onClick={() => setSelectedMember(selectedMember === 1 ? null : 1)}
                            >
                                <div className="overflow-hidden rounded-lg bg-slate-900 h-48 mb-3 relative border border-yellow-600/50 group-hover:border-yellow-500 transition duration-300 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40">
                                    <img
                                        src={mar || "/placeholder.svg"}
                                        alt="Margery M. Cartagenas"
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <p className="text-yellow-500 font-semibold text-center text-xs">Click to learn more</p>
                                    </div>
                                </div>
                                <h3 className="text-sm text-white text-center font-bold">Margery M. Cartagenas</h3>
                                <p className="text-yellow-500 font-semibold text-center text-xs">Chief Finance Officer</p>
                            </div>

                            {/* VP Marketing - Eli */}
                            <div
                                className="relative cursor-pointer group w-40"
                                onClick={() => setSelectedMember(selectedMember === 3 ? null : 3)}
                            >
                                <div className="overflow-hidden rounded-lg bg-slate-900 h-48 mb-3 relative border border-yellow-600/50 group-hover:border-yellow-500 transition duration-300 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40">
                                    <img
                                        src={eli || "/placeholder.svg"}
                                        alt="Eli Angela Cartagenas"
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <p className="text-yellow-500 font-semibold text-center text-xs">Click to learn more</p>
                                    </div>
                                </div>
                                <h3 className="text-sm text-white text-center font-bold">Eli Angela Cartagenas</h3>
                                <p className="text-yellow-500 font-semibold text-center text-xs">VP - Marketing</p>
                            </div>

                            {/* VP Sales & Operations - Angelou */}
                            <div
                                className="relative cursor-pointer group w-40"
                                onClick={() => setSelectedMember(selectedMember === 4 ? null : 4)}
                            >
                                <div className="overflow-hidden rounded-lg bg-slate-900 h-48 mb-3 relative border border-yellow-600/50 group-hover:border-yellow-500 transition duration-300 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40">
                                    <img
                                        src={angelo || "/placeholder.svg"}
                                        alt="Angelou R. Trimidal"
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <p className="text-yellow-500 font-semibold text-center text-xs">Click to learn more</p>
                                    </div>
                                </div>
                                <h3 className="text-sm text-white text-center font-bold">Angelou R. Trimidal</h3>
                                <p className="text-yellow-500 font-semibold text-center text-xs">VP - Sales & Operations</p>
                            </div>

                            {/* VP Administrative - Glende */}
                            <div
                                className="relative cursor-pointer group w-40"
                                onClick={() => setSelectedMember(selectedMember === 5 ? null : 5)}
                            >
                                <div className="overflow-hidden rounded-lg bg-slate-900 h-48 mb-3 relative border border-yellow-600/50 group-hover:border-yellow-500 transition duration-300 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40">
                                    <img
                                        src={glende || "/placeholder.svg"}
                                        alt="Glende S. Pastorpili"
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <p className="text-yellow-500 font-semibold text-center text-xs">Click to learn more</p>
                                    </div>
                                </div>
                                <h3 className="text-sm text-white text-center font-bold">Glende S. Pastorpili</h3>
                                <p className="text-yellow-500 font-semibold text-center text-xs">VP - Administrative</p>
                            </div>

                            {/* VP Research & Development - Ryan */}
                            <div
                                className="relative cursor-pointer group w-40"
                                onClick={() => setSelectedMember(selectedMember === 6 ? null : 6)}
                            >
                                <div className="overflow-hidden rounded-lg bg-slate-900 h-48 mb-3 relative border border-yellow-600/50 group-hover:border-yellow-500 transition duration-300 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40">
                                    <img
                                        src={ryan || "/placeholder.svg"}
                                        alt="Ryan H. Cartagenas"
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <p className="text-yellow-500 font-semibold text-center text-xs">Click to learn more</p>
                                    </div>
                                </div>
                                <h3 className="text-sm text-white text-center font-bold">Ryan H. Cartagenas</h3>
                                <p className="text-yellow-500 font-semibold text-center text-xs">VP - Research & Dev</p>
                            </div>
                        </div>

                        {/* Spacing for content below */}
                        <div className="h-80" />
                    </div>
                </div>

                {/* Team Member Modal */}
                {selectedMember && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
                        <div
                            className="bg-slate-900 rounded-lg border-2 border-yellow-600 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="absolute top-4 right-4 bg-yellow-500 text-slate-950 p-2 rounded-full hover:bg-yellow-400 transition z-60"
                            >
                                <X size={24} />
                            </button>

                            {/* Left: Image */}
                            <div className="md:w-1/2 bg-slate-800 overflow-hidden rounded-t-lg md:rounded-t-none md:rounded-l-lg">
                                <img
                                    src={teamMembers.find((m) => m.id === selectedMember)?.image || "/placeholder.svg"}
                                    alt="Team Member"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Right: Biography */}
                            <div className="md:w-1/2 p-8 flex flex-col justify-center">
                                <h2 className="text-4xl font-bold text-white mb-2">
                                    {teamMembers.find((m) => m.id === selectedMember)?.name}
                                </h2>
                                <p className="text-yellow-500 text-lg font-semibold mb-6">
                                    {teamMembers.find((m) => m.id === selectedMember)?.role}
                                </p>
                                <div className="border-l-4 border-yellow-500 pl-6">
                                    <p className="text-gray-300 text-lg leading-relaxed">
                                        {teamMembers.find((m) => m.id === selectedMember)?.bio}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Section 5: Mission & Vision */}
            <section id="mission" className="py-20 px-4 sm:px-6 lg:px-8 bg-black min-h-screen flex items-center border-b border-yellow-600">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                        {/* Mission - Left Image */}
                        <div className="order-2 md:order-1">
                            <img
                                src={ms1 || "/placeholder.svg"}
                                alt="Mission"
                                className="w-full"
                            />
                        </div>

                        {/* Mission - Right Text */}
                        <div className="order-1 md:order-2 text-white space-y-6">
                            <div>
                                <h2 className="text-5xl mb-4 text-yellow-500">Core Values</h2>
                                <p className="text-lg text-gray-300 leading-relaxed">
                                    To create exceptional products that inspire confidence and elevate everyday moments. We are committed to delivering luxury that is accessible, sustainable, and meaningful to our community.
                                </p>
                            </div>
                            <div className="border-l-4 border-yellow-500 pl-6">
                                <p className="text-yellow-500 font-semibold mb-2">Core Values</p>
                                <ul className="text-gray-300 space-y-2">
                                    <li>• Commitment</li>
                                    <li>• Ownership</li>
                                    <li>• Passion</li>
                                    <li>• Respect</li>
                                    <li>• Optimism</li>
                                    <li>• Family</li>
                                    <li>• Integrity</li>
                                    <li>• Teamwork</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Vision - Left Text */}
                        <div className="text-white space-y-6">
                            <div>
                                <h2 className="text-5xl mb-4 text-yellow-500">Our Vision & Mission</h2>
                                <p className="text-lg text-gray-300 leading-relaxed">
                                    To become the global benchmark for luxury and authenticity. We envision a world where quality craftsmanship is celebrated, and every customer feels valued as part of our extended family.
                                </p>
                            </div>
                            <div className="border-l-4 border-yellow-500 pl-6">
                                <p className="text-yellow-500 font-semibold mb-2">2030 Goals</p>
                                <ul className="text-gray-300 space-y-2">
                                    <li>• Expand to 50 retail locations</li>
                                    <li>• 100% sustainable sourcing</li>
                                    <li>• Digital transformation</li>
                                    <li>• Global community impact</li>
                                </ul>
                            </div>
                        </div>

                        {/* Vision - Right Image */}
                        <div>
                            <img
                                src={ms2 || "/placeholder.svg"}
                                alt="Vision"
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 border-t border-yellow-600 py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

                        {/* Head Office */}
                        <div className="space-y-4">
                            <div className="border-l-4 border-yellow-500 pl-4">
                                <p className="text-yellow-500 font-semibold text-sm">
                                    HEAD OFFICE
                                </p>
                                <h3 className="text-xl font-bold text-white mt-2">
                                    {offices.headOffice.name}
                                </h3>
                            </div>
                            <div className="space-y-2">
                                <p className="text-white font-semibold">
                                    Owner: {offices.headOffice.owner}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    {offices.headOffice.address}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    {offices.headOffice.phone}
                                </p>
                            </div>
                        </div>

                        {/* Hub Offices */}
                        {offices.hubs.map((hub, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="border-l-4 border-yellow-500 pl-4">
                                    <p className="text-yellow-500 font-semibold text-sm">
                                        HUB OFFICE
                                    </p>
                                    <h3 className="text-xl font-bold text-white mt-2">
                                        {hub.name}
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-white font-semibold">
                                        Owner: {hub.owner}
                                    </p>
                                    <p className="text-gray-400 text-sm">{hub.address}</p>
                                    <p className="text-gray-400 text-sm">{hub.phone}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Bottom remains unchanged */}
                </div>
            </footer>
        </div>
    );
}