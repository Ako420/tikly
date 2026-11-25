import "server-only";
import { cookies } from "next/headers";
import { isWebRole, type Session, type WebRole } from "./types";

export const ACCESS_COOKIE = "tikly_access";
export const REFRESH_COOKIE = "tikly_refresh";
export const USER_COOKIE = "tikly_user";

const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type SessionUser = { id: string; name: string; role: WebRole };

const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function saveSession({ user, tokens }: Session & { user: { role: WebRole } }) {
  const store = await cookies();
  const sessionUser: SessionUser = { id: user.id, name: user.name, role: user.role };
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...baseCookie, maxAge: tokens.expiresIn });
  store.set(REFRESH_COOKIE, tokens.refreshToken, { ...baseCookie, maxAge: REFRESH_MAX_AGE_SECONDS });
  store.set(USER_COOKIE, JSON.stringify(sessionUser), { ...baseCookie, maxAge: REFRESH_MAX_AGE_SECONDS });
}

export async function saveTokens(tokens: Session["tokens"]) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...baseCookie, maxAge: tokens.expiresIn });
  store.set(REFRESH_COOKIE, tokens.refreshToken, { ...baseCookie, maxAge: REFRESH_MAX_AGE_SECONDS });
}

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(USER_COOKIE);
}

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  if (!store.has(REFRESH_COOKIE)) return null;
  try {
    const parsed = JSON.parse(store.get(USER_COOKIE)?.value ?? "") as Partial<SessionUser>;
    if (typeof parsed.id !== "string" || typeof parsed.name !== "string" || !isWebRole(parsed.role)) return null;
    return { id: parsed.id, name: parsed.name, role: parsed.role };
  } catch {
    return null;
  }
}
