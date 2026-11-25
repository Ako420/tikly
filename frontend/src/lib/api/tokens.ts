export type AuthTokens = { accessToken: string; refreshToken: string };

const KEY = 'tikly.tokens';

export const tokenStorage = {
  load(): AuthTokens | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  },
  save(tokens: AuthTokens) {
    try {
      localStorage.setItem(KEY, JSON.stringify(tokens));
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  },
};
