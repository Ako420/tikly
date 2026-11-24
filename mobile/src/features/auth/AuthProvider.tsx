import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from '@/i18n/I18nProvider';
import { onSessionExpired, setApiLanguage, tokenStorage } from '@/lib/api';
import { authApi, type LoginInput, type RegisterInput, type Session, type User } from './api';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (input: LoginInput) => Promise<User>;
  signUp: (input: RegisterInput) => Promise<User>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useTranslation();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    setApiLanguage(language);
  }, [language]);

  const setUser = useCallback(
    (next: User) => {
      setUserState(next);
      setStatus('signedIn');
      setLanguage(next.language);
    },
    [setLanguage],
  );

  const reset = useCallback(() => {
    setUserState(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => onSessionExpired(reset), [reset]);

  // Keep the account's saved language in step with the in-app toggle.
  useEffect(() => {
    if (!user || user.language === language) return;
    authApi
      .updateMe({ language })
      .then(setUserState)
      .catch(() => undefined);
  }, [language, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokens = await tokenStorage.load();
      if (!tokens) return !cancelled && reset();
      try {
        const me = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        // Expired refresh token or unreachable API: start signed out; the
        // tokens are kept on network errors so the next launch can retry.
        if (!cancelled) reset();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset, setUser]);

  const startSession = useCallback(
    async ({ user: next, tokens }: Session) => {
      await tokenStorage.save(tokens);
      setUser(next);
      return next;
    },
    [setUser],
  );

  const signIn = useCallback(async (input: LoginInput) => startSession(await authApi.login(input)), [startSession]);
  const signUp = useCallback(async (input: RegisterInput) => startSession(await authApi.register(input)), [startSession]);

  const signOut = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    await tokenStorage.clear();
    reset();
  }, [reset]);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut, setUser }),
    [status, user, signIn, signUp, signOut, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
