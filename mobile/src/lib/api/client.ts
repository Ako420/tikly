import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { toApiError } from './errors';
import { tokenStorage, type AuthTokens } from './tokenStorage';

type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; skipAuth?: boolean };

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Send the request without the Authorization header and skip the refresh-on-401 flow. */
    skipAuth?: boolean;
  }
}

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

let language = 'en';
export const setApiLanguage = (next: string) => {
  language = next;
};

const sessionExpiredListeners = new Set<() => void>();
export const onSessionExpired = (listener: () => void) => {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
};

http.interceptors.request.use(async (config: RetriableConfig) => {
  config.headers.set('Accept-Language', language);
  if (!config.skipAuth) {
    const tokens = await tokenStorage.load();
    if (tokens) config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return config;
});

let refreshing: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const current = await tokenStorage.load();
  if (!current) return null;
  try {
    const { data } = await http.post<ApiSuccess<{ tokens: AuthTokens }>>(
      '/auth/refresh',
      { refreshToken: current.refreshToken },
      { skipAuth: true },
    );
    await tokenStorage.save(data.data.tokens);
    return data.data.tokens;
  } catch {
    await tokenStorage.clear();
    sessionExpiredListeners.forEach((listener) => listener());
    return null;
  }
}

http.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as RetriableConfig | undefined;
  if (error?.response?.status !== 401 || !config || config.skipAuth || config._retried) {
    throw toApiError(error);
  }
  config._retried = true;
  refreshing ??= refreshTokens().finally(() => {
    refreshing = null;
  });
  const tokens = await refreshing;
  if (!tokens) throw toApiError(error);
  config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  return http.request(config);
});

/** Thin wrappers that unwrap the `{ success, data }` envelope the API returns. */
export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig) => (await http.get<ApiSuccess<T>>(url, config)).data.data,
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await http.post<ApiSuccess<T>>(url, body, config)).data.data,
  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await http.patch<ApiSuccess<T>>(url, body, config)).data.data,
  delete: async <T>(url: string, config?: AxiosRequestConfig) => (await http.delete<ApiSuccess<T>>(url, config)).data.data,
};
