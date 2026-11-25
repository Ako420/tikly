import { Suspense } from 'react';
import { OrganizerShell } from '@/screens/organizer/OrganizerShell';

export default function Layout({ children }: LayoutProps<'/organizer'>) {
  return (
    <Suspense>
      <OrganizerShell>{children}</OrganizerShell>
    </Suspense>
  );
}
