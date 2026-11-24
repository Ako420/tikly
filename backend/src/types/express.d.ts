import type { Language, Role } from './enums';
import type { EventDoc } from '../model/event.model';
import type { ServiceDoc } from '../model/service.model';
import type { TicketTierDoc } from '../model/ticketTier.model';
import type { UserDoc } from '../model/user.model';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: { id: string; role: Role; language: Language; organizerId?: string };
      event?: EventDoc;
      tier?: TicketTierDoc;
      staff?: UserDoc;
      service?: ServiceDoc;
      validatedQuery?: unknown;
    }
  }
}

export {};
