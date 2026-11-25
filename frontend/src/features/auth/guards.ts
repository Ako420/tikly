'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import type { UserRole } from './api';
import { homeRouteFor } from './homeRoute';

export function useRedirectIfSignedIn() {
  const { status, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === 'signedIn') router.replace(homeRouteFor(user));
  }, [status, user, router]);
}

export function useRequireRole(role: UserRole) {
  const { status, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === 'signedOut') router.replace('/sign-in');
    else if (status === 'signedIn' && user?.role !== role) router.replace(homeRouteFor(user));
  }, [status, user, role, router]);
  return status === 'signedIn' && user?.role === role;
}
