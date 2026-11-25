'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { localizeText, providerApi } from '@/features/provider/api';
import { BOOKING_TONES, formatBookingRange, monthRange } from '@/features/provider/format';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { EmptyState, LoadError, PageHeader, ProfileRequired, Skeleton } from './parts';
import { useProvider } from './ProviderShell';

type Period = 'month' | 'lastMonth' | 'year' | 'all';
const PERIODS: Period[] = ['month', 'lastMonth', 'year', 'all'];

function rangeFor(period: Period) {
  if (period === 'month') return monthRange(0);
  if (period === 'lastMonth') return monthRange(-1);
  if (period === 'year') return { from: new Date(new Date().getFullYear(), 0, 1), to: undefined };
  return {};
}

const inRange = (iso: string, range: { from?: Date; to?: Date }) => {
  const time = new Date(iso).getTime();
  return (!range.from || time >= range.from.getTime()) && (!range.to || time <= range.to.getTime());
};

export function EarningsScreen() {
  const { t, locale, profile, profileLoading } = useProvider();
  const copy = t.providerPages.earnings;
  const [period, setPeriod] = useState<Period>('month');
  const earnings = useAsync(() => providerApi.earnings(rangeFor(period)), [period]);
  const bookings = useAsync(providerApi.bookings, []);
  const range = rangeFor(period);
  const jobs = (bookings.data ?? [])
    .filter((booking) => (booking.status === 'paid' || booking.status === 'completed') && inRange(booking.startDate, range))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (profileLoading) return <Skeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      {!profile ? (
        <ProfileRequired />
      ) : (
        <>
          <div role="tablist" aria-label={copy.title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {PERIODS.map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={period === key}
                onClick={() => setPeriod(key)}
                className={cn(
                  'h-10 shrink-0 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap',
                  period === key ? 'border-primary bg-primary text-white' : 'border-border bg-raised hover:bg-surface',
                )}
              >
                {copy.periods[key]}
              </button>
            ))}
          </div>

          {earnings.error && !earnings.data ? (
            <LoadError onRetry={earnings.reload} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label={copy.net} value={earnings.data && !earnings.loading ? formatMoney(earnings.data.net) : '…'} strong />
              <Stat label={copy.gross} value={earnings.data && !earnings.loading ? formatMoney(earnings.data.gross) : '…'} />
              <Stat
                label={copy.commission}
                value={earnings.data && !earnings.loading ? earnings.data.commission > 0 ? `−${formatMoney(earnings.data.commission)}` : formatMoney(0) : '…'}
              />
              <Stat
                label={copy.paidBookings}
                value={earnings.data && !earnings.loading ? String(earnings.data.paidBookings) : '…'}
                hint={
                  earnings.data && earnings.data.refunded > 0
                    ? `${copy.refunded}: ${formatMoney(earnings.data.refunded)}`
                    : undefined
                }
              />
            </div>
          )}

          <Card className="overflow-hidden">
            <h2 className="border-b border-border px-5 py-4 text-xl font-extrabold tracking-tight">{copy.jobsTitle}</h2>
            {bookings.loading && !bookings.data ? (
              <Skeleton className="p-5" />
            ) : bookings.error && !bookings.data ? (
              <div className="p-5">
                <LoadError onRetry={bookings.reload} />
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-5">
                <EmptyState icon="wallet" text={copy.noJobs} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {jobs.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`/provider/bookings?booking=${booking.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface"
                    >
                      <span className="min-w-0 flex-1 basis-56">
                        <span className="block truncate font-bold">{booking.organizer?.name ?? t.provider.bookings.unknownOrganizer}</span>
                        <span className="block truncate text-sm text-fg-secondary">
                          {booking.event ? localizeText(booking.event.title, locale) : t.provider.bookings.noEvent}
                        </span>
                      </span>
                      <span className="text-[15px] whitespace-nowrap text-fg-secondary">
                        {formatBookingRange(booking, locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <StatusPill tone={BOOKING_TONES[booking.status]}>{t.provider.bookings.status[booking.status]}</StatusPill>
                      <span className="w-32 text-right font-extrabold">{formatMoney(booking.amount ?? 0)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <Card className={cn('flex flex-col gap-2 p-5', strong && 'border-primary/40 bg-primary-subtle')}>
      <p className="text-[15px] text-fg-secondary">{label}</p>
      <p className="text-[28px] leading-9 font-extrabold tracking-tight">{value}</p>
      {hint ? <p className="text-sm text-fg-secondary">{hint}</p> : null}
    </Card>
  );
}
