import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, dictionaries, isLocale, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "tikly_lang";

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  const accepted = (await headers()).get("accept-language") ?? "";
  return accepted.toLowerCase().startsWith("fr") ? "fr" : DEFAULT_LOCALE;
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
