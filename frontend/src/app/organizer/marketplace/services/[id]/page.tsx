import { Suspense } from 'react';
import { ServiceScreen } from '@/screens/organizer/ServiceScreen';

type Params = PageProps<'/organizer/marketplace/services/[id]'>['params'];

export default function Page({ params }: PageProps<'/organizer/marketplace/services/[id]'>) {
  return (
    <Suspense>
      <Service params={params} />
    </Suspense>
  );
}

async function Service({ params }: { params: Params }) {
  const { id } = await params;
  return <ServiceScreen serviceId={id} />;
}
