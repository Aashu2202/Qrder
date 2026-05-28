const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const apiBase = API_URL;

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  fields?: Record<string, string[]>;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err: ApiError = data ?? { type: 'about:blank', title: res.statusText, status: res.status };
    throw err;
  }

  return data as T;
}
