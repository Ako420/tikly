"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dictionaries, isLocale } from "@/i18n/dictionaries";
import { getLocale, LOCALE_COOKIE } from "@/i18n/server";
import { ApiError, apiRequest, NetworkError } from "@/lib/api";
import { clearSession, getAccessToken, saveSession } from "./session";
import { isWebRole, isWebSignupRole, type FormState, type Session } from "./types";

export type LoginField = "identifier" | "password";
export type SignupField = "role" | "name" | "email" | "phone" | "password";

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const safeNextPath = (value: string) => (value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard");

function failure<Field extends string>(error: unknown, generic: string, network: string): FormState<Field> {
  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrors() as Partial<Record<Field, string>>;
    return Object.keys(fieldErrors).length > 0 ? { fieldErrors } : { error: error.message || generic };
  }
  if (error instanceof NetworkError) return { error: network };
  return { error: generic };
}

export async function login(_state: FormState<LoginField>, formData: FormData): Promise<FormState<LoginField>> {
  const locale = await getLocale();
  const t = dictionaries[locale];
  const identifier = text(formData, "identifier");
  const password = formData.get("password");
  const values = { identifier };

  const fieldErrors: Partial<Record<LoginField, string>> = {};
  if (!identifier) fieldErrors.identifier = t.errors.identifierRequired;
  if (typeof password !== "string" || password.length === 0) fieldErrors.password = t.errors.passwordRequired;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  let session: Session;
  try {
    session = await apiRequest<Session>("/auth/login", { body: { identifier, password }, locale });
  } catch (error) {
    return { ...failure<LoginField>(error, t.errors.generic, t.errors.network), values };
  }

  const { role } = session.user;
  if (!isWebRole(role)) return { error: t.errors.mobileOnly, values };

  await saveSession({ ...session, user: { ...session.user, role } });
  redirect(safeNextPath(text(formData, "next")));
}

export async function signup(_state: FormState<SignupField>, formData: FormData): Promise<FormState<SignupField>> {
  const locale = await getLocale();
  const t = dictionaries[locale];
  const role = text(formData, "role");
  const values = {
    role,
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
  };

  if (!isWebSignupRole(role)) return { fieldErrors: { role: t.errors.roleRequired }, values };

  let session: Session;
  try {
    session = await apiRequest<Session>("/auth/register", {
      body: { ...values, role, password: formData.get("password"), language: locale },
      locale,
    });
  } catch (error) {
    return { ...failure<SignupField>(error, t.errors.generic, t.errors.network), values };
  }

  await saveSession({ ...session, user: { ...session.user, role } });
  redirect("/dashboard");
}

export type GoogleSignInInput = { idToken: string; role?: string; phone?: string; next?: string };
export type GoogleSignInResult = { error?: string; incomplete?: { email: string; role?: string; phone?: string } };
export type GoogleCompleteField = "role" | "phone";

type GoogleOutcome = { session: Session } | { incompleteEmail: string } | { failure: FormState<GoogleCompleteField> };

async function authenticateWithGoogle(idToken: string, role: string, phone: string): Promise<GoogleOutcome> {
  const locale = await getLocale();
  const t = dictionaries[locale];
  try {
    const session = await apiRequest<Session>("/auth/google", {
      body: {
        idToken,
        language: locale,
        ...(isWebSignupRole(role) && { role }),
        ...(phone && { phone }),
      },
      locale,
    });
    if (!isWebRole(session.user.role)) return { failure: { error: t.errors.mobileOnly } };
    return { session };
  } catch (error) {
    if (error instanceof ApiError && error.code === "GOOGLE_SIGNUP_INCOMPLETE") {
      const details = (error.details ?? {}) as { email?: unknown };
      return { incompleteEmail: typeof details.email === "string" ? details.email : "" };
    }
    return { failure: failure<GoogleCompleteField>(error, t.errors.generic, t.errors.network) };
  }
}

async function finishGoogleSession(session: Session, next: string) {
  const { role } = session.user;
  if (!isWebRole(role)) return;
  await saveSession({ ...session, user: { ...session.user, role } });
  redirect(safeNextPath(next));
}

export async function googleSignIn({ idToken, role = "", phone = "", next = "" }: GoogleSignInInput): Promise<GoogleSignInResult> {
  const outcome = await authenticateWithGoogle(idToken, role.trim(), phone.trim());
  if ("incompleteEmail" in outcome) return { incomplete: { email: outcome.incompleteEmail, role, phone } };
  if ("failure" in outcome) return { error: outcome.failure.error ?? Object.values(outcome.failure.fieldErrors ?? {})[0] };
  await finishGoogleSession(outcome.session, next);
  return {};
}

export async function completeGoogleSignup(
  _state: FormState<GoogleCompleteField>,
  formData: FormData,
): Promise<FormState<GoogleCompleteField>> {
  const t = dictionaries[await getLocale()];
  const role = text(formData, "role");
  const phone = text(formData, "phone");
  const values = { role, phone };

  const fieldErrors: Partial<Record<GoogleCompleteField, string>> = {};
  if (!isWebSignupRole(role)) fieldErrors.role = t.errors.roleRequired;
  if (!phone) fieldErrors.phone = t.errors.phoneRequired;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const outcome = await authenticateWithGoogle(text(formData, "idToken"), role, phone);
  if ("incompleteEmail" in outcome) return { error: t.errors.generic, values };
  if ("failure" in outcome) return { ...outcome.failure, values };
  await finishGoogleSession(outcome.session, text(formData, "next"));
  return { values };
}

export async function logout() {
  const token = await getAccessToken();
  if (token) {
    await apiRequest("/auth/logout", { body: {}, token }).catch(() => undefined);
  }
  await clearSession();
  redirect("/login");
}

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
}
