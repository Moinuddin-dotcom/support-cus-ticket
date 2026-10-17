/** Error thrown for non-2xx API responses, carrying the server's message(s). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  message?: string | string[];
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  const messages = Array.isArray(body.message) ? body.message : body.message ? [body.message] : [];
  const fallback = res.status === 429 ? 'Too many requests, please slow down' : `Request failed (${res.status})`;
  return new ApiError(res.status, messages[0] ?? fallback, messages);
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
  if (res.status === 401 && typeof window !== 'undefined' && !url.startsWith('/api/auth/')) {
    // Session expired or account deactivated.
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw await toApiError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Calls the NestJS API through the same-origin BFF proxy (the JWT lives in an httpOnly cookie). */
export const api = {
  get: <T>(path: string) => request<T>(`/api/proxy${path}`),
  post: <T>(path: string, body: unknown) =>
    request<T>(`/api/proxy${path}`, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(`/api/proxy${path}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<{ user: { role: 'CUSTOMER' | 'AGENT' | 'ADMIN' } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: { role: 'CUSTOMER' } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details.length > 1 ? error.details.join('. ') : error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
