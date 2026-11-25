type ApiErrorBody = { success: false; error: { code: string; message: string; details?: unknown } };

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

  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !this.details || typeof this.details !== 'object') return {};
    const fields: Record<string, string> = {};
    for (const [path, value] of Object.entries(this.details as Record<string, { message?: unknown }>)) {
      if (value && typeof value.message === 'string') fields[path] = value.message;
    }
    return fields;
  }
}

export const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  !!value &&
  typeof value === 'object' &&
  (value as ApiErrorBody).success === false &&
  typeof (value as ApiErrorBody).error?.code === 'string';
