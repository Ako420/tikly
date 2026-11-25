'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  capacityOf,
  loadEventsWithStats,
  localize,
  STATUS_META,
  type EventStatus,
  type EventWithStats,
} from '@/features/organizer/api';
import { cn } from '@/lib/cn';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { Card, LoadError, Progress } from './parts';

const TABS: { key: 'all' | EventStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'pending', label: 'Pending approval' },
  { key: 'published', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function EventsScreen() {
  const { data: events, error, loading, reload } = useAsync(loadEventsWithStats, []);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');

  const cities = useMemo(() => [...new Set(events?.map((event) => event.city))].sort(), [events]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (events ?? [])
      .filter((event) => tab === 'all' || event.status === tab)
      .filter((event) => !city || event.city === city)
      .filter((event) => !needle || `${localize(event.title)} ${event.venue}`.toLowerCase().includes(needle))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [events, tab, query, city]);

  const count = (key: (typeof TABS)[number]['key']) =>
    events?.filter((event) => key === 'all' || event.status === key).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-extrabold tracking-tight">Events</h1>
        <p className="text-sm text-fg-secondary">New and edited events go to an admin for approval before they appear publicly.</p>
      </header>

      <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold',
              tab === item.key ? 'border-primary text-primary' : 'border-transparent text-fg-secondary hover:text-fg',
            )}
          >
            {item.label}
            <span className={cn('rounded-full px-2 text-xs', tab === item.key ? 'bg-primary text-white' : 'bg-surface text-fg-muted')}>
              {count(item.key)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-border bg-raised px-4 text-fg-muted">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by event name or venue"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
          />
        </label>
        <select
          value={city}
          onChange={(event) => setCity(event.target.value)}
          aria-label="City"
          className="h-12 rounded-2xl border border-border bg-raised px-4 text-[15px] font-semibold sm:w-56"
        >
          <option value="">All cities</option>
          {cities.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>

      {loading && !events ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-80 animate-pulse rounded-[18px] bg-raised" />
          ))}
        </div>
      ) : error ? (
        <LoadError what="your events" onRetry={reload} />
      ) : visible.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <p className="text-xl font-bold">No events here</p>
          <p className="mt-2 text-fg-muted">Try another filter, or create an event and submit it for approval.</p>
        </Card>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventWithStats }) {
  const meta = STATUS_META[event.status];
  const start = new Date(event.startAt);
  const capacity = capacityOf(event.stats);
  const sold = event.stats?.totals.ticketsSold ?? 0;
  const href = `/organizer/events/${event.id}`;
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link href={href} className="relative block h-40 bg-surface">
        {event.coverUrl ? (
          <img src={event.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 text-sm text-fg-muted">
            <Icon name="image" />
            No cover image yet
          </span>
        )}
        <StatusPill tone={meta.tone} className="absolute top-3 left-3">
          {meta.label}
        </StatusPill>
        <span className="absolute top-3 right-3 flex flex-col items-center rounded-xl bg-raised px-2.5 py-1 leading-tight shadow-sm">
          <span className="text-lg font-extrabold">{start.getDate()}</span>
          <span className="text-[11px] font-bold text-fg-secondary uppercase">
            {start.toLocaleString('en-GB', { month: 'short' })}
          </span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Link href={href} className="text-[17px] font-extrabold hover:text-primary">
            {localize(event.title)}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-fg-secondary">
            <Icon name="location" size={14} />
            {event.venue ? `${event.venue}, ${event.city}` : 'Venue not set yet'}
          </p>
        </div>
        <div className="mt-auto">
          {event.status === 'rejected' ? (
            <>
              {event.rejectionReason && (
                <div className="rounded-xl bg-invalid-subtle p-3 text-[13px]">
                  <p className="flex items-center gap-1 font-bold text-invalid">
                    <Icon name="alert" size={14} /> Reason from admin
                  </p>
                  <p className="mt-1 text-fg-secondary">{event.rejectionReason}</p>
                </div>
              )}
              <Link href={href} className={buttonClass('outline', 'sm', 'mt-3 w-full')}>
                <Icon name="edit" size={16} /> Edit and resubmit
              </Link>
            </>
          ) : event.status === 'pending' ? (
            <p className="flex gap-2 rounded-xl bg-warning-subtle p-3 text-[13px] text-warning-text">
              <Icon name="pending" size={16} className="shrink-0" />
              You can&apos;t sell tickets until an admin approves it.
            </p>
          ) : event.status === 'draft' ? (
            <Link href={href} className={buttonClass('primary', 'sm', 'w-full')}>
              Continue setup
            </Link>
          ) : (
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-[13px] font-bold">
                <span>
                  {formatAmount(sold)} / {formatAmount(capacity)} sold
                </span>
                <span>{formatMoney(event.stats?.totals.gross ?? 0)}</span>
              </div>
              <Progress className="mt-2" value={capacity ? sold / capacity : 0} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
