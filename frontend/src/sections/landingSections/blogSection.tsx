import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar, Tag } from 'lucide-react';

interface BlogPost {
    id: number;
    title: string;
    description: string;
    date: string;
    category: string;
    thumbnail: string | null;
    thumbnailLabel: string;
    bannerGradient?: string;
    placeholderImg?: string;
}

interface BlogSectionProps {
    blogPosts?: BlogPost[];
}

const SAMPLE_POSTS: BlogPost[] = [
    {
        id: 1,
        title: 'CoProfit Global: Your Path to Financial Freedom',
        description:
            'Discover how CoProfit Global empowers everyday Filipinos to build sustainable income streams through our proven network marketing system and premium product line.',
        date: 'Feb 20, 2026',
        category: 'Business',
        thumbnail: null,
        thumbnailLabel: 'CoProfit Global',
        bannerGradient: 'from-yellow-900/60 to-slate-900',
    },
    {
        id: 2,
        title: 'The Power of Network Marketing in the Philippines',
        description:
            'Network marketing has transformed thousands of lives across the Philippines. Learn the strategies top earners use to grow their teams and generate consistent passive income.',
        date: 'Dec 18, 2025',
        category: 'Marketing',
        thumbnail: null,
        thumbnailLabel: 'Network Marketing',
        bannerGradient: 'from-amber-900/60 to-slate-900',
    },
    {
        id: 3,
        title: 'RelieFlex: Science Behind the Scent',
        description:
            "Our flagship product RelieFlex Liniment Oil is more than just a perfume — it's a fusion of aromatherapy and wellness science. Explore the ingredients and their benefits.",
        date: 'Nov 21, 2025',
        category: 'Product',
        thumbnail: null,
        thumbnailLabel: 'RelieFlex',
        bannerGradient: 'from-yellow-800/50 to-slate-900',
    },
    {
        id: 4,
        title: 'Introducing CoProfit Global',
        description:
            'We are proud to officially launch CoProfit Global Corporation — a bold new chapter in Philippine network marketing. Find out what sets us apart from the rest.',
        date: 'Nov 19, 2025',
        category: 'Product',
        thumbnail: null,
        thumbnailLabel: 'Experience Liftoff',
        bannerGradient: 'from-orange-900/50 to-slate-900',
    },
    {
        id: 5,
        title: 'Sales Mastery Bootcamp — Cebu City',
        description:
            'A full-day intensive training designed to sharpen your sales skills, objection-handling techniques, and closing strategies. Open to all active distributors.',
        date: 'Mar 5, 2026',
        category: 'Training',
        thumbnail: 'https://picsum.photos/seed/training1/400/300',
        thumbnailLabel: '',
        bannerGradient: 'from-teal-900/70 to-slate-900',
    },
    {
        id: 6,
        title: 'Leadership Development Program — Batch 3',
        description:
            'Our flagship leadership program returns for its third batch. Build the mindset, habits, and communication skills needed to lead a high-performing team.',
        date: 'Mar 12, 2026',
        category: 'Training',
        thumbnail: 'https://picsum.photos/seed/training2/400/300',
        thumbnailLabel: '',
        bannerGradient: 'from-cyan-900/70 to-slate-900',
    },
    {
        id: 7,
        title: 'CoProfit Grand Recognition Night 2026',
        description:
            'Join us as we celebrate our top performers and milestone achievers at our annual Grand Recognition Night. A night of inspiration, awards, and community.',
        date: 'Apr 4, 2026',
        category: 'Event',
        thumbnail: 'https://picsum.photos/seed/event1/400/300',
        thumbnailLabel: '',
        bannerGradient: 'from-rose-900/60 to-slate-900',
    },
    {
        id: 8,
        title: 'National Convention — Bohol',
        description:
            'Our biggest gathering of the year! Network with distributors from all over the Philippines, attend keynote talks, and be the first to see our new product launches.',
        date: 'May 10, 2026',
        category: 'Event',
        thumbnail: 'https://picsum.photos/seed/event2/400/300',
        thumbnailLabel: '',
        bannerGradient: 'from-purple-900/60 to-slate-900',
    },
];

const CATEGORY_COLORS: Record<string, string> = {
    Business:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Marketing: 'bg-amber-500/10  text-amber-400  border-amber-500/30',
    Product:   'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Training:  'bg-teal-500/10   text-teal-400   border-teal-500/30',
    Event:     'bg-rose-500/10   text-rose-400   border-rose-500/30',
};

const BANNER_ICONS: Record<string, string> = {
    Business:  '💼',
    Marketing: '📈',
    Product:   '✨',
    Training:  '🎓',
    Event:     '🎉',
};

const VISIBLE_COUNTS = { sm: 1, md: 2, lg: 4 };

/* ─────────────────────────────────────────────
   Magazine Modal  —  Option A: side-by-side
───────────────────────────────────────────── */
function MagazineModal({ post, onClose }: { post: BlogPost; onClose: () => void }) {
    const icon     = BANNER_ICONS[post.category]   ?? '📝';
    const catColor = CATEGORY_COLORS[post.category] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/30';

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const body = [
        post.description,
        'In today\'s rapidly evolving landscape, understanding the fundamentals is more critical than ever. Our team has spent months researching, gathering testimonials, and synthesizing insights from top performers across the Philippines.',
        'What separates consistent earners from the rest isn\'t luck — it\'s a repeatable system. By following a structured approach, anyone willing to put in the effort can replicate results and build a sustainable stream of income.',
        'We invite you to take the next step. Attend our upcoming orientations, connect with your upline, and immerse yourself in the community. The resources are here. The support is here. All that\'s left is your decision.',
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <style>{`
                @keyframes magazineIn {
                    from { opacity:0; transform: scale(0.9) translateY(20px); }
                    to   { opacity:1; transform: scale(1)   translateY(0); }
                }
                @keyframes fadeSlideIn {
                    from { opacity:0; transform: translateY(10px); }
                    to   { opacity:1; transform: translateY(0); }
                }
                .mag-body-para { animation: fadeSlideIn 0.45s ease both; }
                .mag-body-para:nth-child(1) { animation-delay: 0.12s; }
                .mag-body-para:nth-child(2) { animation-delay: 0.22s; }
                .mag-body-para:nth-child(3) { animation-delay: 0.32s; }
                .mag-body-para:nth-child(4) { animation-delay: 0.42s; }
                .mag-rule {
                    border: none;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(202,138,4,0.6), rgba(202,138,4,0.15));
                    margin: 1rem 0;
                }
                .mag-scroll::-webkit-scrollbar { width: 4px; }
                .mag-scroll::-webkit-scrollbar-track { background: transparent; }
                .mag-scroll::-webkit-scrollbar-thumb { background: rgba(202,138,4,0.3); border-radius: 2px; }
            `}</style>

            {/* Modal shell */}
            <div
                className="relative w-full max-w-3xl rounded-2xl overflow-hidden flex"
                style={{
                    maxHeight: '88vh',
                    background: '#0d0d0a',
                    border: '1px solid rgba(202,138,4,0.35)',
                    boxShadow: '0 0 80px rgba(202,138,4,0.12), 0 40px 80px rgba(0,0,0,0.85)',
                    animation: 'magazineIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── LEFT: Photo column — full height, never cropped ── */}
                <div
                    className="relative shrink-0 flex-col"
                    style={{ width: '40%', display: 'flex' }}
                >
                    {post.thumbnail ? (
                        <img
                            src={post.thumbnail}
                            alt={post.title}
                            className="w-full h-full object-cover object-top"
                            style={{ minHeight: '100%' }}
                            draggable={false}
                        />
                    ) : (
                        <div
                            className={`w-full flex-1 bg-linear-to-b ${post.bannerGradient ?? 'from-slate-800 to-slate-900'} flex flex-col items-center justify-center gap-3`}
                            style={{ minHeight: '400px' }}
                        >
                            <span className="text-7xl">{icon}</span>
                            {post.thumbnailLabel && (
                                <span className="text-white/60 text-sm font-semibold tracking-widest uppercase text-center px-4">
                                    {post.thumbnailLabel}
                                </span>
                            )}
                            {/* grid texture */}
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,.08) 1px, transparent 1px)',
                                backgroundSize: '28px 28px',
                            }} />
                        </div>
                    )}

                    {/* Right-edge fade to blend into article body */}
                    <div
                        className="absolute inset-y-0 right-0 w-12 pointer-events-none"
                        style={{ background: 'linear-gradient(to right, transparent, #0d0d0a)' }}
                    />

                    {/* Category badge */}
                    <div className="absolute bottom-4 left-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${catColor}`}>
                            {icon} {post.category}
                        </span>
                    </div>
                </div>

                {/* ── RIGHT: Article body ── */}
                <div
                    className="mag-scroll flex-1 overflow-y-auto py-7 pr-7 pl-4"
                    style={{ background: '#0d0d0a' }}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white hover:bg-black/80 transition-all duration-150 backdrop-blur-sm z-10"
                    >
                        <X size={15} />
                    </button>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 pr-8">
                        <span className="flex items-center gap-1.5"><Calendar size={11} />{post.date}</span>
                        <span className="flex items-center gap-1.5"><Tag size={11} />{post.category}</span>
                    </div>

                    {/* Headline */}
                    <h2
                        className="text-white  leading-tight mb-3"
                        style={{ fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', letterSpacing: '-0.01em' }}
                    >
                        {post.title}
                    </h2>

                    <hr className="mag-rule" />

                    {/* Body paragraphs with drop cap */}
                    {body.map((para, i) => (
                        <p
                            key={i}
                            className="mag-body-para text-gray-300 leading-relaxed mb-4"
                            style={{ fontSize: '0.875rem', textAlign: 'justify' }}
                        >
                            {i === 0 && (
                                <span style={{
                                    float: 'left',
                                    fontSize: '3.4rem',
                                    lineHeight: '0.78',
                                    marginRight: '7px',
                                    marginTop: '5px',
                                    color: '#eab308',
                                    fontFamily: 'Georgia, serif',
                                    fontWeight: 900,
                                }}>
                                    {para[0]}
                                </span>
                            )}
                            {i === 0 ? para.slice(1) : para}
                        </p>
                    ))}

                    <hr className="mag-rule" />

                    {/* Pull quote */}
                    <blockquote
                        className="border-l-4 border-yellow-500 pl-4 my-4 italic text-yellow-300/75"
                        style={{ fontSize: '0.9rem', fontFamily: 'Georgia, serif' }}
                    >
                        "The resources are here. The support is here. All that's left is your decision."
                    </blockquote>

                    {/* CTA */}
                    <button
                        onClick={onClose}
                        className="mt-3 px-6 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-all duration-150 active:scale-95"
                    >
                        Close Article
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Main Section
───────────────────────────────────────────── */
export default function BlogSection({ blogPosts }: BlogSectionProps) {
    const posts = blogPosts && blogPosts.length > 0 ? blogPosts : SAMPLE_POSTS;

    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [index, setIndex]          = useState(0);
    const [visibleCount, setVisible]  = useState(VISIBLE_COUNTS.lg);
    const [isDragging, setDragging]   = useState(false);
    const dragStartX  = useRef(0);
    const dragDelta   = useRef(0);
    const autoRef     = useRef<ReturnType<typeof setInterval> | null>(null);

    const maxIndex = Math.max(0, posts.length - visibleCount);

    // Responsive visible count
    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            setVisible(w < 640 ? VISIBLE_COUNTS.sm : w < 1024 ? VISIBLE_COUNTS.md : VISIBLE_COUNTS.lg);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // Clamp index when visible count changes
    useEffect(() => {
        setIndex(i => Math.min(i, Math.max(0, posts.length - visibleCount)));
    }, [visibleCount, posts.length]);

    const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
    const next = useCallback(() => setIndex(i => Math.min(maxIndex, i + 1)), [maxIndex]);

    const stopAuto  = useCallback(() => { if (autoRef.current) clearInterval(autoRef.current); }, []);
    const startAuto = useCallback(() => {
        stopAuto();
        autoRef.current = setInterval(() => setIndex(i => (i >= maxIndex ? 0 : i + 1)), 4000);
    }, [maxIndex, stopAuto]);

    useEffect(() => { startAuto(); return stopAuto; }, [startAuto, stopAuto]);

    // Pointer drag support
    const onPointerDown = (e: React.PointerEvent) => {
        setDragging(true);
        dragStartX.current = e.clientX;
        dragDelta.current  = 0;
        stopAuto();
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        dragDelta.current = e.clientX - dragStartX.current;
    };
    const onPointerUp = () => {
        if (isDragging) {
            if (dragDelta.current < -50)      next();
            else if (dragDelta.current > 50)  prev();
        }
        setDragging(false);
        startAuto();
    };

    // Each card takes exactly 1/visibleCount of the track
    const cardPct = 100 / visibleCount;

    return (
        <>
        <section
            id="blog"
            className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-b border-yellow-600"
            onMouseEnter={stopAuto}
            onMouseLeave={startAuto}
        >
            <div className="max-w-7xl mx-auto">

                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-3 flex-wrap gap-4">
                    <div>
                        <h2 className="text-3xl text-white">
                            Latest Blogs
                            <span className="text-xl text-gray-400 font-normal ml-3">Trainings &amp; Events</span>
                        </h2>
                        <p className="text-gray-500 text-sm mt-2 max-w-xl">
                            Stay up to date with our latest business insights, product stories, upcoming trainings, and company events.
                        </p>
                    </div>

                    {/* View all + Arrow controls */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button className="px-5 py-2 rounded-full border border-yellow-600/50 text-yellow-500 text-sm font-medium hover:bg-yellow-600/10 hover:border-yellow-500 active:scale-95 transition-all duration-150">
                            View all →
                        </button>
                        <button
                            onClick={() => { prev(); startAuto(); }}
                            disabled={index === 0}
                            aria-label="Previous"
                            className="w-9 h-9 flex items-center justify-center rounded-full border border-yellow-600/40 text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90 transition-all duration-150"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => { next(); startAuto(); }}
                            disabled={index === maxIndex}
                            aria-label="Next"
                            className="w-9 h-9 flex items-center justify-center rounded-full border border-yellow-600/40 text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90 transition-all duration-150"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Category legend ── */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {Object.entries(CATEGORY_COLORS).map(([cat, cls]) => (
                        <span key={cat} className={`text-xs font-medium px-3 py-1 rounded-full border ${cls}`}>
                            {BANNER_ICONS[cat]} {cat}
                        </span>
                    ))}
                </div>

                {/* ── Carousel viewport ── */}
                <div
                    className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                >
                    {/* Track — slides left/right */}
                    <div
                        className="flex"
                        style={{
                            transform:  `translateX(-${index * cardPct}%)`,
                            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                    >
                        {posts.map((post) => {
                            const catColor = CATEGORY_COLORS[post.category] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/30';
                            const icon     = BANNER_ICONS[post.category] ?? '📝';

                            return (
                                <div
                                    key={post.id}
                                    className="shrink-0 px-3 box-border"
                                    style={{ width: `${cardPct}%` }}
                                >
                                    <div className="group bg-slate-900 rounded-xl overflow-hidden border border-yellow-600/20 hover:border-yellow-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/5 flex flex-col h-full">

                                        {/* Thumbnail / Banner */}
                                        <div className="relative overflow-hidden bg-slate-800 aspect-4/3 shrink-0">
                                            {post.thumbnail ? (
                                                <img
                                                    src={post.thumbnail}
                                                    alt={post.title}
                                                    draggable={false}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 pointer-events-none"
                                                />
                                            ) : (
                                                <div className={`w-full h-full bg-linear-to-br ${post.bannerGradient ?? 'from-slate-800 to-slate-900'} flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition duration-500`}>
                                                    <span className="text-4xl">{icon}</span>
                                                    {post.thumbnailLabel && (
                                                        <span className="text-white/70 text-sm font-semibold text-center px-4 leading-snug">
                                                            {post.thumbnailLabel}
                                                        </span>
                                                    )}
                                                    <div
                                                        className="absolute inset-0 opacity-10"
                                                        style={{
                                                            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                                                            backgroundSize: '24px 24px',
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm ${catColor}`}>
                                                {post.category}
                                            </span>
                                        </div>

                                        {/* Card body */}
                                        <div className="p-5 flex flex-col flex-1">
                                            <p className="text-gray-500 text-xs mb-2">{post.date}</p>
                                            <h3 className="text-white text-base font-semibold leading-snug mb-2 group-hover:text-yellow-400 transition-colors duration-200 line-clamp-2">
                                                {post.title}
                                            </h3>
                                            <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 flex-1 mb-4">
                                                {post.description}
                                            </p>
                                            <button
                                                onClick={() => setSelectedPost(post)}
                                                className="text-sm text-yellow-500 font-semibold hover:text-yellow-400 transition-colors duration-150 flex items-center gap-1 self-start mt-auto"
                                            >
                                                Read more <span className="text-base">›</span>
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Dot indicators ── */}
                <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { setIndex(i); startAuto(); }}
                            aria-label={`Go to slide ${i + 1}`}
                            className={`rounded-full transition-all duration-300 ${
                                i === index
                                    ? 'w-6 h-2 bg-yellow-500'
                                    : 'w-2 h-2 bg-yellow-600/30 hover:bg-yellow-600/60'
                            }`}
                        />
                    ))}
                </div>

            </div>
        </section>

        {/* ── Magazine Modal ── */}
        {selectedPost && (
            <MagazineModal post={selectedPost} onClose={() => setSelectedPost(null)} />
        )}
        </>
    );
}