'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { LanguagePicker } from '@/components/LanguagePicker';
import { DashboardShell, initialsOf, TopBarSearch, type ShellNavItem } from '@/components/shell/DashboardShell';
import { Icon } from '@/components/ui/Icon';
import { providerApi, type ProviderProfile } from '@/features/provider/api';
import type { Dictionary, Locale } from '@/i18n/dictionaries';
import { useAsync } from '@/lib/useAsync';

export type ProviderUser = { id: string; name: string };

type ProviderContextValue = {
  user: ProviderUser;
  locale: Locale;
  t: Dictionary;
  profile: ProviderProfile | null;
  profileLoading: boolean;
  pendingRequests: number;
};

const ProviderContext = createContext<ProviderContextValue | null>(null);

export const useProvider = () => {
  const value = useContext(ProviderContext);
  if (!value) throw new Error('useProvider must be used inside ProviderShell');
  return value;
};

type ProviderShellProps = { user: ProviderUser; locale: Locale; t: Dictionary; children: ReactNode };

export function ProviderShell({ user, locale, t, children }: ProviderShellProps) {
  const profile = useAsync(providerApi.me, []);
  const pending = useAsync(providerApi.pendingRequestCount, []);
  const pendingRequests = pending.data ?? 0;
  const labels = t.provider.nav;

  const nav: ShellNavItem[] = [
    { href: '/provider', label: labels.overview, icon: 'dashboard', ready: true },
    { href: '/provider/bookings', label: labels.bookings, icon: 'bookings', badge: pendingRequests },
    { href: '/provider/services', label: labels.services, icon: 'marketplace' },
    { href: '/provider/calendar', label: labels.calendar, icon: 'calendar' },
    { href: '/provider/earnings', label: labels.earnings, icon: 'wallet' },
    { href: '/provider/reviews', label: labels.reviews, icon: 'reviews' },
  ];

  const secondaryNav: ShellNavItem[] = [
    { href: '/provider/profile', label: labels.profile, icon: 'business' },
    { href: '/provider/help', label: labels.help, icon: 'help' },
  ];

  const business = profile.data;
  const account = business
    ? {
        initials: initialsOf(business.businessName),
        title: business.businessName,
        subtitle: user.name,
        verified: business.verification === 'verified',
      }
    : {
        initials: initialsOf(user.name),
        title: user.name,
        subtitle: profile.loading ? t.provider.role : t.provider.profileMissing,
      };

  return (
    <ProviderContext
      value={{ user, locale, t, profile: business ?? null, profileLoading: profile.loading, pendingRequests }}
    >
      <div className="theme-light flex min-h-dvh flex-1 flex-col">
        <DashboardShell
          homeHref="/provider"
          role={{ label: t.provider.role, tone: 'valid' }}
          nav={nav}
          secondaryNav={secondaryNav}
          account={account}
          labels={{
            navigation: t.provider.navigation,
            comingSoon: t.shell.comingSoon,
            openMenu: t.shell.openMenu,
            closeMenu: t.shell.closeMenu,
            signOut: t.shell.signOut,
            verified: t.shell.verified,
          }}
          topBar={
            <>
              <TopBarSearch placeholder={t.provider.search} />
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <LanguagePicker locale={locale} label={t.languageLabel} variant="icon" />
                <span
                  role="img"
                  aria-label={t.shell.notifications}
                  title={t.shell.comingSoon}
                  className="hidden size-10 place-items-center rounded-full border border-border text-fg sm:grid"
                >
                  <Icon name="bell" />
                </span>
              </div>
            </>
          }
        >
          {children}
        </DashboardShell>
      </div>
    </ProviderContext>
  );
}
