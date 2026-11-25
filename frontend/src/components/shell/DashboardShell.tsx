'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { logout } from '@/features/auth/actions';
import { cn } from '@/lib/cn';

export type NavItem = { href: string; label: string; icon: IconName; ready?: boolean; count?: number };

type Props = {
  home: string;
  nav: NavItem[];
  footerNav?: NavItem[];
  badge: { label: string; className: string };
  user: { name: string; role: string };
  searchPlaceholder: string;
  action?: ReactNode;
  children: ReactNode;
};

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export function DashboardShell({ home, nav, footerNav = [], badge, user, searchPlaceholder, action, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === home ? pathname === href : pathname.startsWith(href));

  const renderItem = (item: NavItem) =>
    item.ready ? (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={isActive(item.href) ? 'page' : undefined}
        className={cn(
          'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
          isActive(item.href) ? 'bg-primary-subtle text-primary' : 'text-fg hover:bg-surface',
        )}
      >
        <Icon name={item.icon} />
        <span className="flex-1">{item.label}</span>
        {item.count ? (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-on-accent">
            {item.count}
          </span>
        ) : null}
      </Link>
    ) : (
      <span
        key={item.href}
        aria-disabled
        title="Coming soon"
        className="flex h-11 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-fg-muted"
      >
        <Icon name={item.icon} />
        <span className="flex-1">{item.label}</span>
        {item.count ? (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-surface px-1.5 text-xs font-bold">{item.count}</span>
        ) : null}
      </span>
    );

  const sidebar = (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between px-1 py-1">
        <Link href={home}>
          <Logo />
        </Link>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase', badge.className)}>
          {badge.label}
        </span>
      </div>
      <nav aria-label={badge.label} className="mt-6 flex flex-col gap-1">
        {nav.map(renderItem)}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        {footerNav.map(renderItem)}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border p-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-fg-muted">{user.role}</p>
          </div>
          <form action={logout}>
            <button type="submit" aria-label="Sign out" className="rounded-lg p-1.5 text-fg-muted hover:bg-surface hover:text-fg">
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
          <button aria-label="Close menu" className="absolute inset-0 bg-media/40" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] bg-raised shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-17 items-center gap-3 border-b border-border bg-raised px-4 sm:px-8">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-full border border-border lg:hidden"
          >
            <Icon name="menu" />
          </button>
          <label className="flex h-11 w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-raised px-4 text-fg-muted">
            <Icon name="search" />
            <input
              placeholder={searchPlaceholder}
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
            />
          </label>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden size-10 place-items-center rounded-full border border-border sm:grid">
              <Icon name="bell" />
            </span>
            {action}
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
