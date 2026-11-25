'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { logout } from '@/features/auth/actions';
import { cn } from '@/lib/cn';

export type ShellNavItem = { href: string; label: string; icon: IconName; ready?: boolean; badge?: number };

export type ShellAccount = { initials: string; title: string; subtitle: string; verified?: boolean };

export type ShellLabels = {
  navigation: string;
  comingSoon: string;
  openMenu: string;
  closeMenu: string;
  signOut: string;
  verified?: string;
};

type DashboardShellProps = {
  homeHref: string;
  role: { label: string; tone: 'primary' | 'valid' };
  nav: ShellNavItem[];
  secondaryNav?: ShellNavItem[];
  account: ShellAccount;
  labels: ShellLabels;
  topBar: ReactNode;
  bareRoutes?: string[];
  children: ReactNode;
};

const ROLE_TONES = {
  primary: 'bg-primary-subtle text-primary',
  valid: 'bg-valid-subtle text-valid',
};

export const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export function DashboardShell({
  homeHref,
  role,
  nav,
  secondaryNav = [],
  account,
  labels,
  topBar,
  bareRoutes = [],
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (bareRoutes.includes(pathname)) return <>{children}</>;

  const isActive = (href: string) => (href === homeHref ? pathname === href : pathname.startsWith(href));

  const renderItem = (item: ShellNavItem, compact = false) => {
    const badge =
      item.badge && item.badge > 0 ? (
        <span className="ml-auto grid h-5.5 min-w-5.5 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-on-accent">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null;
    const height = compact ? 'h-10' : 'h-11';

    if (!item.ready) {
      return (
        <span
          key={item.href}
          aria-disabled
          title={labels.comingSoon}
          className={cn(height, 'flex cursor-not-allowed items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-fg-muted')}
        >
          <Icon name={item.icon} />
          {item.label}
          {badge}
        </span>
      );
    }

    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          height,
          'flex items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
          active ? 'bg-primary-subtle text-primary' : 'text-fg hover:bg-surface',
        )}
      >
        <Icon name={item.icon} />
        {item.label}
        {badge}
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="flex items-center justify-between px-1 py-1">
        <Link href={homeHref} onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase', ROLE_TONES[role.tone])}>
          {role.label}
        </span>
      </div>
      <nav aria-label={labels.navigation} className="mt-6 flex flex-col gap-1">
        {nav.map((item) => renderItem(item))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        {secondaryNav.map((item) => renderItem(item, true))}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border p-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">
            {account.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-bold">
              <span className="truncate">{account.title}</span>
              {account.verified ? (
                <svg viewBox="0 0 512 512" className="size-3.5 shrink-0 text-primary" role="img" aria-label={labels.verified}>
                  <path
                    fill="currentColor"
                    d="m491 256-52-59 7-79-77-17-40-68-73 31-73-31-40 68-77 17 7 78-52 60 52 59-7 79 77 18 40 67 73-31 73 31 40-68 77-17-7-79ZM213 363l-85-86 30-30 55 55 141-140 30 30Z"
                  />
                </svg>
              ) : null}
            </p>
            <p className="truncate text-xs text-fg-muted">{account.subtitle}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label={labels.signOut}
              title={labels.signOut}
              className="rounded-lg p-0.5 text-fg-muted hover:bg-surface hover:text-fg"
            >
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-1 bg-surface">
      <aside className="sticky top-0 hidden h-dvh w-66 shrink-0 border-r border-border bg-raised lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label={labels.closeMenu} className="absolute inset-0 bg-media/40" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] bg-raised shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-17 items-center gap-3 border-b border-border bg-raised px-4 sm:px-8">
          <button
            onClick={() => setOpen(true)}
            aria-label={labels.openMenu}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border lg:hidden"
          >
            <Icon name="menu" />
          </button>
          {topBar}
        </header>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function TopBarSearch({ placeholder }: { placeholder: string }) {
  return (
    <label className="flex h-11 w-full min-w-0 max-w-md items-center gap-2 rounded-2xl border border-border bg-raised px-4 text-fg-muted">
      <Icon name="search" />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
      />
    </label>
  );
}
