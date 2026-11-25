import { ApiError, isApiErrorBody } from './errors';

const BASE_URL = '/api/backend';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
};

type Envelope<T> = { success: true; data: T; meta?: Record<string, unknown> };

function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function send<T>(path: string, options: RequestOptions): Promise<{ status: number; body: Envelope<T> | unknown }> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
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

export type PageMeta = { page: number; limit: number; total: number; pages: number };
export type Page<T> = { items: T[]; meta: PageMeta };

async function envelope<T>(path: string, options: RequestOptions): Promise<Envelope<T>> {
  const result = await send<T>(path, options);
  if (result.status === 401 && window.location.pathname.startsWith('/organizer')) {
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (result.status >= 200 && result.status < 300) return result.body as Envelope<T>;
  if (isApiErrorBody(result.body)) {
    const { code, message, details } = result.body.error;
    throw new ApiError(code, message, result.status, details ?? null);
  }
  throw new ApiError('INTERNAL', `Request failed with status ${result.status}`, result.status);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await envelope<T>(path, options)).data;
}

export const api = {
  page: async <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<Page<T>> => {
    const body = await envelope<T[]>(path, options ?? {});
    return { items: body.data, meta: body.meta as PageMeta };
  },
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
