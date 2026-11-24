import type { Language, Role } from './enums';
import type { BookingDoc } from '../model/booking.model';
import type { EventDoc } from '../model/event.model';
import type { BookingParty } from '../service/booking.service';
import type { ServiceDoc } from '../model/service.model';
import type { SlotDoc } from '../model/slot.model';
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
      slot?: SlotDoc;
      booking?: BookingDoc;
      bookingParty?: BookingParty;
      validatedQuery?: unknown;
    }
  }
}

export {};
