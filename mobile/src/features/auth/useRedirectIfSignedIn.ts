import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { homeRouteFor } from './homeRoute';

export function useRedirectIfSignedIn() {
  const { status, user } = useAuth();
  const previousStatus = useRef(status);
  const signedInHere = useRef(false);

  useEffect(() => {
    if (previousStatus.current === 'signedOut' && status === 'signedIn') signedInHere.current = true;
    if (status === 'signedOut') signedInHere.current = false;
    previousStatus.current = status;
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      if (status !== 'signedIn' || signedInHere.current) return;
      router.replace(homeRouteFor(user));
    }, [status, user]),
  );
}
