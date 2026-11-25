import { EventWorkspaceScreen } from '@/screens/organizer/EventWorkspaceScreen';

export default async function Page({ params }: PageProps<'/organizer/events/[id]'>) {
  const { id } = await params;
  return <EventWorkspaceScreen eventId={id} />;
}
