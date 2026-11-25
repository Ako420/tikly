'use client';

import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  capacityOf,
  daysUntil,
  formatShortDate,
  formatTime,
  loadEventsWithStats,
  localize,
  STATUS_META,
  type EventWithStats,
} from '@/features/organizer/api';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useOrganizer } from './OrganizerShell';
import { Card, LoadError, Progress } from './parts';

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

export function OverviewScreen() {
  const user = useOrganizer();
  const { data: events, error, loading, reload } = useAsync(loadEventsWithStats, []);
  const firstName = user?.name.split(' ')[0] ?? '';
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-fg-secondary">{today}</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight">
          {greeting()}, {firstName}
        </h1>
      </header>
      {loading && !events ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-28 animate-pulse rounded-[18px] bg-raised" />
          ))}
        </div>
      ) : error || !events ? (
        <LoadError what="your dashboard" onRetry={reload} />
      ) : (
        <Dashboard events={events} />
      )}
    </div>
  );
}

function Dashboard({ events }: { events: EventWithStats[] }) {
  const totals = events.reduce(
    (sum, event) => ({
      gross: sum.gross + (event.stats?.totals.gross ?? 0),
      sold: sum.sold + (event.stats?.totals.ticketsSold ?? 0),
      net: sum.net + (event.stats?.totals.net ?? 0),
    }),
    { gross: 0, sold: 0, net: 0 },
  );
  const upcoming = events
    .filter((event) => event.status === 'published' && daysUntil(event.startAt) >= 0)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = upcoming[0];

  const kpis = [
    { label: 'Gross ticket sales', value: formatMoney(totals.gross), note: 'All events' },
    { label: 'Tickets sold', value: formatAmount(totals.sold), note: 'All events' },
    {
      label: 'Upcoming events',
      value: String(upcoming.length),
      note: next ? `Next: ${localize(next.title)} ${daysUntil(next.startAt) === 0 ? 'today' : `in ${daysUntil(next.startAt)} days`}` : 'Nothing scheduled',
    },
    { label: 'Net payout after commission', value: formatMoney(totals.net), note: 'After platform fees' },
  ];

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <li key={kpi.label}>
            <Card className="h-full p-5">
              <p className="text-sm font-semibold text-fg-secondary">{kpi.label}</p>
              <p className="mt-2 text-[30px] leading-tight font-extrabold tracking-tight">{kpi.value}</p>
              <p className="mt-1 truncate text-[13px] text-fg-muted">{kpi.note}</p>
            </Card>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SalesByEvent events={events} />
        <Attention events={events} />
      </div>

      <EventsTable events={events} />
    </>
  );
}

function SalesByEvent({ events }: { events: EventWithStats[] }) {
  const rows = events.filter((event) => event.stats).sort((a, b) => b.stats!.totals.ticketsSold - a.stats!.totals.ticketsSold);
  return (
    <Card className="p-6">
      <h2 className="text-xl font-extrabold">Tickets sold per event</h2>
      <p className="text-sm text-fg-muted">Sold against capacity for every live event</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-center text-fg-muted">No ticket sales yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-5">
          {rows.map((event) => {
            const capacity = capacityOf(event.stats);
            return (
              <li key={event.id}>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="truncate font-bold">{localize(event.title)}</span>
                  <span className="shrink-0 font-semibold text-fg-secondary">
                    {formatAmount(event.stats!.totals.ticketsSold)} / {formatAmount(capacity)}
                  </span>
                </div>
                <Progress className="mt-2 h-2.5" value={capacity ? event.stats!.totals.ticketsSold / capacity : 0} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Attention({ events }: { events: EventWithStats[] }) {
  const items: { id: string; icon: IconName; tone: string; title: string; body: string }[] = [];
  for (const event of events) {
    const title = localize(event.title);
    if (event.status === 'rejected')
      items.push({ id: event.id, icon: 'alert', tone: 'bg-invalid-subtle text-invalid', title: `${title} was rejected`, body: event.rejectionReason ? `Reason: ${event.rejectionReason}` : 'Edit and resubmit' });
    else if (event.status === 'pending')
      items.push({ id: event.id, icon: 'pending', tone: 'bg-warning-subtle text-warning-text', title: `${title} awaits approval`, body: 'An admin will review it soon' });
    else if (event.status === 'draft')
      items.push({ id: event.id, icon: 'edit', tone: 'bg-surface text-fg-secondary', title: `${title} is a draft`, body: 'Finish setup and submit for approval' });
    for (const tier of event.stats?.tiers ?? []) {
      if (tier.quantity && tier.available > 0 && tier.available / tier.quantity <= 0.1)
        items.push({ id: `${event.id}-${tier.id}`, icon: 'tickets', tone: 'bg-primary-subtle text-primary', title: `${tier.name} at ${title} is almost sold out`, body: `${tier.available} of ${tier.quantity} seats left` });
    }
  }
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Needs your attention</h2>
        <span className="text-sm font-semibold text-fg-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">You are all caught up.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link href={`/organizer/events/${item.id.split('-')[0]}`} className="flex items-center gap-3 py-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.tone}`}>
                  <Icon name={item.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{item.title}</span>
                  <span className="block truncate text-[13px] text-fg-muted">{item.body}</span>
                </span>
                <Icon name="chevron" size={16} className="text-fg-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EventsTable({ events }: { events: EventWithStats[] }) {
  const rows = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 6);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-6">
        <h2 className="text-xl font-extrabold">Your events</h2>
        <Link href="/organizer/events" className={buttonClass('secondary', 'sm')}>
          View all events
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 pb-8 text-fg-muted">No events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-y border-border bg-surface text-[11px] font-bold tracking-wider text-fg-muted uppercase">
              <tr>
                <th className="px-6 py-3">Event</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tickets sold</th>
                <th className="px-6 py-3">Gross sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((event) => {
                const meta = STATUS_META[event.status];
                const capacity = capacityOf(event.stats);
                const sold = event.stats?.totals.ticketsSold ?? 0;
                return (
                  <tr key={event.id} className="hover:bg-surface/60">
                    <td className="px-6 py-3">
                      <Link href={`/organizer/events/${event.id}`} className="font-bold hover:text-primary">
                        {localize(event.title)}
                      </Link>
                      <p className="text-[13px] text-fg-muted">
                        {event.venue}, {event.city}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-semibold">{formatShortDate(event.startAt)}</p>
                      <p className="text-fg-muted">{formatTime(event.startAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                    </td>
                    <td className="w-48 px-4 py-3 text-sm font-semibold">
                      {formatAmount(sold)} / {formatAmount(capacity)}
                      <Progress className="mt-1.5" value={capacity ? sold / capacity : 0} />
                    </td>
                    <td className="px-6 py-3 text-sm font-bold">{formatMoney(event.stats?.totals.gross ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
