'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface CartItem {
    id: string | number;
    name: string;
    price: string;
    image: string;
    category?: string;
    quantity: number;
    isPackage?: boolean;
}

export interface FlyingDot {
    id: string;
    startX: number;
    startY: number;
}

interface CartContextType {
    cartItems: CartItem[];
    wishlistItems: CartItem[];
    cartCount: number;
    flyingDots: FlyingDot[];
    addToCart: (item: Omit<CartItem, 'quantity'>, event?: React.MouseEvent) => void;
    removeFromCart: (id: string | number) => void;
    updateQuantity: (id: string | number, delta: number) => void;
    toggleWishlist: (item: Omit<CartItem, 'quantity'>) => void;
    isWishlisted: (id: string | number) => boolean;
    clearCart: () => void;
    cartIconRef: React.RefObject<HTMLButtonElement | null>;
    setCartIconRef: (el: HTMLButtonElement | null) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [wishlistItems, setWishlistItems] = useState<CartItem[]>([]);
    const [flyingDots, ] = useState<FlyingDot[]>([]);
    const [cartIconEl, setCartIconEl] = useState<HTMLButtonElement | null>(null);

    // Persist wishlist in localStorage
    useEffect(() => {
        const saved = localStorage.getItem('coprofit_wishlist');
        if (saved) {
            try { setWishlistItems(JSON.parse(saved)); } catch {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('coprofit_wishlist', JSON.stringify(wishlistItems));
    }, [wishlistItems]);

    const cartIconRef = { current: cartIconEl } as React.RefObject<HTMLButtonElement | null>;
    const setCartIconRef = useCallback((el: HTMLButtonElement | null) => {
        setCartIconEl(el);
    }, []);

    const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, event?: React.MouseEvent) => {
        // Trigger flying animation if we have click coords + cart icon position
        if (event && cartIconEl) {
            const rect = cartIconEl.getBoundingClientRect();

            const startX = event.clientX;
            const startY = event.clientY;

            const dot = document.createElement('div');
            dot.style.cssText = `
                position: fixed;
                width: 12px;
                height: 12px;
                background: #EAB308;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${startX}px;
                top: ${startY}px;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 8px rgba(234,179,8,0.8);
                transition: none;
            `;
            document.body.appendChild(dot);

            const targetX = rect.left + rect.width / 2;
            const targetY = rect.top + rect.height / 2;

            requestAnimationFrame(() => {
                dot.style.transition = 'all 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                dot.style.left = `${targetX}px`;
                dot.style.top = `${targetY}px`;
                dot.style.opacity = '0';
                dot.style.transform = 'translate(-50%, -50%) scale(0.3)';
            });

            setTimeout(() => {
                document.body.removeChild(dot);
                // Pulse the cart icon
                if (cartIconEl) {
                    cartIconEl.style.transform = 'scale(1.3)';
                    cartIconEl.style.transition = 'transform 0.2s ease';
                    setTimeout(() => {
                        cartIconEl.style.transform = 'scale(1)';
                    }, 200);
                }
            }, 650);
        }

        setCartItems(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    }, [cartIconEl]);

    const removeFromCart = useCallback((id: string | number) => {
        setCartItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const updateQuantity = useCallback((id: string | number, delta: number) => {
        setCartItems(prev =>
            prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
        );
    }, []);

    const toggleWishlist = useCallback((item: Omit<CartItem, 'quantity'>) => {
        setWishlistItems(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) return prev.filter(i => i.id !== item.id);
            return [...prev, { ...item, quantity: 1 }];
        });
    }, []);

    const isWishlisted = useCallback((id: string | number) => {
        return wishlistItems.some(i => i.id === id);
    }, [wishlistItems]);

    const clearCart = useCallback(() => setCartItems([]), []);

    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems, wishlistItems, cartCount, flyingDots,
            addToCart, removeFromCart, updateQuantity,
            toggleWishlist, isWishlisted, clearCart,
            cartIconRef, setCartIconRef,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}