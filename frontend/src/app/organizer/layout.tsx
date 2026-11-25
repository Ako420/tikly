import { OrganizerLayout } from '@/screens/organizer/OrganizerLayout';

export default function Layout({ children }: LayoutProps<'/organizer'>) {
  return <OrganizerLayout>{children}</OrganizerLayout>;
}
