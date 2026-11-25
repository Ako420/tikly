"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import type { Dictionary, Locale } from "@/i18n/dictionaries";
import { login, type LoginField } from "./actions";
import { FormHeading } from "./FormHeading";
import { GoogleButton } from "./GoogleAuth";
import type { FormState } from "./types";

type LoginFormProps = { t: Dictionary; locale: Locale; next?: string };

export function LoginForm({ t, locale, next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, {} as FormState<LoginField>);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <FormHeading eyebrow={t.login.eyebrow} title={t.login.heading} subtitle={t.login.subtitle} />
      <FormAlert message={state.error} />

      <div className="flex flex-col gap-3.5">
        <TextField
          name="identifier"
          label={t.fields.identifier}
          placeholder={t.fields.identifierPlaceholder}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.identifier}
          error={state.fieldErrors?.identifier}
        />
        <PasswordField
          name="password"
          label={t.fields.password}
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
          showLabel={t.fields.showPassword}
          hideLabel={t.fields.hidePassword}
        />
      </div>

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? t.login.submitting : t.login.submit}
      </Button>

      <GoogleButton t={t} locale={locale} mode="signin" />

      <p className="text-center text-body-sm text-foreground-secondary">
        {t.login.newHere}{" "}
        <Link href="/signup" className="font-bold text-accent-text hover:underline">
          {t.login.createAccount}
        </Link>
      </p>
    </form>
  );
}
