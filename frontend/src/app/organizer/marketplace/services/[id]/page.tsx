import { ServiceScreen } from '@/screens/organizer/ServiceScreen';

export default async function Page({ params }: PageProps<'/organizer/marketplace/services/[id]'>) {
  const { id } = await params;
  return <ServiceScreen serviceId={id} />;
}
