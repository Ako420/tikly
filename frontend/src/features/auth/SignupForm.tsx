"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import type { Dictionary, Locale } from "@/i18n/dictionaries";
import { signup, type SignupField } from "./actions";
import { FormHeading } from "./FormHeading";
import { GoogleButton } from "./GoogleAuth";
import { PhoneField } from "./PhoneField";
import { RolePicker } from "./RolePicker";
import type { FormState, WebSignupRole } from "./types";

type SignupFormProps = { t: Dictionary; locale: Locale; initialRole?: WebSignupRole };

export function SignupForm({ t, locale, initialRole }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(signup, {
    values: { role: initialRole },
  } as FormState<SignupField>);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <FormHeading eyebrow={t.signup.eyebrow} title={t.signup.heading} subtitle={t.signup.subtitle} />
      <FormAlert message={state.error} />

      <RolePicker t={t} defaultValue={state.values?.role} error={errors.role} />

      <div className="flex flex-col gap-3.5">
        <TextField
          name="name"
          label={t.fields.name}
          placeholder={t.fields.namePlaceholder}
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={state.values?.name}
          error={errors.name}
        />
        <TextField
          name="email"
          type="email"
          label={t.fields.email}
          placeholder={t.fields.emailPlaceholder}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.email}
          error={errors.email}
        />
        <PhoneField t={t} defaultValue={state.values?.phone} error={errors.phone} />
        <PasswordField
          name="password"
          label={t.fields.newPassword}
          autoComplete="new-password"
          required
          minLength={8}
          hint={t.fields.passwordHint}
          error={errors.password}
          showLabel={t.fields.showPassword}
          hideLabel={t.fields.hidePassword}
        />
      </div>

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? t.signup.submitting : t.signup.submit}
      </Button>

      <GoogleButton t={t} locale={locale} mode="signup" />

      <p className="text-center text-body-sm text-foreground-secondary">
        {t.signup.haveAccount}{" "}
        <Link href="/login" className="font-bold text-accent-text hover:underline">
          {t.signup.logIn}
        </Link>
      </p>
    </form>
  );
}
