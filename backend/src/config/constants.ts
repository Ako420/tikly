export const API_PREFIX = '/api/v1';
export const MAX_TICKETS_PER_ORDER = 10;
export const RESERVATION_MINUTES = 10;

export const DB_CONNECT_ATTEMPTS = 5;
export const DB_RETRY_BASE_DELAY_MS = 1_000;
export const DB_RETRY_MAX_DELAY_MS = 15_000;
export const DB_SERVER_SELECTION_TIMEOUT_MS = 10_000;
export const DB_MAX_POOL_SIZE = 20;

export const MB = 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * MB;
export const DOCUMENT_MAX_BYTES = 10 * MB;
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const UPLOAD_FIELD = 'file';
export const UPLOAD_FOLDERS = { events: 'events', services: 'services', documents: 'documents' } as const;
export const DOCUMENT_URL_TTL_SECONDS = 10 * 60;

export const APP_TIME_ZONE = 'Africa/Douala';
export const PASSWORD_RESET_MINUTES = 60;

export const BCRYPT_ROUNDS = 12;
export const JWT_ISSUER = 'tikly';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const PASSWORD_MAX_BYTES = 72;

export const DEFAULT_EVENT_CATEGORIES = [
  { key: 'concert', en: 'Concert', fr: 'Concert' },
  { key: 'festival', en: 'Festival', fr: 'Festival' },
  { key: 'conference', en: 'Conference', fr: 'Conférence' },
  { key: 'workshop', en: 'Workshop', fr: 'Atelier' },
  { key: 'sport', en: 'Sport', fr: 'Sport' },
  { key: 'party', en: 'Party', fr: 'Soirée' },
  { key: 'exhibition', en: 'Exhibition', fr: 'Exposition' },
  { key: 'religious', en: 'Religious', fr: 'Religieux' },
  { key: 'other', en: 'Other', fr: 'Autre' },
] as const;
export const PUBLISHED_EDITABLE_EVENT_FIELDS = ['description', 'coverUrl'] as const;
