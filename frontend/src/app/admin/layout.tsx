import { AdminLayout } from '@/screens/admin/AdminLayout';

export default function Layout({ children }: LayoutProps<'/admin'>) {
  return <AdminLayout>{children}</AdminLayout>;
}
