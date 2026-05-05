const REFRESH_URL = `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`;

let refreshPromise: Promise<string | null> | null = null;

function getToken(): string | null {
  return localStorage.getItem('accessToken') ?? localStorage.getItem('token');
}

function clearAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
}

async function doRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(REFRESH_URL, {
        method: 'POST',
        credentials: 'include', // sends the httpOnly refresh_token cookie
      });
      if (!res.ok) return null;
      const data: { access_token: string } = await res.json();
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('token', data.access_token);
      return data.access_token;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function buildHeaders(base: HeadersInit | undefined, token: string | null): Headers {
  const headers = new Headers(base);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers, getToken()),
  });

  if (res.status !== 401) return res;

  const newToken = await doRefresh();

  if (!newToken) {
    clearAuth();
    window.location.href = '/auth';
    return res;
  }

  return fetch(url, {
    ...options,
    headers: buildHeaders(options.headers, newToken),
  });
}
