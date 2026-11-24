import type { LocalizedText, TierName } from '@/features/events/types';
import { api } from '@/lib/api';
import type { CheckIn, GateEvent, ScanResult, ScannedTicket } from './types';

type ApiGateEvent = {
  id: string;
  title: LocalizedText;
  startAt: string;
  endAt: string;
  venue: string;
  city: string;
  gate?: string;
  organizer?: { name: string };
  capacity?: number;
  checkedIn?: number;
  scannedByMe?: number;
};

type ApiScanTicket = { id: string; code: string; tier: TierName; holderName: string; checkIns?: CheckIn[] };

type ApiScanResponse = { result: ScanResult; ticket?: ApiScanTicket };

const SCANNING_LEAD_MS = 2 * 60 * 60 * 1000;

const toGateEvent = (event: ApiGateEvent): GateEvent => ({
  id: event.id,
  title: event.title,
  startAt: event.startAt,
  endAt: event.endAt,
  scanningOpensAt: new Date(new Date(event.startAt).getTime() - SCANNING_LEAD_MS).toISOString(),
  venue: event.venue,
  area: event.city,
  gate: event.gate ?? '',
  organizerName: event.organizer?.name ?? '',
  capacity: event.capacity ?? 0,
  checkedIn: event.checkedIn ?? 0,
  scannedByMe: event.scannedByMe ?? 0,
});

const toTicket = (ticket?: ApiScanTicket): ScannedTicket | undefined =>
  ticket && { id: ticket.id, code: ticket.code, tier: ticket.tier, holderName: ticket.holderName, checkIns: ticket.checkIns ?? [] };

export const gateApi = {
  events: async () => (await api.get<ApiGateEvent[]>('/staff/events')).map(toGateEvent),
  scan: async (eventId: string, qrToken: string) => {
    const response = await api.post<ApiScanResponse>('/access/scan', { eventId, qrToken });
    return { result: response.result, ticket: toTicket(response.ticket) };
  },
  lookup: async (eventId: string, code: string) => {
    const response = await api.get<ApiScanResponse>('/access/lookup', { params: { eventId, code } });
    return { result: response.result, ticket: toTicket(response.ticket) };
  },
  reentry: (eventId: string, ticketId: string) => api.post<unknown>(`/access/tickets/${ticketId}/reentry`, { eventId }),
};
