import type { LocalizedText, TierName } from '@/features/events/types';

export type GateEvent = {
  id: string;
  title: LocalizedText;
  startAt: string;
  endAt: string;
  scanningOpensAt: string;
  venue: string;
  area: string;
  gate: string;
  organizerName: string;
  capacity: number;
  checkedIn: number;
  scannedByMe: number;
};

export type ScanResult = 'VALID' | 'ALREADY_CHECKED_IN' | 'INVALID' | 'WRONG_EVENT' | 'CANCELLED';

export type CheckIn = { at: string; type: 'entry' | 'reentry'; staffName: string; gate?: string };

export type ScannedTicket = {
  id: string;
  code: string;
  tier: TierName;
  holderName: string;
  position?: { index: number; total: number };
  status?: 'valid' | 'checked_in' | 'cancelled' | 'refunded';
  checkIns: CheckIn[];
};

export type LookupQuery = { code: string } | { phone: string };

export type OtherEvent = { title: LocalizedText; startAt: string; venue: string };

export type ScanOutcome = {
  id: string;
  eventId: string;
  result: ScanResult;
  scannedAt: string;
  ticket?: ScannedTicket;
  otherEvent?: OtherEvent;
};

export type GateStaff = { name: string };

export const AUTO_RETURN_SECONDS = 3;
export const SCAN_COOLDOWN_MS = 2500;

export const isGateLive = (event: GateEvent, now = Date.now()) =>
  now >= new Date(event.scanningOpensAt).getTime() && now <= new Date(event.endAt).getTime();
