import * as SecureStore from 'expo-secure-store';
import { useEffect, useSyncExternalStore } from 'react';
import { sampleUser } from '@/features/events/sampleEvents';

export const HOME_CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Kribi', 'Limbe'] as const;

const STORAGE_KEY = 'tikly.homeCity';

let city: string = sampleUser.city;
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

async function load() {
  if (loaded) return;
  loaded = true;
  const stored = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  if (stored && stored !== city) {
    city = stored;
    emit();
  }
}

export async function setHomeCity(next: string) {
  city = next;
  emit();
  await SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => undefined);
}

export function useHomeCity() {
  const current = useSyncExternalStore(subscribe, () => city);

  useEffect(() => {
    load();
  }, []);

  return current;
}
