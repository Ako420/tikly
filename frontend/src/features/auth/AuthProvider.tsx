'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onSessionExpired, tokenStorage } from '@/lib/api';
import { authApi, type LoginInput, type RegisterInput, type Session, type User } from './api';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (input: LoginInput) => Promise<User>;
  signUp: (input: RegisterInput) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const reset = useCallback(() => {
    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => onSessionExpired(reset), [reset]);

  useEffect(() => {
    let cancelled = false;
    const session = tokenStorage.load() ? authApi.me() : Promise.reject(new Error('signed out'));
    session
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('signedIn');
      })
      .catch(() => !cancelled && reset());
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const startSession = useCallback(({ user: next, tokens }: Session) => {
    tokenStorage.save(tokens);
    setUser(next);
    setStatus('signedIn');
    return next;
  }, []);

  const signIn = useCallback(async (input: LoginInput) => startSession(await authApi.login(input)), [startSession]);
  const signUp = useCallback(async (input: RegisterInput) => startSession(await authApi.register(input)), [startSession]);

  const signOut = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    tokenStorage.clear();
    reset();
  }, [reset]);

  const value = useMemo(() => ({ status, user, signIn, signUp, signOut }), [status, user, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
