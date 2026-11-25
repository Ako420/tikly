import { Suspense } from 'react';
import { EventWorkspaceScreen } from '@/screens/organizer/EventWorkspaceScreen';

type Params = PageProps<'/organizer/events/[id]'>['params'];

export default function Page({ params }: PageProps<'/organizer/events/[id]'>) {
  return (
    <Suspense>
      <Workspace params={params} />
    </Suspense>
  );
}

async function Workspace({ params }: { params: Params }) {
  const { id } = await params;
  return <EventWorkspaceScreen eventId={id} />;
}
