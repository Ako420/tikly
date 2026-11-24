import { isAxiosError } from 'axios';

export type ApiFieldError = { code: string; message: string };

type ApiErrorBody = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number | null,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.code === 'NETWORK_ERROR';
  }

  /** Per-field messages from a 400 VALIDATION_ERROR, already translated by the server. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !this.details || typeof this.details !== 'object') return {};
    const fields: Record<string, string> = {};
    for (const [path, value] of Object.entries(this.details as Record<string, ApiFieldError>)) {
      if (value && typeof value.message === 'string') fields[path] = value.message;
    }
    return fields;
  }
}

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  !!value &&
  typeof value === 'object' &&
  (value as ApiErrorBody).success === false &&
  typeof (value as ApiErrorBody).error?.code === 'string';

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const body = error.response?.data;
    if (isApiErrorBody(body)) {
      return new ApiError(body.error.code, body.error.message, error.response?.status ?? null, body.error.details ?? null);
    }
    if (!error.response) return new ApiError('NETWORK_ERROR', error.message, null);
    return new ApiError('INTERNAL', error.message, error.response.status);
  }
  return new ApiError('INTERNAL', error instanceof Error ? error.message : String(error), null);
}
