'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRedirectIfSignedIn } from '@/features/auth/guards';
import { homeRouteFor } from '@/features/auth/homeRoute';
import { isSignUpRole, ROLE_COPY, SIGN_UP_ROLES, type SignUpRole } from '@/features/auth/roles';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

const signInLink = (
  <>
    Already have an account?{' '}
    <Link href="/sign-in" className="font-bold text-primary hover:underline">
      Log in
    </Link>
  </>
);

export function SignUpScreen() {
  useRedirectIfSignedIn();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role');
  const [role, setRole] = useState<SignUpRole>(isSignUpRole(initialRole) ? initialRole : 'organizer');
  const [step, setStep] = useState<'role' | 'details'>('role');

  if (step === 'role') {
    return (
      <AuthShell
        eyebrow="Step 1 of 2"
        title="How will you use tikly?"
        subtitle="Pick the account that fits you. You can only choose one."
        footer={signInLink}
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Account type</legend>
          {SIGN_UP_ROLES.map((option) => (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-start gap-4 rounded-2xl border bg-raised p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-primary',
                role === option ? 'border-2 border-primary bg-primary-subtle/40' : 'border-border hover:border-fg-muted',
              )}
            >
              <input
                type="radio"
                name="role"
                value={option}
                checked={role === option}
                onChange={() => setRole(option)}
                className="sr-only"
              />
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-subtle text-xl">
                {ROLE_COPY[option].icon}
              </span>
              <span className="flex flex-col">
                <span className="font-bold">{ROLE_COPY[option].title}</span>
                <span className="text-sm text-fg-muted">{ROLE_COPY[option].body}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button onClick={() => setStep('details')} className="mt-6 w-full">
          Continue
        </Button>
      </AuthShell>
    );
  }

  return <DetailsStep role={role} onBack={() => setStep('role')} />;
}

function DetailsStep({ role, onBack }: { role: SignUpRole; onBack: () => void }) {
  const { signUp } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    if (form.password.length < 8) {
      setFieldErrors({ password: 'Use at least 8 characters.' });
      return;
    }
    setSubmitting(true);
    try {
      const user = await signUp({ ...form, name: form.name.trim(), email: form.email.trim(), role, language: 'en' });
      router.replace(homeRouteFor(user));
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fieldErrors);
        setError(caught.code === 'NETWORK_ERROR' ? 'We could not reach Tikly. Check your connection.' : caught.message);
      } else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow={`Step 2 of 2 · ${ROLE_COPY[role].title}`}
      title="Create your account"
      subtitle="We use your phone number for Mobile Money payments and payouts."
      footer={signInLink}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <FormError message={error} />
        <TextField label="Full name" name="name" autoComplete="name" value={form.name} onChange={update('name')} error={fieldErrors.name} required />
        <TextField label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={fieldErrors.email} required />
        <TextField
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="6XX XX XX XX"
          hint="Cameroon mobile number"
          value={form.phone}
          onChange={update('phone')}
          error={fieldErrors.phone}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
          required
        />
        <div className="mt-2 flex gap-3">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={!form.name || !form.email || !form.phone || !form.password}
            className="flex-2"
          >
            Create account
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
