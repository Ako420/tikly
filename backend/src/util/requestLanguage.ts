import type { Request } from 'express';
import type { Language } from '../types/enums';

export function requestLanguage(req: Request): Language {
  if (req.user?.language) return req.user.language;
  return req.acceptsLanguages('en', 'fr') === 'fr' ? 'fr' : 'en';
}
