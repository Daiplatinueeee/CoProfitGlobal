'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

interface AuthContextValue {
  accessToken: string | null;
  showSessionExpiredModal: boolean;
  setAccessToken: (token: string) => void;
  logout: () => void;
  resolveSessionExpired: (shouldRefresh: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [accessToken, setAccessTokenState] = useState<string | null>(
    () => localStorage.getItem('accessToken')
  );
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  const originalFetchRef = useRef<typeof window.fetch | null>(null);
  const pendingRefreshResolver = useRef<((token: string | null) => void) | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const setAccessToken = useCallback((token: string) => {
    localStorage.setItem('accessToken', token);
    setAccessTokenState(token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    setAccessTokenState(null);
    setShowSessionExpiredModal(false);
    navigate('/auth');
  }, [navigate]);

  const resolveSessionExpired = useCallback(async (shouldRefresh: boolean) => {
    setShowSessionExpiredModal(false);

    // Grab and clear resolver/promise before any async work so new 401s start fresh
    const resolver = pendingRefreshResolver.current;
    pendingRefreshResolver.current = null;
    refreshPromiseRef.current = null;

    if (!shouldRefresh) {
      resolver?.(null);
      logout();
      return;
    }

    try {
      const original = originalFetchRef.current!;
      const res = await original(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('refresh failed');
      const data = await res.json();
      const newToken: string = data.access_token;
      setAccessToken(newToken);
      resolver?.(newToken);
    } catch {
      resolver?.(null);
      logout();
    }
  }, [logout, setAccessToken]);

  useEffect(() => {
    const original = window.fetch.bind(window);
    originalFetchRef.current = original;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await original(input, init);

      if (response.status !== 401) return response;

      const url =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : String(input);

      // Never intercept auth endpoints to prevent infinite loops
      if (url.includes('/auth/refresh') || url.includes('/auth/login')) return response;

      // Deduplicate: concurrent 401s share one refresh promise
      if (!refreshPromiseRef.current) {
        refreshPromiseRef.current = new Promise<string | null>((resolve) => {
          pendingRefreshResolver.current = resolve;
        });
        setShowSessionExpiredModal(true);
      }

      const newToken = await refreshPromiseRef.current;

      if (!newToken) return response;

      // Retry the original request with the refreshed token
      const retryHeaders = new Headers((init?.headers as HeadersInit) ?? {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      return original(input, { ...init, headers: retryHeaders });
    };

    return () => {
      window.fetch = original;
      originalFetchRef.current = null;
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      accessToken,
      showSessionExpiredModal,
      setAccessToken,
      logout,
      resolveSessionExpired,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
