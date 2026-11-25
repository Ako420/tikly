"use client";

import Script from "next/script";
import { createContext, use, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import type { Dictionary, Locale } from "@/i18n/dictionaries";
import { completeGoogleSignup, googleSignIn, type GoogleCompleteField } from "./actions";
import { FormHeading } from "./FormHeading";
import { PhoneField } from "./PhoneField";
import { RolePicker } from "./RolePicker";
import type { FormState } from "./types";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_BUTTON_MAX_WIDTH = 400;

type Completion = { idToken: string; email: string; role?: string; phone?: string };

type GoogleAuthContextValue = {
  onCredential: (idToken: string, form: HTMLFormElement | null) => void;
  busy: boolean;
  error?: string;
};

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

const fieldValue = (form: HTMLFormElement | null, selector: string) =>
  form?.querySelector<HTMLInputElement>(selector)?.value ?? undefined;

type GoogleAuthGateProps = { t: Dictionary; next?: string; children: ReactNode };

export function GoogleAuthGate({ t, next, children }: GoogleAuthGateProps) {
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [error, setError] = useState<string>();
  const [busy, startTransition] = useTransition();

  const onCredential = (idToken: string, form: HTMLFormElement | null) => {
    const role = fieldValue(form, "input[name=role]:checked");
    const phone = fieldValue(form, "input[name=phone]");
    setError(undefined);
    startTransition(async () => {
      const result = await googleSignIn({ idToken, role, phone, next });
      if (result.incomplete) setCompletion({ idToken, ...result.incomplete });
      else if (result.error) setError(result.error);
    });
  };

  if (completion) {
    return <GoogleCompleteForm t={t} next={next} completion={completion} onBack={() => setCompletion(null)} />;
  }

  return <GoogleAuthContext value={{ onCredential, busy, error }}>{children}</GoogleAuthContext>;
}

type GoogleButtonProps = { t: Dictionary; locale: Locale; mode: "signin" | "signup" };

export function GoogleButton({ t, locale, mode }: GoogleButtonProps) {
  const context = use(GoogleAuthContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(context?.onCredential);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    callbackRef.current = context?.onCredential;
  });

  useEffect(() => {
    const container = containerRef.current;
    const google = window.google;
    if (!scriptReady || !GOOGLE_CLIENT_ID || !container || !google) return;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      ux_mode: "popup",
      context: mode,
      itp_support: true,
      callback: ({ credential }) => callbackRef.current?.(credential, container.closest("form")),
    });

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    container.replaceChildren();
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: dark ? "filled_black" : "outline",
      size: "large",
      shape: "rectangular",
      text: mode === "signup" ? "signup_with" : "continue_with",
      logo_alignment: "center",
      width: Math.min(container.offsetWidth || GOOGLE_BUTTON_MAX_WIDTH, GOOGLE_BUTTON_MAX_WIDTH),
      locale,
    });
  }, [scriptReady, mode, locale]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-caption text-foreground-secondary">{t.google.divider}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <FormAlert message={context?.error} />

      {GOOGLE_CLIENT_ID ? (
        <>
          <Script src={GOOGLE_SCRIPT} strategy="afterInteractive" onReady={() => setScriptReady(true)} />
          <div
            ref={containerRef}
            aria-busy={context?.busy}
            className={`flex min-h-11 w-full justify-center ${context?.busy ? "pointer-events-none opacity-60" : ""}`}
          />
          {context?.busy ? (
            <p role="status" className="text-center text-caption text-foreground-secondary">
              {t.google.loading}
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" disabled>
            <GoogleMark />
            {mode === "signup" ? t.signup.googleCta : t.login.googleCta}
          </Button>
          <p className="text-center text-caption text-foreground-secondary">{t.google.notConfigured}</p>
        </div>
      )}
    </div>
  );
}

type GoogleCompleteFormProps = { t: Dictionary; next?: string; completion: Completion; onBack: () => void };

function GoogleCompleteForm({ t, next, completion, onBack }: GoogleCompleteFormProps) {
  const [state, formAction, pending] = useActionState(completeGoogleSignup, {
    values: { role: completion.role, phone: completion.phone },
  } as FormState<GoogleCompleteField>);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <FormHeading
        eyebrow={t.google.completeEyebrow}
        title={t.google.completeHeading}
        subtitle={t.google.completeSubtitle.replace("{email}", completion.email)}
      />
      <FormAlert message={state.error} />
      <input type="hidden" name="idToken" value={completion.idToken} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <RolePicker t={t} defaultValue={state.values?.role} error={errors.role} />
      <PhoneField t={t} defaultValue={state.values?.phone} error={errors.phone} />

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? t.google.submitting : t.google.submit}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="self-center text-body-sm font-bold text-accent-text hover:underline"
      >
        {t.google.back}
      </button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
    </svg>
  );
}
