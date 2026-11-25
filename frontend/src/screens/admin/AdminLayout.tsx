import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { getSessionUser } from '@/features/auth/session';
import { AdminShell } from './AdminShell';

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') redirect('/dashboard');
  return <AdminShell user={{ name: user.name }}>{children}</AdminShell>;
}
