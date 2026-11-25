'use client';

import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/shell/DashboardShell';
import { adminApi } from '@/features/admin/api';
import { useAsync } from '@/lib/useAsync';

export function AdminShell({ user, children }: { user: { name: string }; children: ReactNode }) {
  const { data: pending } = useAsync(async () => {
    const [events, providers] = await Promise.all([adminApi.pendingEvents(1), adminApi.pendingProviders(1)]);
    return events.meta.total + providers.meta.total;
  }, []);

  const nav: NavItem[] = [
    { href: '/admin', label: 'Overview', icon: 'stats', ready: true },
    { href: '/admin/approvals', label: 'Approvals', icon: 'shield', count: pending ?? undefined },
    { href: '/admin/events', label: 'Events', icon: 'events' },
    { href: '/admin/providers', label: 'Providers & services', icon: 'marketplace' },
    { href: '/admin/users', label: 'Users', icon: 'user' },
    { href: '/admin/reviews', label: 'Review moderation', icon: 'reviews' },
    { href: '/admin/transactions', label: 'Transactions', icon: 'orders' },
  ];
  const footerNav: NavItem[] = [{ href: '/admin/settings', label: 'Commission & categories', icon: 'settings' }];

  return (
    <div className="theme-light flex min-h-dvh flex-1 flex-col">
      <DashboardShell
        home="/admin"
        nav={nav}
        footerNav={footerNav}
        badge={{ label: 'Admin', className: 'bg-media text-white' }}
        user={{ name: user.name, role: 'Platform admin' }}
        searchPlaceholder="Search events, providers, users"
      >
        {children}
      </DashboardShell>
    </div>
  );
}
