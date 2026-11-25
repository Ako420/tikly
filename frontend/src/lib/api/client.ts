import { ApiError, isApiErrorBody } from './errors';
import { tokenStorage, type AuthTokens } from './tokens';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
};

type Envelope<T> = { success: true; data: T; meta?: Record<string, unknown> };

let language = 'en';
export const setApiLanguage = (next: string) => {
  language = next;
};

const expiredListeners = new Set<() => void>();
export const onSessionExpired = (listener: () => void) => {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
};

function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function send<T>(path: string, options: RequestOptions): Promise<{ status: number; body: Envelope<T> | unknown }> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': language };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!options.skipAuth) {
    const tokens = tokenStorage.load();
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  const isForm = options.body instanceof FormData;
  if (isForm) delete headers['Content-Type'];
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new ApiError('NETWORK_ERROR', error instanceof Error ? error.message : 'Network error', null);
  }
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

let refreshing: Promise<AuthTokens | null> | null = null;

async function refreshTokens() {
  const current = tokenStorage.load();
  if (!current) return null;
  const { status, body } = await send<{ tokens: AuthTokens }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: current.refreshToken },
    skipAuth: true,
  });
  if (status >= 200 && status < 300) {
    const tokens = (body as Envelope<{ tokens: AuthTokens }>).data.tokens;
    tokenStorage.save(tokens);
    return tokens;
  }
  tokenStorage.clear();
  expiredListeners.forEach((listener) => listener());
  return null;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let result = await send<T>(path, options);
  if (result.status === 401 && !options.skipAuth && tokenStorage.load()) {
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null;
    });
    if (await refreshing) result = await send<T>(path, options);
  }
  if (result.status >= 200 && result.status < 300) return (result.body as Envelope<T>).data;
  if (isApiErrorBody(result.body)) {
    const { code, message, details } = result.body.error;
    throw new ApiError(code, message, result.status, details ?? null);
  }
  throw new ApiError('INTERNAL', `Request failed with status ${result.status}`, result.status);
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body: body ?? {} }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<T>(path, { method: 'POST', body: form });
  },
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
