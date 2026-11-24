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
