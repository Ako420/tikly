import type { Locale } from "@/i18n/dictionaries";

export const WEB_SIGNUP_ROLES = ["organizer", "provider", "exhibitor"] as const;
export type WebSignupRole = (typeof WEB_SIGNUP_ROLES)[number];

export const WEB_ROLES = [...WEB_SIGNUP_ROLES, "admin"] as const;
export type WebRole = (typeof WEB_ROLES)[number];

export type UserRole = WebRole | "attendee" | "staff";

export const isWebSignupRole = (value: unknown): value is WebSignupRole =>
  typeof value === "string" && (WEB_SIGNUP_ROLES as readonly string[]).includes(value);

export const isWebRole = (value: unknown): value is WebRole =>
  typeof value === "string" && (WEB_ROLES as readonly string[]).includes(value);

export type User = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  language: Locale;
  status: "active" | "suspended" | "disabled";
};

export type AuthTokens = { accessToken: string; refreshToken: string; expiresIn: number };

export type Session = { user: User; tokens: AuthTokens };

export type FormState<Field extends string> = {
  error?: string;
  fieldErrors?: Partial<Record<Field, string>>;
  values?: Partial<Record<Field, string>>;
};
