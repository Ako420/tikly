import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const STORAGE_KEY = 'tikly.auth.tokens';

const webStore = {
  get: async () => {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  },
  set: async (value: string) => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {}
  },
  remove: async () => {
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {}
  },
};

const nativeStore = {
  get: () => SecureStore.getItemAsync(STORAGE_KEY),
  set: (value: string) => SecureStore.setItemAsync(STORAGE_KEY, value),
  remove: () => SecureStore.deleteItemAsync(STORAGE_KEY),
};

const store = Platform.OS === 'web' ? webStore : nativeStore;

let cached: AuthTokens | null | undefined;

export const tokenStorage = {
  async load(): Promise<AuthTokens | null> {
    if (cached !== undefined) return cached;
    const raw = await store.get().catch(() => null);
    try {
      cached = raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      cached = null;
    }
    return cached;
  },
  async save(tokens: AuthTokens) {
    cached = tokens;
    await store.set(JSON.stringify(tokens));
  },
  async clear() {
    cached = null;
    await store.remove().catch(() => undefined);
  },
};
