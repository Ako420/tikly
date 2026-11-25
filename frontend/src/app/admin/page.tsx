import { Suspense } from 'react';
import { AdminOverviewScreen } from '@/screens/admin/AdminOverviewScreen';

export default function Page() {
  return (
    <Suspense>
      <AdminOverviewScreen />
    </Suspense>
  );
}
