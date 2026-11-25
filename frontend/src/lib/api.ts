import "server-only";
import type { Locale } from "@/i18n/dictionaries";

export const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type FieldError = { code: string; message: string };

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, FieldError> | { fields?: string[] } | null;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorBody["details"] = null,
  ) {
    super(message);
  }

  fieldErrors(): Record<string, string> {
    if (!this.details || typeof this.details !== "object") return {};
    if ("fields" in this.details && Array.isArray(this.details.fields)) {
      return Object.fromEntries(this.details.fields.map((field) => [field, this.message]));
    }
    return Object.fromEntries(
      Object.entries(this.details as Record<string, FieldError>)
        .filter(([, value]) => value && typeof value.message === "string")
        .map(([field, value]) => [field, value.message]),
    );
  }
}

export class NetworkError extends Error {}

type RequestOptions = { body?: unknown; token?: string; locale?: Locale; method?: string };

export async function apiRequest<T>(path: string, { body, token, locale, method }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(locale && { "Accept-Language": locale }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new NetworkError();
  }

  const payload = (await response.json().catch(() => null)) as
    | { success: true; data: T }
    | { success: false; error: ApiErrorBody }
    | null;

  if (!payload) throw new ApiError(response.status, "INTERNAL", response.statusText);
  if (!payload.success) {
    const { code, message, details } = payload.error;
    throw new ApiError(response.status, code, message, details);
  }
  return payload.data;
}
