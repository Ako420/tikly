import "server-only";
import type { NextRequest } from "next/server";
import { ApiError, apiRequest, API_URL } from "@/lib/api";
import { clearSession, getAccessToken, getRefreshToken, saveTokens } from "./session";
import type { Session } from "./types";

type Context = { params: Promise<{ path: string[] }> };

type Tokens = Session["tokens"];

const SHARED_REFRESH_MS = 60_000;
const refreshes = new Map<string, Promise<Tokens>>();

function sharedRefresh(refreshToken: string) {
  let pending = refreshes.get(refreshToken);
  if (!pending) {
    pending = apiRequest<Pick<Session, "tokens">>("/auth/refresh", { body: { refreshToken } }).then(({ tokens }) => tokens);
    refreshes.set(refreshToken, pending);
    const forget = () => setTimeout(() => refreshes.delete(refreshToken), SHARED_REFRESH_MS);
    pending.then(forget, forget);
  }
  return pending;
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return undefined;
  try {
    const tokens = await sharedRefresh(refreshToken);
    await saveTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) await clearSession();
    return undefined;
  }
}

async function forward(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const url = `${API_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  const send = (token: string | undefined) => {
    const headers = new Headers({ Accept: "application/json" });
    for (const name of ["content-type", "accept-language", "idempotency-key"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { method: request.method, headers, body, cache: "no-store" });
  };

  let token = (await getAccessToken()) ?? (await refreshAccessToken());
  let response = await send(token);
  if (response.status === 401 && token) {
    token = await refreshAccessToken();
    if (token) response = await send(token);
  }

  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
