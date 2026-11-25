export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
  static badRequest = (code: string, details?: unknown) => new AppError(400, code, details);
  static unauthorized = (code = 'UNAUTHORIZED') => new AppError(401, code);
  static forbidden = (code = 'FORBIDDEN') => new AppError(403, code);
  static notFound = (code = 'NOT_FOUND') => new AppError(404, code);
  static conflict = (code: string, details?: unknown) => new AppError(409, code, details);
  static tooManyRequests = (code = 'RATE_LIMITED') => new AppError(429, code);
  static serviceUnavailable = (code = 'SERVICE_UNAVAILABLE') => new AppError(503, code);
}
