"use client";

import { useTransition } from "react";
import { setLocale } from "@/features/auth/actions";
import { dictionaries, LOCALES, type Locale } from "@/i18n/dictionaries";

export function LanguagePicker({ locale, label }: { locale: Locale; label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={`relative flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-foreground focus-within:outline-2 focus-within:outline-accent-text hover:bg-surface ${pending ? "opacity-60" : ""}`}
    >
      <svg viewBox="0 0 512 525" className="size-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M187 55q13-4 22 7 5 6 5 23v11h61q50 0 57.5 1t12.5 5q8 8 6.5 19.5T340 138q-4 2-23 2h-19l-5 14q-22 63-56 115l-10 14 2 3q6 9 31 30 19 16 8 33-10 14-27 7-8-4-31-26l-12-12-13 14q-51 52-89 71-13 7-24-2-8-7-8-17 0-8 3.5-12T81 361q17-10 39-28 10-9 29.5-28.5t19-20.5-9.5-13q-16-23-31-47.5T112 191q-1-9 5.5-17t16.5-8q14 0 22 17 12 24 32 53l9 12 5-6q18-28 35-67 14-31 14-34 0-1-100-1t-104-1q-12-4-14.5-16.5T39 102q5-4 12.5-5t57.5-1h61V85q0-17 5-23 5-5 12-7m172 155q9-4 19 0 6 3 12 16t43 104q46 111 46.5 115t-.5 8q-3 12-14.5 16t-20.5-5q-5-4-16-31l-9-21h-51l-52 1-9 23q-10 23-12 25-4 6-12 8t-14.5-1-10.5-10q-2-4-2-10t46.5-117.5 49-115 7.5-5.5m26 119q-1-3-4-10l-13-30q-1 2-17 40t-15.5 38.5 32.5.5l33-1Z"
        />
      </svg>
      <span className="text-body-sm font-semibold">{dictionaries[locale].languageName}</span>
      <svg viewBox="0 0 512 525" className="size-3.5 text-foreground-secondary" aria-hidden="true">
        <path
          fill="currentColor"
          d="M102 168q11-5 21 1 4 2 68 66l65 65 65-65q64-64 68-66 9-6 20-1 17 7 15 24-1 7-10 17t-69 70q-61 62-71 70.5t-18 8.5-18-8.5-71-70.5q-60-60-69-70t-10-17q-2-16 14-24"
        />
      </svg>
      <select
        aria-label={label}
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(() => setLocale(next));
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {dictionaries[value].languageName}
          </option>
        ))}
      </select>
    </label>
  );
}
