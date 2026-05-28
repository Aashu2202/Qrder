const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const AUTH_STORAGE_KEY = 'qrder-kds-auth';

let token: string | null = null;
export function setToken(t: string | null) {
  token = t;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
}

function writeTokenToStorage(t: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state: { accessToken: string | null } };
    parsed.state.accessToken = t;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* best-effort */
  }
}

let onAuthFailed: (() => void) | null = null;
export function setOnAuthFailed(fn: (() => void) | null) {
  onAuthFailed = fn;
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  body?: BodyInit;
  _skipRefresh?: boolean;
}

async function doFetch(path: string, opts: FetchOptions): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (opts.json !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    credentials: 'include',
  });
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string };
      setToken(data.accessToken);
      writeTokenToStorage(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  let res = await doFetch(path, opts);

  if (res.status === 401 && !opts._skipRefresh && !path.startsWith('/v1/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch(path, opts);
    } else {
      onAuthFailed?.();
    }
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err: ApiError = data ?? { type: 'about:blank', title: res.statusText, status: res.status };
    throw err;
  }
  return data as T;
}

export const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
