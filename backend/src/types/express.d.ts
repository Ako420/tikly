import type { Language, Role } from './enums';
import type { EventDoc } from '../model/event.model';
import type { TicketTierDoc } from '../model/ticketTier.model';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: { id: string; role: Role; language: Language; organizerId?: string };
      event?: EventDoc;
      tier?: TicketTierDoc;
      validatedQuery?: unknown;
    }
  }
}

export {};
