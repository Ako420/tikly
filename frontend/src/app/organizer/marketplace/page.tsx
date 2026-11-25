import { Suspense } from 'react';
import { MarketplaceScreen } from '@/screens/organizer/MarketplaceScreen';

export default function Page() {
  return (
    <Suspense>
      <MarketplaceScreen />
    </Suspense>
  );
}
