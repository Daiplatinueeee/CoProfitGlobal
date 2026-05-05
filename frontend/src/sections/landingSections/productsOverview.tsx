import { useState, useMemo, useRef, useEffect } from 'react';
import {
    ShoppingCart,
    ShoppingBag,
    Flower2,
    Trees,
    Moon,
    Droplets,
    Wind,
    Package,
    Search,
    ChevronDown,
    Check,
    Clock,
    Lock,
} from 'lucide-react';

interface Product {
    id: number;
    name: string;
    price: string;
    image: string;
    category: string;
}

interface Package {
    id: number;
    name: string;
    image: string;
    description: string;
}

interface PreviewItem {
    id: string;
    name: string;
    image: string;
    price?: string;
    category?: string;
    description?: string;
    isPackage: boolean;
}

interface CollectionsSectionProps {
    individualProducts: Product[];
    productPackages: Package[];
}

const CATEGORIES = [
    { label: 'All Products', icon: ShoppingBag,  key: 'all' },
    { label: 'Floral',       icon: Flower2,       key: 'Floral' },
    { label: 'Woody',        icon: Trees,         key: 'Woody' },
    { label: 'Oriental',     icon: Moon,          key: 'Oriental' },
    { label: 'Fresh',        icon: Droplets,      key: 'Fresh' },
    { label: 'Musk',         icon: Wind,          key: 'Musk' },
    { label: 'Packages',     icon: Package,       key: 'packages' },
];

const SORT_OPTIONS = [
    { label: 'New Items',         value: 'new' },
    { label: 'Price: Low → High', value: 'price_asc' },
    { label: 'Price: High → Low', value: 'price_desc' },
    { label: 'Best Sellers',      value: 'best' },
];

const COMING_SOON_CARDS = [
    { id: 'cs1', label: 'Botanical Bloom' },
    { id: 'cs2', label: 'Noir Oud Reserve' },
    { id: 'cs3', label: 'Soleil Blanc' },
];

function getPkgPrice(name: string) {
    if (name.includes('Bronze'))   return '₱1,998';
    if (name.includes('Silver'))   return '₱5,998';
    if (name.includes('Gold'))     return '₱8,998';
    return '₱12,998';
}

export default function CollectionsSection({ individualProducts, productPackages }: CollectionsSectionProps) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch]                 = useState('');
    const [sortValue, setSortValue]           = useState('new');
    const [sortOpen, setSortOpen]             = useState(false);
    const [selectedItem, setSelectedItem]     = useState<PreviewItem | null>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    // Close sort dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortValue)?.label ?? 'Sort';

    const filteredProducts = useMemo(() => {
        let products = individualProducts;
        if (activeCategory !== 'all' && activeCategory !== 'packages') {
            products = products.filter(p =>
                p.category.toLowerCase() === activeCategory.toLowerCase()
            );
        } else if (activeCategory === 'packages') {
            products = [];
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            products = products.filter(p => p.name.toLowerCase().includes(q));
        }
        return products;
    }, [individualProducts, activeCategory, search]);

    const filteredPackages = useMemo(() => {
        if (activeCategory !== 'all' && activeCategory !== 'packages') return [];
        let pkgs = productPackages;
        if (search.trim()) {
            const q = search.toLowerCase();
            pkgs = pkgs.filter(p => p.name.toLowerCase().includes(q));
        }
        return pkgs;
    }, [productPackages, activeCategory, search]);

    const showComingSoon = activeCategory === 'all' || activeCategory !== 'packages';
    const totalVisible = filteredProducts.length + filteredPackages.length;

    return (
        <section id="collections" className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-b border-yellow-600">
            <div className="max-w-7xl mx-auto">

                {/* Section Title */}
                <h2 className="text-3xl text-white mb-8">Our Perfumes &amp; Packages</h2>

                {/* ── Search Bar ── */}
                <div className="relative mb-8">
                    <Search
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search products or packages…"
                        className="w-full bg-slate-900 text-white placeholder-gray-500 border border-yellow-600/30 focus:border-yellow-500 focus:outline-none rounded-xl pl-11 pr-4 py-3 text-sm transition-colors duration-200"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-yellow-400 transition text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── Category Icons Row ── */}
                <div className="flex gap-3 overflow-x-auto pb-4 mb-10 scrollbar-hide">
                    {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const active = activeCategory === cat.key;
                        return (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                className={`flex flex-col items-center gap-2 min-w-20 px-4 py-3 rounded-xl border transition-all duration-200 shrink-0 ${
                                    active
                                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 shadow-md shadow-yellow-500/10'
                                        : 'border-yellow-600/30 text-gray-400 hover:border-yellow-500/60 hover:text-yellow-300 bg-slate-900/60'
                                }`}
                            >
                                <Icon size={22} strokeWidth={1.5} />
                                <span className="text-xs font-medium whitespace-nowrap">{cat.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Sort Bar ── */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    {/* Custom Sort Dropdown */}
                    <div className="relative" ref={sortRef}>
                        <button
                            onClick={() => setSortOpen(o => !o)}
                            className="flex items-center gap-2 bg-slate-900 border border-yellow-600/30 hover:border-yellow-500 text-white text-sm px-4 py-2.5 rounded-xl transition-all duration-200 group"
                        >
                            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Sort</span>
                            <span className="text-yellow-400 font-semibold">{activeSortLabel}</span>
                            <ChevronDown
                                size={14}
                                className={`text-yellow-500 transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {sortOpen && (
                            <div className="absolute top-full left-0 mt-2 w-52 bg-slate-900 border border-yellow-600/30 rounded-xl shadow-xl shadow-black/40 z-20 overflow-hidden">
                                {SORT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setSortValue(opt.value); setSortOpen(false); }}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-sm transition hover:bg-yellow-500/10 ${
                                            sortValue === opt.value ? 'text-yellow-400 font-semibold' : 'text-gray-300'
                                        }`}
                                    >
                                        {opt.label}
                                        {sortValue === opt.value && <Check size={13} className="text-yellow-400" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <span className="text-gray-500 text-sm">
                        <span className="text-yellow-500 font-semibold">{totalVisible}</span> items found
                        {search && <span className="text-gray-600"> for "<span className="text-gray-400">{search}</span>"</span>}
                    </span>
                </div>

                {/* ── Products List ── */}
                <div className="space-y-5">

                    {/* Individual Products */}
                    {filteredProducts.map((product) => (
                        <div
                            key={`prod-${product.id}`}
                            className="group flex flex-col gap-5 bg-slate-900 rounded-xl border border-yellow-600/20 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 overflow-hidden md:flex-row"
                        >
                            <div className="relative w-full md:w-44 lg:w-52 shrink-0 bg-slate-800 overflow-hidden aspect-4/3">
                                <span className="absolute top-2 left-2 z-10 bg-yellow-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded">New</span>
                                <img
                                    src={product.image || "/placeholder.svg"}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            <div className="flex flex-1 items-center justify-between py-5 pr-5 flex-wrap gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-yellow-500 text-xs font-semibold uppercase tracking-wider mb-1">{product.category}</p>
                                    <h3 className="text-white text-lg font-semibold mb-2 leading-snug">{product.name}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-yellow-400 text-xl font-bold">{product.price}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                                        {'★★★★☆'} <span className="text-gray-400 ml-1">4.5 · 154 orders this week</span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 border border-yellow-600/30 rounded-full px-2.5 py-0.5 bg-yellow-500/5">
                                        ✦ Exclusively CoProfit
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 min-w-35">
                                    <button
                                        disabled
                                        className="flex items-center justify-center gap-2 bg-yellow-500/30 text-slate-300 cursor-not-allowed font-bold text-sm px-4 py-2.5 rounded-lg transition-all duration-150"
                                    >
                                        <ShoppingCart size={15} /> Add to cart
                                    </button>
                                    <button
                                        onClick={() => setSelectedItem({
                                            id: String(product.id),
                                            name: product.name,
                                            image: product.image,
                                            price: product.price,
                                            category: product.category,
                                            isPackage: false,
                                        })}
                                        className="flex items-center justify-center gap-2 border border-yellow-600/40 hover:border-yellow-400 hover:bg-yellow-500/5 text-yellow-400 text-sm px-4 py-2 rounded-lg transition-all duration-150"
                                    >
                                        View Product
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1">Online purchase coming soon.</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Package Products */}
                    {filteredPackages.map((pkg) => (
                        <div
                            key={`pkg-${pkg.id}`}
                            className="group flex flex-col gap-5 bg-slate-900 rounded-xl border border-yellow-600/20 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 overflow-hidden md:flex-row"
                        >
                            <div className="relative w-full md:w-44 lg:w-52 shrink-0 bg-slate-800 overflow-hidden aspect-4/3">
                                <span className="absolute top-2 left-2 z-10 bg-yellow-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded">New</span>
                                <img
                                    src={pkg.image || "/placeholder.svg"}
                                    alt={pkg.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            <div className="flex flex-1 items-center justify-between py-5 pr-5 flex-wrap gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-yellow-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Package size={12} /> Package
                                    </p>
                                    <h3 className="text-white text-lg font-semibold mb-2 leading-snug">{pkg.name}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-yellow-400 text-xl font-bold">{getPkgPrice(pkg.name)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                                        {'★★★★☆'} <span className="text-gray-400 ml-1">4.5 · 154 orders this week</span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 border border-yellow-600/30 rounded-full px-2.5 py-0.5 bg-yellow-500/5 mb-2">
                                        ✦ Exclusively CoProfit
                                    </span>
                                    <p className="text-gray-400 text-xs mt-1">{pkg.description}</p>
                                </div>
                                <div className="flex flex-col gap-2 min-w-35">
                                    <button
                                        disabled
                                        className="flex items-center justify-center gap-2 bg-yellow-500/30 text-slate-300 cursor-not-allowed font-bold text-sm px-4 py-2.5 rounded-lg transition-all duration-150"
                                    >
                                        <ShoppingCart size={15} /> Add to cart
                                    </button>
                                    <button
                                        onClick={() => setSelectedItem({
                                            id: `pkg-${pkg.id}`,
                                            name: pkg.name,
                                            image: pkg.image,
                                            price: getPkgPrice(pkg.name),
                                            description: pkg.description,
                                            isPackage: true,
                                        })}
                                        className="flex items-center justify-center gap-2 border border-yellow-600/40 hover:border-yellow-400 hover:bg-yellow-500/5 text-yellow-400 text-sm px-4 py-2 rounded-lg transition-all duration-150"
                                    >
                                        View Package
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1">Online purchase coming soon.</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* ── Coming Soon Cards ── */}
                    {showComingSoon && COMING_SOON_CARDS.map((cs) => (
                        <div
                            key={cs.id}
                            className="flex flex-col gap-5 bg-slate-900/50 rounded-xl border border-dashed border-yellow-600/20 overflow-hidden opacity-60 md:flex-row"
                        >
                            {/* Placeholder image area */}
                            <div className="relative w-full md:w-44 lg:w-52 shrink-0 bg-slate-800/60 flex items-center justify-center aspect-4/3">
                                <Lock size={24} className="text-yellow-600/40" />
                            </div>
                            <div className="flex flex-1 items-center justify-between py-5 pr-5 flex-wrap gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-yellow-600/60 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Clock size={11} /> Coming Soon
                                    </p>
                                    <h3 className="text-gray-500 text-lg font-semibold mb-2 leading-snug">{cs.label}</h3>
                                    <div className="h-5 w-20 bg-slate-700/50 rounded mb-2" />
                                    <div className="h-3 w-32 bg-slate-700/50 rounded mb-1" />
                                    <span className="inline-flex items-center gap-1 text-xs text-yellow-700/50 border border-yellow-700/20 rounded-full px-2.5 py-0.5">
                                        ✦ Exclusively CoProfit
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 min-w-35">
                                    <button
                                        disabled
                                        className="flex items-center justify-center gap-2 bg-slate-700/50 text-slate-500 font-bold text-sm px-4 py-2.5 rounded-lg cursor-not-allowed"
                                    >
                                        <Clock size={15} /> Coming Soon
                                    </button>
                                    <button
                                        disabled
                                        className="flex items-center justify-center gap-2 border border-slate-700/40 text-slate-600 text-sm px-4 py-2 rounded-lg cursor-not-allowed"
                                    >
                                        ♡ Notify Me
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty state */}
                    {totalVisible === 0 && !showComingSoon && (
                        <div className="text-center py-20 text-gray-500">
                            <Search size={40} className="mx-auto mb-4 text-yellow-600/30" />
                            <p className="text-lg font-semibold text-gray-400">No products found</p>
                            <p className="text-sm mt-1">Try a different search or category</p>
                        </div>
                    )}
                </div>

                {selectedItem && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                        onClick={() => setSelectedItem(null)}
                    >
                        <div
                            className="w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-950 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >

                            <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr,0.8fr]">
                                <div className="overflow-hidden rounded-3xl bg-slate-800 aspect-4/3">
                                    <img
                                        src={selectedItem.image || '/placeholder.svg'}
                                        alt={selectedItem.name}
                                        className="w-full h-full object-fill"
                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* ── Show More ── */}
                <div className="flex justify-center mt-10 mb-6">
                    <button className="flex items-center gap-2 text-gray-300 border border-yellow-600/30 hover:border-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/5 active:scale-95 px-8 py-3 rounded-full text-sm transition-all duration-150">
                        Show more products ↓
                    </button>
                </div>

                {/* ── Pagination ── */}
                <div className="flex justify-center items-center gap-2 mt-4">
                    <button className="px-3 py-1.5 rounded-lg border border-yellow-600/30 text-gray-400 hover:border-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/5 active:scale-95 text-sm transition-all duration-150">← Prev</button>
                    {[1, 2, 3, 4, 5].map((p) => (
                        <button
                            key={p}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                                p === 1
                                    ? 'bg-yellow-500 text-slate-950 font-bold shadow-md shadow-yellow-500/20'
                                    : 'border border-yellow-600/30 text-gray-400 hover:border-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/5'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                    <button className="px-3 py-1.5 rounded-lg border border-yellow-600/30 text-gray-400 hover:border-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/5 active:scale-95 text-sm transition-all duration-150">Next →</button>
                </div>

            </div>
        </section>
    );
}