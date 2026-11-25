import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { getSessionUser } from '@/features/auth/session';
import { getDictionary } from '@/i18n/server';
import { ProviderShell } from './ProviderShell';

export function ProviderLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: ReactNode }) {
  const [user, { locale, t }] = await Promise.all([getSessionUser(), getDictionary()]);
  if (!user) redirect('/login?next=/provider');
  if (user.role !== 'provider') redirect('/dashboard');
  return (
    <ProviderShell user={{ id: user.id, name: user.name }} locale={locale} t={t}>
      {children}
    </ProviderShell>
  );
}
