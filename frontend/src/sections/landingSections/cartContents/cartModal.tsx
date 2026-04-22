'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ShoppingCart, Heart, Minus, Plus, Trash2, LogIn, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from './cartContext';
import { useNavigate } from 'react-router-dom';

interface CartModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
    const { cartItems, wishlistItems, removeFromCart, updateQuantity, toggleWishlist } = useCart();
    const [activeTab, setActiveTab] = useState<'cart' | 'wishlist'>('cart');
    const navigate = useNavigate();
    const overlayRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on overlay click
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    function parsePrice(price: string): number {
        return parseFloat(price.replace(/[^0-9.]/g, '').replace(',', '')) || 0;
    }

    const cartTotal = cartItems.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0);
    const formattedTotal = `₱${cartTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

    return (
        <>
            {/* Backdrop */}
            <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.72)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 998,
                    transition: 'opacity 0.3s ease',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                }}
            />

            {/* Slide-in Panel */}
            <div
                ref={panelRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    height: '100vh',
                    width: '100%',
                    maxWidth: '440px',
                    background: 'linear-gradient(160deg, #0f172a 0%, #0a0a0a 100%)',
                    borderLeft: '1px solid rgba(234,179,8,0.2)',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                    boxShadow: '-20px 0 60px rgba(0,0,0,0.7)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid rgba(234,179,8,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div>
                        <p style={{ color: 'rgba(234,179,8,0.6)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
                            CoProfit Global
                        </p>
                        <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                            Your Selections
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '36px', height: '36px',
                            borderRadius: '50%',
                            border: '1px solid rgba(234,179,8,0.25)',
                            background: 'rgba(234,179,8,0.05)',
                            color: '#EAB308',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,179,8,0.15)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,179,8,0.05)'; }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(234,179,8,0.12)',
                    flexShrink: 0,
                }}>
                    {(['cart', 'wishlist'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid #EAB308' : '2px solid transparent',
                                color: activeTab === tab ? '#EAB308' : 'rgba(156,163,175,0.7)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: activeTab === tab ? 600 : 400,
                                transition: 'all 0.2s',
                                marginBottom: '-1px',
                            }}
                        >
                            {tab === 'cart' ? <ShoppingCart size={15} /> : <Heart size={15} fill={tab === 'wishlist' && activeTab === 'wishlist' ? '#EAB308' : 'none'} />}
                            {tab === 'cart' ? 'Cart' : 'Wishlist'}
                            {tab === 'cart' && cartItems.length > 0 && (
                                <span style={{
                                    background: '#EAB308',
                                    color: '#0a0a0a',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    padding: '1px 6px',
                                    lineHeight: 1.4,
                                }}>
                                    {cartItems.reduce((s, i) => s + i.quantity, 0)}
                                </span>
                            )}
                            {tab === 'wishlist' && wishlistItems.length > 0 && (
                                <span style={{
                                    background: 'rgba(234,179,8,0.2)',
                                    color: '#EAB308',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    padding: '1px 6px',
                                    lineHeight: 1.4,
                                }}>
                                    {wishlistItems.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

                    {/* ── CART TAB ── */}
                    {activeTab === 'cart' && (
                        <>
                            {cartItems.length === 0 ? (
                                <EmptyState
                                    icon={<ShoppingBag size={48} strokeWidth={1} />}
                                    title="Your cart is empty"
                                    sub="Add some fragrances to get started"
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {cartItems.map((item, idx) => (
                                        <CartItemRow
                                            key={item.id}
                                            item={item}
                                            onRemove={() => removeFromCart(item.id)}
                                            onIncrease={() => updateQuantity(item.id, 1)}
                                            onDecrease={() => updateQuantity(item.id, -1)}
                                            idx={idx}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── WISHLIST TAB ── */}
                    {activeTab === 'wishlist' && (
                        <>
                            {wishlistItems.length === 0 ? (
                                <EmptyState
                                    icon={<Heart size={48} strokeWidth={1} />}
                                    title="No saved items"
                                    sub="Heart a product to save it here — even after you close the page"
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {wishlistItems.map((item, idx) => (
                                        <WishlistItemRow
                                            key={item.id}
                                            item={item}
                                            onRemove={() => toggleWishlist(item)}
                                            idx={idx}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer — Cart only */}
                {activeTab === 'cart' && cartItems.length > 0 && (
                    <div style={{
                        padding: '20px 24px',
                        borderTop: '1px solid rgba(234,179,8,0.12)',
                        flexShrink: 0,
                        background: 'rgba(0,0,0,0.3)',
                    }}>
                        {/* Subtotal */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ color: 'rgba(156,163,175,0.8)', fontSize: '0.85rem' }}>Subtotal</span>
                            <span style={{ color: '#EAB308', fontWeight: 700, fontSize: '1.1rem' }}>{formattedTotal}</span>
                        </div>

                        {/* Login prompt */}
                        <div style={{
                            background: 'rgba(234,179,8,0.06)',
                            border: '1px solid rgba(234,179,8,0.2)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            marginBottom: '14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                        }}>
                            <Sparkles size={16} style={{ color: '#EAB308', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ color: 'rgba(209,213,219,0.8)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
                                To proceed with your order, please <strong style={{ color: '#EAB308' }}>log in</strong> to your CoProfit account. Your cart will be saved.
                            </p>
                        </div>

                        {/* Login CTA */}
                        <button
                            onClick={() => { navigate('/auth'); onClose(); }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#0a0a0a',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                letterSpacing: '0.02em',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(234,179,8,0.35)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                            }}
                        >
                            <LogIn size={17} />
                            Login to Proceed
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

/* ── Sub-components ── */

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            color: 'rgba(107,114,128,0.8)',
            textAlign: 'center',
        }}>
            <div style={{ marginBottom: '16px', color: 'rgba(234,179,8,0.25)' }}>{icon}</div>
            <p style={{ color: 'rgba(156,163,175,0.7)', fontWeight: 600, marginBottom: '6px', fontSize: '0.95rem' }}>{title}</p>
            <p style={{ color: 'rgba(107,114,128,0.6)', fontSize: '0.78rem', lineHeight: 1.6 }}>{sub}</p>
        </div>
    );
}

function CartItemRow({
    item, onRemove, onIncrease, onDecrease, idx
}: {
    item: any;
    onRemove: () => void;
    onIncrease: () => void;
    onDecrease: () => void;
    idx: number;
}) {
    return (
        <div
            style={{
                display: 'flex',
                gap: '12px',
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(234,179,8,0.12)',
                borderRadius: '12px',
                padding: '12px',
                animation: `slideInRight 0.3s ease ${idx * 0.05}s both`,
                transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(234,179,8,0.3)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(234,179,8,0.12)'}
        >
            <img
                src={item.image || '/placeholder.svg'}
                alt={item.name}
                style={{
                    width: '64px', height: '64px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    flexShrink: 0,
                    border: '1px solid rgba(234,179,8,0.15)',
                }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'rgba(234,179,8,0.7)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2px' }}>
                    {item.isPackage ? 'Package' : item.category}
                </p>
                <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#EAB308', fontWeight: 700, fontSize: '0.9rem' }}>{item.price}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(234,179,8,0.08)', borderRadius: '8px', padding: '3px 8px' }}>
                            <button onClick={onDecrease} style={qtyBtnStyle}><Minus size={11} /></button>
                            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                            <button onClick={onIncrease} style={qtyBtnStyle}><Plus size={11} /></button>
                        </div>
                        <button
                            onClick={onRemove}
                            style={{ ...qtyBtnStyle, color: 'rgba(239,68,68,0.6)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.6)'}
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function WishlistItemRow({ item, onRemove, idx }: { item: any; onRemove: () => void; idx: number }) {
    const { addToCart } = useCart();

    return (
        <div
            style={{
                display: 'flex',
                gap: '12px',
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(234,179,8,0.12)',
                borderRadius: '12px',
                padding: '12px',
                animation: `slideInRight 0.3s ease ${idx * 0.05}s both`,
                transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(234,179,8,0.3)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(234,179,8,0.12)'}
        >
            <img
                src={item.image || '/placeholder.svg'}
                alt={item.name}
                style={{
                    width: '64px', height: '64px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    flexShrink: 0,
                    border: '1px solid rgba(234,179,8,0.15)',
                }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'rgba(234,179,8,0.7)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2px' }}>
                    {item.isPackage ? 'Package' : item.category}
                </p>
                <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ color: '#EAB308', fontWeight: 700, fontSize: '0.9rem' }}>{item.price}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={() => addToCart(item)}
                            style={{
                                padding: '5px 10px',
                                background: '#EAB308',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#0a0a0a',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#FCD34D'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#EAB308'}
                        >
                            <ShoppingCart size={11} /> Add
                        </button>
                        <button
                            onClick={onRemove}
                            style={{ ...qtyBtnStyle, color: 'rgba(239,68,68,0.6)', padding: '5px 8px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.6)'}
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const qtyBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'rgba(156,163,175,0.8)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    transition: 'color 0.15s',
};

// Inject animation keyframe once
if (typeof document !== 'undefined') {
    const styleId = 'cart-modal-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(20px); }
                to   { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }
}