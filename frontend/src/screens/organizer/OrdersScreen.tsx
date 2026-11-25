'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  localize,
  ORDER_STATUS_META,
  organizerApi,
  salesApi,
  TICKET_STATUS_META,
  TIER_LABEL,
  type EventAttendee,
  type EventOrder,
  type EventStats,
  type OrganizerEvent,
  type SalesPerson,
} from '@/features/organizer/api';
import type { Page } from '@/lib/http/client';
import { cn } from '@/lib/cn';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { Card, LoadError, Pager, Progress } from './parts';

type Tab = 'orders' | 'attendees';

const SELLING: OrganizerEvent['status'][] = ['published', 'completed', 'suspended', 'cancelled'];

const ORDER_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
  { value: 'refunded', label: 'Refunded' },
];

const ATTENDEE_FILTERS = [
  { value: '', label: 'All tickets' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'valid', label: 'Not checked in' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

function pickDefault(events: OrganizerEvent[]) {
  const now = Date.now();
  const upcoming = events
    .filter((event) => event.status === 'published' && new Date(event.endAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  return upcoming[0] ?? [...events].sort((a, b) => b.startAt.localeCompare(a.startAt))[0];
}

export function OrdersScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const events = useAsync(async () => {
    const all = await organizerApi.events();
    return all.filter((event) => SELLING.includes(event.status)).sort((a, b) => b.startAt.localeCompare(a.startAt));
  }, []);

  const tab: Tab = params.get('tab') === 'attendees' ? 'attendees' : 'orders';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = params.get('status') ?? '';
  const tierId = params.get('tier') ?? '';
  const q = params.get('q') ?? '';
  const event = events.data?.find((item) => item.id === params.get('event')) ?? (events.data && pickDefault(events.data));

  const setParams = useCallback(
    (next: Record<string, string | undefined>, resetPage = true) => {
      const merged = new URLSearchParams(params);
      if (resetPage) merged.delete('page');
      for (const [key, value] of Object.entries(next)) {
        if (value) merged.set(key, value);
        else merged.delete(key);
      }
      router.replace(`${pathname}?${merged}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const header = (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight">Orders & attendees</h1>
        <p className="text-sm text-fg-secondary">Who bought tickets, how they paid, and who is through the gate.</p>
      </div>
      {event && events.data && (
        <select
          value={event.id}
          onChange={(change) => setParams({ event: change.target.value, status: undefined, tier: undefined, q: undefined })}
          aria-label="Event"
          className="h-12 w-full rounded-2xl border border-border bg-raised px-4 text-[15px] font-semibold md:w-80"
        >
          {events.data.map((item) => (
            <option key={item.id} value={item.id}>
              {localize(item.title)}
            </option>
          ))}
        </select>
      )}
    </header>
  );

  if (events.loading && !events.data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="h-28 animate-pulse rounded-[18px] bg-raised" />
        <div className="h-96 animate-pulse rounded-[18px] bg-raised" />
      </div>
    );
  }
  if (events.error || !events.data) return <LoadError what="your events" onRetry={events.reload} />;

  if (!event) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="border-dashed p-12 text-center">
          <Icon name="orders" size={28} className="mx-auto text-primary" />
          <p className="mt-3 text-xl font-bold">No ticket sales yet</p>
          <p className="mx-auto mt-2 max-w-md text-fg-muted">
            Orders and attendees appear here once an admin approves one of your events and tickets go on sale.
          </p>
          <Link href="/organizer/events" className={buttonClass('outline', 'sm', 'mt-5')}>
            Go to your events
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <EventSales
        key={event.id}
        event={event}
        tab={tab}
        page={page}
        status={status}
        tierId={tierId}
        q={q}
        setParams={setParams}
      />
    </div>
  );
}

type Rows = ({ tab: 'orders' } & Page<EventOrder>) | ({ tab: 'attendees' } & Page<EventAttendee>);

type SalesProps = {
  event: OrganizerEvent;
  tab: Tab;
  page: number;
  status: string;
  tierId: string;
  q: string;
  setParams: (next: Record<string, string | undefined>, resetPage?: boolean) => void;
};

function EventSales({ event, tab, page, status, tierId, q, setParams }: SalesProps) {
  const stats = useAsync(() => organizerApi.stats(event.id), [event.id]);
  const [search, setSearch] = useState(q);

  useEffect(() => {
    if (search.trim() === q) return;
    const timer = setTimeout(() => setParams({ q: search.trim() || undefined }), 350);
    return () => clearTimeout(timer);
  }, [search, q, setParams]);

  const query = { page, status: status || undefined, q: q || undefined, tierId: tab === 'attendees' ? tierId || undefined : undefined };
  const list = useAsync<Rows>(
    async () =>
      tab === 'orders'
        ? { tab, ...(await salesApi.orders(event.id, query)) }
        : { tab, ...(await salesApi.attendees(event.id, query)) },
    [event.id, tab, page, status, q, tierId],
  );
  const rows = list.data?.tab === tab ? list.data : null;

  const filters = tab === 'orders' ? ORDER_FILTERS : ATTENDEE_FILTERS;
  const filtered = Boolean(status || q || (tab === 'attendees' && tierId));

  return (
    <>
      <Summary stats={stats.data} />

      <Card className="overflow-hidden">
        <div role="tablist" aria-label="View" className="flex gap-1 border-b border-border px-4 sm:px-6">
          {(['orders', 'attendees'] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setParams({ tab: key === 'orders' ? undefined : key, status: undefined, tier: undefined })}
              className={cn(
                '-mb-px border-b-2 px-3 py-4 text-[15px] font-bold',
                tab === key ? 'border-primary text-primary' : 'border-transparent text-fg-secondary hover:text-fg',
              )}
            >
              {key === 'orders' ? 'Orders' : 'Attendees'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:px-6">
          <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-border bg-raised px-4 text-fg-muted">
            <Icon name="search" />
            <input
              value={search}
              onChange={(change) => setSearch(change.target.value)}
              placeholder={tab === 'orders' ? 'Search buyer, phone or code' : 'Search name or ticket code'}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
            />
          </label>
          {tab === 'attendees' && stats.data && stats.data.tiers.length > 1 && (
            <select
              value={tierId}
              onChange={(change) => setParams({ tier: change.target.value || undefined })}
              aria-label="Ticket tier"
              className="h-12 rounded-2xl border border-border bg-raised px-4 text-[15px] font-semibold sm:w-44"
            >
              <option value="">All tiers</option>
              {stats.data.tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {TIER_LABEL[tier.name as keyof typeof TIER_LABEL] ?? tier.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={status}
            onChange={(change) => setParams({ status: change.target.value || undefined })}
            aria-label="Status"
            className="h-12 rounded-2xl border border-border bg-raised px-4 text-[15px] font-semibold sm:w-52"
          >
            {filters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        {list.error ? (
          <div className="border-t border-border p-8 text-center">
            <p className="text-fg-secondary">We could not load the {tab}.</p>
            <button onClick={list.reload} className="mt-3 font-bold text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : !rows ? (
          <div className="flex flex-col gap-2 border-t border-border p-4 sm:px-6">
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className="h-14 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : rows.items.length === 0 ? (
          <div className="border-t border-border px-6 py-14 text-center">
            <p className="text-lg font-bold">{filtered ? 'Nothing matches' : tab === 'orders' ? 'No orders yet' : 'No attendees yet'}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {filtered
                ? 'Try another search or status.'
                : 'Orders appear here as soon as someone starts buying a ticket.'}
            </p>
          </div>
        ) : (
          <div className={cn('transition-opacity', list.loading && 'opacity-60')}>
            {rows.tab === 'orders' ? <OrdersTable orders={rows.items} /> : <AttendeesTable attendees={rows.items} />}
            <Pager meta={rows.meta} onPage={(next) => setParams({ page: next > 1 ? String(next) : undefined }, false)} />
          </div>
        )}
      </Card>
    </>
  );
}

function Summary({ stats }: { stats: EventStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-[18px] bg-raised" />
        ))}
      </div>
    );
  }
  const capacity = stats.tiers.reduce((sum, tier) => sum + tier.quantity, 0);
  const { ticketsSold, checkedIn, gross, net } = stats.totals;
  const tiles: { label: string; value: string; note: ReactNode }[] = [
    {
      label: 'Tickets sold',
      value: formatAmount(ticketsSold),
      note: <Progress className="mt-2" value={capacity ? ticketsSold / capacity : 0} />,
    },
    { label: 'Gross sales', value: formatMoney(gross), note: `of ${formatAmount(capacity)} tickets on sale` },
    {
      label: 'Checked in',
      value: formatAmount(checkedIn),
      note: ticketsSold ? `${Math.round((checkedIn / ticketsSold) * 100)}% of tickets sold` : 'No tickets sold yet',
    },
    { label: 'Your payout', value: formatMoney(net), note: 'After platform commission' },
  ];
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.label}>
          <Card className="h-full p-5">
            <p className="text-sm font-semibold text-fg-secondary">{tile.label}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{tile.value}</p>
            <div className="text-[13px] text-fg-muted">{tile.note}</div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function Person({ person, extra }: { person: SalesPerson; extra?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-subtle text-[13px] font-bold text-primary">
        {initials(person.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-bold">{person.name || 'Unknown buyer'}</p>
        <p className="truncate text-[13px] text-fg-muted">{extra ?? person.email ?? person.phone ?? ''}</p>
      </div>
    </div>
  );
}

const th = 'px-4 py-3 text-left text-xs font-bold tracking-wide text-fg-muted uppercase first:pl-4 sm:first:pl-6 last:pr-4 sm:last:pr-6';
const td = 'px-4 py-3 align-middle first:pl-4 sm:first:pl-6 last:pr-4 sm:last:pr-6';

function OrdersTable({ orders }: { orders: EventOrder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-t border-border text-sm">
        <thead className="bg-surface">
          <tr>
            <th className={th}>Buyer</th>
            <th className={th}>Tickets</th>
            <th className={th}>Paid with</th>
            <th className={cn(th, 'text-right')}>Amount</th>
            <th className={th}>Status</th>
            <th className={th}>Ordered</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const meta = ORDER_STATUS_META[order.status];
            return (
              <tr key={order.id} className="border-t border-border">
                <td className={cn(td, 'max-w-64')}>
                  <Person person={order.buyer} />
                </td>
                <td className={td}>
                  {order.items.map((item) => (
                    <p key={item.tier} className="whitespace-nowrap">
                      <span className="font-bold">{item.quantity} ×</span> {TIER_LABEL[item.tier] ?? item.tier}
                    </p>
                  ))}
                </td>
                <td className={cn(td, 'whitespace-nowrap text-fg-secondary')}>{order.phone ?? '—'}</td>
                <td className={cn(td, 'text-right font-bold whitespace-nowrap')}>{formatMoney(order.amount)}</td>
                <td className={td}>
                  <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                </td>
                <td className={cn(td, 'whitespace-nowrap text-fg-secondary')}>{dateTime(order.paidAt ?? order.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttendeesTable({ attendees }: { attendees: EventAttendee[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-t border-border text-sm">
        <thead className="bg-surface">
          <tr>
            <th className={th}>Attendee</th>
            <th className={th}>Ticket</th>
            <th className={th}>Tier</th>
            <th className={th}>Gate</th>
            <th className={th}>Bought</th>
          </tr>
        </thead>
        <tbody>
          {attendees.map((ticket) => {
            const meta = TICKET_STATUS_META[ticket.status];
            return (
              <tr key={ticket.id} className="border-t border-border">
                <td className={cn(td, 'max-w-64')}>
                  <Person person={ticket.holder} />
                </td>
                <td className={cn(td, 'font-mono text-[13px] font-semibold whitespace-nowrap')}>{ticket.code}</td>
                <td className={cn(td, 'font-semibold')}>{TIER_LABEL[ticket.tier] ?? ticket.tier}</td>
                <td className={td}>
                  <div className="flex flex-col items-start gap-1">
                    <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                    {ticket.checkedInAt && (
                      <span className="text-xs whitespace-nowrap text-fg-muted">
                        {dateTime(ticket.checkedInAt)}
                        {ticket.reentries > 0 && ` · ${ticket.reentries} re-entr${ticket.reentries === 1 ? 'y' : 'ies'}`}
                      </span>
                    )}
                  </div>
                </td>
                <td className={cn(td, 'whitespace-nowrap text-fg-secondary')}>{dateTime(ticket.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
