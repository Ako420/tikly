import { ProviderLayout } from '@/screens/provider/ProviderLayout';

export default function Layout({ children }: LayoutProps<'/provider'>) {
  return <ProviderLayout>{children}</ProviderLayout>;
}
