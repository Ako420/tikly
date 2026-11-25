'use client';

import Link from 'next/link';
import { createContext, useContext, type ReactNode } from 'react';
import { DashboardShell, initialsOf, TopBarSearch, type ShellNavItem } from '@/components/shell/DashboardShell';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const NAV: ShellNavItem[] = [
  { href: '/organizer', label: 'Overview', icon: 'dashboard', ready: true },
  { href: '/organizer/events', label: 'Events', icon: 'events', ready: true },
  { href: '/organizer/orders', label: 'Orders & attendees', icon: 'orders' },
  { href: '/organizer/marketplace', label: 'Marketplace', icon: 'marketplace' },
  { href: '/organizer/staff', label: 'Gate staff', icon: 'staff' },
  { href: '/organizer/reviews', label: 'Reviews', icon: 'reviews' },
];

const SECONDARY_NAV: ShellNavItem[] = [{ href: '/organizer/settings', label: 'Settings', icon: 'settings' }];

const LABELS = {
  navigation: 'Organizer',
  comingSoon: 'Coming soon',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  signOut: 'Sign out',
};

export type OrganizerUser = { id: string; name: string };

const OrganizerContext = createContext<OrganizerUser | null>(null);
export const useOrganizer = () => useContext(OrganizerContext);

export function OrganizerShell({ user, children }: { user: OrganizerUser; children: ReactNode }) {
  return (
    <OrganizerContext value={user}>
      <div className="theme-light flex min-h-dvh flex-1 flex-col">
        <DashboardShell
          homeHref="/organizer"
          role={{ label: 'Organizer', tone: 'primary' }}
          nav={NAV}
          secondaryNav={SECONDARY_NAV}
          account={{ initials: initialsOf(user.name), title: user.name, subtitle: 'Organizer' }}
          labels={LABELS}
          bareRoutes={['/organizer/events/new']}
          topBar={
            <>
              <TopBarSearch placeholder="Search events, orders, guests" />
              <div className="ml-auto flex items-center gap-3">
                <span className="hidden size-10 place-items-center rounded-full border border-border sm:grid">
                  <Icon name="bell" />
                </span>
                <Link href="/organizer/events/new" className={buttonClass('primary', 'sm', 'hidden sm:inline-flex')}>
                  <Icon name="add" size={18} />
                  Create event
                </Link>
              </div>
            </>
          }
        >
          {children}
        </DashboardShell>
      </div>
    </OrganizerContext>
  );
}
