'use client';

import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { daysUntil, formatDateRange, localize, organizerApi, STATUS_META, type EventStats } from '@/features/organizer/api';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { Card, LoadError, Progress } from './parts';

export function EventWorkspaceScreen({ eventId }: { eventId: string }) {
  const { data, error, loading, reload } = useAsync(
    async () => {
      const [event, stats, counts] = await Promise.all([
        organizerApi.event(eventId),
        organizerApi.stats(eventId).catch(() => null),
        organizerApi.workspace(eventId),
      ]);
      return { event, stats, counts };
    },
    [eventId],
  );

  if (loading && !data) return <div className="h-96 animate-pulse rounded-[18px] bg-raised" />;
  if (error || !data) return <LoadError what="this event" onRetry={reload} />;

  const { event, stats, counts } = data;
  const meta = STATUS_META[event.status];
  const days = daysUntil(event.startAt);

  const tiles: { label: string; icon: IconName; value?: string; note?: string }[] = [
    {
      label: 'Budget',
      icon: 'budget',
      value: counts.budget && formatMoney(counts.budget.actual),
      note: counts.budget && `spent of ${formatMoney(counts.budget.planned)} planned`,
    },
    {
      label: 'Checklist',
      icon: 'checklist',
      value: counts.checklist && `${counts.checklist.done} of ${counts.checklist.total}`,
      note: counts.checklist && `tasks done${counts.checklist.total ? ` · ${Math.round((counts.checklist.done / counts.checklist.total) * 100)}%` : ''}`,
    },
    {
      label: 'Exhibitors',
      icon: 'exhibitors',
      value: counts.slots && `${counts.slots.booked} / ${counts.slots.total}`,
      note: counts.slots && 'slots booked',
    },
    {
      label: 'Agenda',
      icon: 'agenda',
      value: counts.agenda !== undefined ? String(counts.agenda) : undefined,
      note: counts.agenda !== undefined ? 'sessions' : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/organizer/events" className="flex items-center gap-1 text-sm font-semibold text-fg-secondary hover:text-fg">
        <Icon name="back" size={16} /> Events
      </Link>

      <section className="relative overflow-hidden rounded-[18px] bg-media text-white">
        {event.coverUrl && <img src={event.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-media via-media/80 to-media/30" />
        <div className="relative flex flex-col gap-4 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
          <div>
            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
            <h1 className="mt-3 text-[32px] leading-tight font-extrabold tracking-tight">{localize(event.title)}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/90">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" size={16} />
                {formatDateRange(event.startAt, event.endAt)}
                {event.status === 'published' && days > 0 && ` · starts in ${days} days`}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="location" size={16} />
                {event.venue}, {event.city}
              </span>
            </p>
          </div>
          {event.status === 'published' && (
            <a
              href={`/events/${event.id}`}
              className="inline-flex h-9 shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-xl bg-white px-4 text-sm font-bold text-fg md:self-auto"
            >
              <Icon name="view" size={16} /> View public page
            </a>
          )}
        </div>
      </section>

      {event.status === 'rejected' && event.rejectionReason && (
        <Card className="border-invalid/40 bg-invalid-subtle p-4 text-sm">
          <p className="font-bold text-invalid">Reason from admin</p>
          <p className="mt-1 text-fg-secondary">{event.rejectionReason}</p>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {stats ? (
            <SalesCard stats={stats} eventId={event.id} />
          ) : (
            <Card className="p-6 text-fg-muted">Ticket sales appear here once the event is published.</Card>
          )}
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((tile) => (
              <li key={tile.label}>
                <Card className="h-full p-4">
                  <Icon name={tile.icon} className="text-primary" />
                  <p className="mt-3 text-sm font-semibold text-fg-secondary">{tile.label}</p>
                  <p className="mt-1 text-xl font-extrabold">{tile.value ?? '—'}</p>
                  <p className="text-[13px] text-fg-muted">{tile.note ?? 'Not set up yet'}</p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
        <Card className="h-fit p-5">
          <h2 className="text-[17px] font-extrabold">Gate staff</h2>
          <p className="mt-3 text-3xl font-extrabold">{counts.staff ?? 0}</p>
          <p className="mt-1 text-[13px] text-fg-secondary">
            staff assigned. They scan tickets in the mobile app; live check-ins appear here on event day.
          </p>
          {stats && (
            <p className="mt-4 border-t border-border pt-4 text-sm">
              <span className="font-bold">{formatAmount(stats.totals.checkedIn)}</span>{' '}
              <span className="text-fg-secondary">checked in so far</span>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function SalesCard({ stats, eventId }: { stats: EventStats; eventId: string }) {
  const capacity = stats.tiers.reduce((sum, tier) => sum + tier.quantity, 0);
  const percent = capacity ? Math.round((stats.totals.ticketsSold / capacity) * 100) : 0;
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">Ticket sales</h2>
          <p className="text-[13px] text-fg-muted">Net after commission: {formatMoney(stats.totals.net)}</p>
          <Link href={`/organizer/orders?event=${eventId}`} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            View orders & attendees <Icon name="chevron" size={16} />
          </Link>
        </div>
        <div className="text-right">
          <p className="text-[30px] leading-tight font-extrabold">{formatMoney(stats.totals.gross)}</p>
          <p className="text-[13px] text-fg-muted">
            {formatAmount(stats.totals.ticketsSold)} of {formatAmount(capacity)} tickets · {percent}%
          </p>
        </div>
      </div>
      <ul className="mt-6 flex flex-col gap-5">
        {stats.tiers.map((tier) => {
          const left = tier.quantity - tier.sold;
          return (
            <li key={tier.id}>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-bold capitalize">{tier.name}</span>
                  <span className="text-[13px] text-fg-muted">{formatMoney(tier.price)}</span>
                  {left > 0 && tier.quantity && left / tier.quantity <= 0.1 && (
                    <span className="rounded-md bg-warning-subtle px-1.5 text-xs font-bold text-warning-text">{left} left</span>
                  )}
                </span>
                <span className="font-semibold">
                  {formatAmount(tier.sold)} / {formatAmount(tier.quantity)} · {formatMoney(tier.sold * tier.price)}
                </span>
              </div>
              <Progress className="mt-2 h-2" value={tier.quantity ? tier.sold / tier.quantity : 0} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
