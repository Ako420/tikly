import { Suspense } from 'react';
import { ReviewsScreen } from '@/screens/organizer/ReviewsScreen';

export default function Page() {
  return (
    <Suspense>
      <ReviewsScreen />
    </Suspense>
  );
}
