import { Suspense } from 'react';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';

export default function Page() {
  return (
    <Suspense>
      <SignUpScreen />
    </Suspense>
  );
}
