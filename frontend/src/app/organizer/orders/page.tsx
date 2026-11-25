import { Suspense } from 'react';
import { OrdersScreen } from '@/screens/organizer/OrdersScreen';

export default function Page() {
  return (
    <Suspense>
      <OrdersScreen />
    </Suspense>
  );
}
