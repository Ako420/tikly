import type { Language, Role } from './enums';
import type { EventDoc } from '../model/event.model';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: { id: string; role: Role; language: Language; organizerId?: string };
      event?: EventDoc;
      validatedQuery?: unknown;
    }
  }
}

export {};
