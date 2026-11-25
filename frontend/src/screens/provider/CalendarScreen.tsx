'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { localizeText, providerApi, type ProviderBooking } from '@/features/provider/api';
import { fill, intlLocale } from '@/features/provider/format';
import type { Locale } from '@/i18n/dictionaries';
import { cn } from '@/lib/cn';
import { useAsync } from '@/lib/useAsync';
import { EmptyState, LoadError, PageHeader, ProfileRequired, Skeleton } from './parts';
import { useProvider } from './ProviderShell';

const SHOWN_STATUSES = new Set(['requested', 'accepted', 'paid', 'completed']);
const CHIP_TONES: Record<string, string> = {
  requested: 'bg-primary-subtle text-primary',
  accepted: 'bg-warning-subtle text-warning-text',
  paid: 'bg-valid-subtle text-valid',
  completed: 'bg-surface text-fg-secondary',
};
const MAX_CHIPS = 3;

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function daysOf(booking: ProviderBooking) {
  const days: string[] = [];
  const cursor = new Date(booking.startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(booking.endDate);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end && days.length < 62) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + lastDay) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function CalendarScreen() {
  const { t, locale, profile, profileLoading } = useProvider();
  const copy = t.providerPages.calendar;
  const bookings = useAsync(providerApi.bookings, []);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, ProviderBooking[]>();
    for (const booking of bookings.data ?? []) {
      if (!SHOWN_STATUSES.has(booking.status)) continue;
      for (const key of daysOf(booking)) map.set(key, [...(map.get(key) ?? []), booking]);
    }
    return map;
  }, [bookings.data]);

  const grid = monthGrid(month);
  const todayKey = dayKey(new Date());
  const inMonth = (date: Date) => date.getMonth() === month.getMonth();
  const monthDays = grid.filter((date) => inMonth(date) && byDay.has(dayKey(date)));
  const format = (options: Intl.DateTimeFormatOptions, date: Date) => new Intl.DateTimeFormat(intlLocale(locale), options).format(date);
  const weekdays = grid.slice(0, 7).map((date) => format({ weekday: 'short' }, date));
  const shift = (delta: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  if (profileLoading) return <Skeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      {!profile ? (
        <ProfileRequired />
      ) : bookings.loading && !bookings.data ? (
        <Skeleton rows={5} />
      ) : bookings.error && !bookings.data ? (
        <LoadError onRetry={bookings.reload} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <h2 className="flex-1 text-xl font-extrabold tracking-tight first-letter:uppercase">
              {format({ month: 'long', year: 'numeric' }, month)}
            </h2>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className={buttonClass('secondary', 'sm')}
            >
              {copy.today}
            </button>
            <button type="button" aria-label={copy.previous} onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-full border border-border hover:bg-surface">
              <Icon name="back" size={18} />
            </button>
            <button type="button" aria-label={copy.next} onClick={() => shift(1)} className="grid size-9 place-items-center rounded-full border border-border hover:bg-surface">
              <Icon name="chevron" size={18} />
            </button>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-7 border-b border-border">
              {weekdays.map((name) => (
                <p key={name} className="px-2 py-2 text-xs font-bold tracking-wider text-fg-secondary uppercase">
                  {name}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((date) => {
                const key = dayKey(date);
                const items = byDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex min-h-28 flex-col gap-1 border-r border-b border-border p-1.5 [&:nth-child(7n)]:border-r-0',
                      !inMonth(date) && 'bg-surface/60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-7 place-items-center rounded-full text-sm font-semibold',
                        key === todayKey ? 'bg-primary text-white' : inMonth(date) ? 'text-fg' : 'text-fg-muted',
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {items.slice(0, MAX_CHIPS).map((booking) => (
                      <Chip key={booking.id} booking={booking} locale={locale} />
                    ))}
                    {items.length > MAX_CHIPS ? (
                      <span className="px-1 text-xs font-semibold text-fg-secondary">
                        {fill(copy.more, { count: items.length - MAX_CHIPS })}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:hidden">
            {monthDays.length === 0 ? (
              <div className="p-4">
                <EmptyState icon="calendar" text={copy.empty} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {monthDays.map((date) => (
                  <li key={dayKey(date)} className="flex gap-3 px-4 py-3">
                    <span className="flex w-11 shrink-0 flex-col items-center">
                      <span className="text-xs font-bold text-fg-secondary uppercase">{format({ weekday: 'short' }, date)}</span>
                      <span className={cn('text-lg font-extrabold', dayKey(date) === todayKey && 'text-primary')}>{date.getDate()}</span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      {(byDay.get(dayKey(date)) ?? []).map((booking) => (
                        <Chip key={booking.id} booking={booking} locale={locale} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Chip({ booking, locale }: { booking: ProviderBooking; locale: Locale }) {
  const { t } = useProvider();
  const title = booking.event ? localizeText(booking.event.title, locale) : (booking.organizer?.name ?? t.provider.bookings.noEvent);
  return (
    <Link
      href={`/provider/bookings?booking=${booking.id}`}
      title={`${title} · ${t.provider.bookings.status[booking.status]}`}
      className={cn('truncate rounded-md px-1.5 py-0.5 text-xs font-semibold hover:opacity-80', CHIP_TONES[booking.status])}
    >
      {title}
    </Link>
  );
}
