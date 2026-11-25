import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { getSessionUser } from '@/features/auth/session';
import { OrganizerShell } from './OrganizerShell';

export function OrganizerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/organizer');
  if (user.role !== 'organizer') redirect('/dashboard');
  return <OrganizerShell user={{ id: user.id, name: user.name }}>{children}</OrganizerShell>;
}
