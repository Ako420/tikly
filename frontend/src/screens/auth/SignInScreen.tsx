'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRedirectIfSignedIn } from '@/features/auth/guards';
import { homeRouteFor } from '@/features/auth/homeRoute';
import { ApiError } from '@/lib/api';

export function SignInScreen() {
  useRedirectIfSignedIn();
  const { signIn } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = await signIn({ identifier: identifier.trim(), password });
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
      eyebrow="Good to see you"
      title="Welcome back"
      subtitle="Log in to manage your events and tickets."
      footer={
        <>
          New to tikly?{' '}
          <Link href="/sign-up" className="font-bold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <FormError message={error} />
        <TextField
          label="Email or phone number"
          name="identifier"
          autoComplete="username"
          placeholder="you@example.com or 6XX XX XX XX"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          error={fieldErrors.identifier}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />
        <Button type="submit" loading={submitting} disabled={!identifier || !password} className="mt-2 w-full">
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
