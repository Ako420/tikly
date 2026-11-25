'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, type ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/shell/DashboardShell';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const NAV: NavItem[] = [
  { href: '/organizer', label: 'Overview', icon: 'dashboard', ready: true },
  { href: '/organizer/events', label: 'Events', icon: 'events', ready: true },
  { href: '/organizer/orders', label: 'Orders & attendees', icon: 'orders', ready: true },
  { href: '/organizer/marketplace', label: 'Marketplace', icon: 'marketplace', ready: true },
  { href: '/organizer/staff', label: 'Gate staff', icon: 'staff', ready: true },
  { href: '/organizer/reviews', label: 'Reviews', icon: 'reviews', ready: true },
];

const FOOTER_NAV: NavItem[] = [{ href: '/organizer/settings', label: 'Settings', icon: 'settings' }];

export type OrganizerUser = { id: string; name: string };

const OrganizerContext = createContext<OrganizerUser | null>(null);
export const useOrganizer = () => useContext(OrganizerContext);

export function OrganizerShell({ user, children }: { user: OrganizerUser; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <OrganizerContext value={user}>
      <div className="theme-light flex min-h-dvh flex-1 flex-col">
        {pathname === '/organizer/events/new' ? (
          children
        ) : (
          <DashboardShell
            home="/organizer"
            nav={NAV}
            footerNav={FOOTER_NAV}
            badge={{ label: 'Organizer', className: 'bg-primary-subtle text-primary' }}
            user={{ name: user.name, role: 'Organizer' }}
            searchPlaceholder="Search events, orders, guests"
            action={
              <Link href="/organizer/events/new" className={buttonClass('primary', 'sm', 'max-sm:hidden')}>
                <Icon name="add" size={18} />
                Create event
              </Link>
            }
          >
            {children}
          </DashboardShell>
        )}
      </div>
    </OrganizerContext>
  );
}
