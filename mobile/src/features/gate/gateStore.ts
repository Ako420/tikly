import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthProvider';
import { toApiError, type ApiError } from '@/lib/api';
import { gateApi } from './api';
import { sampleGate, sampleStaff } from './sampleGate';
import type { GateEvent, ScanOutcome } from './types';

type GateState = {
  events: GateEvent[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: ApiError;
  outcomes: Record<string, ScanOutcome>;
  lastEntry: Record<string, ScanOutcome>;
  soundOn: boolean;
};

let state: GateState = { events: [], status: 'idle', outcomes: {}, lastEntry: {}, soundOn: true };
const listeners = new Set<() => void>();

const setState = (patch: Partial<GateState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getState = () => state;

const updateEvent = (eventId: string, update: (event: GateEvent) => GateEvent) =>
  setState({ events: state.events.map((event) => (event.id === eventId ? update(event) : event)) });

async function loadEvents() {
  setState({ status: 'loading', error: undefined });
  try {
    const events = env.useSampleData ? sampleGate.events().map((event) => ({ ...event })) : await gateApi.events();
    setState({ events, status: 'ready' });
  } catch (caught) {
    setState({ status: 'error', error: toApiError(caught) });
  }
}

const newScanId = () => `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function scan(eventId: string, value: string, staffName: string, manual: boolean): Promise<ScanOutcome> {
  const outcome: ScanOutcome = env.useSampleData
    ? sampleGate.scan(eventId, value, staffName)
    : {
        id: newScanId(),
        eventId,
        scannedAt: new Date().toISOString(),
        ...(await (manual ? gateApi.lookup(eventId, value) : gateApi.scan(eventId, value))),
      };

  const outcomes = { ...state.outcomes, [outcome.id]: outcome };
  if (outcome.result === 'VALID') {
    setState({ outcomes, lastEntry: { ...state.lastEntry, [eventId]: outcome } });
    if (env.useSampleData) {
      const fresh = sampleGate.events().find((event) => event.id === eventId);
      if (fresh) updateEvent(eventId, () => ({ ...fresh }));
    } else {
      updateEvent(eventId, (event) => ({ ...event, checkedIn: event.checkedIn + 1, scannedByMe: event.scannedByMe + 1 }));
    }
  } else {
    setState({ outcomes });
  }
  return outcome;
}

async function allowReentry(outcome: ScanOutcome, staffName: string) {
  if (!outcome.ticket) return;
  if (env.useSampleData) sampleGate.reentry(outcome.ticket.id, staffName);
  else await gateApi.reentry(outcome.eventId, outcome.ticket.id);
}

export const gateStore = {
  loadEvents,
  scan,
  allowReentry,
  toggleSound: () => setState({ soundOn: !state.soundOn }),
};

export function useGateState() {
  return useSyncExternalStore(subscribe, getState);
}

export function useGateStaff() {
  const { user } = useAuth();
  return { name: user?.name ?? sampleStaff.name };
}

export function useGateEvents() {
  const { events, status, error } = useGateState();

  useEffect(() => {
    if (getState().status === 'idle') loadEvents();
  }, []);

  const reload = useCallback(() => loadEvents(), []);
  return { events, loading: status === 'idle' || status === 'loading', error, reload };
}

export function useGateEvent(eventId: string | undefined) {
  const { events } = useGateEvents();
  return events.find((event) => event.id === eventId);
}

export function useScanOutcome(scanId: string | undefined) {
  const { outcomes } = useGateState();
  return scanId ? outcomes[scanId] : undefined;
}
