'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  adminApi,
  ROLE_LABEL,
  STREAM_LABEL,
  waitingSince,
  type AdminStats,
  type PendingEvent,
  type PendingProvider,
  type Stream,
  type UserRole,
} from '@/features/admin/api';
import { formatShortDate, localize, STATUS_META, type EventStatus } from '@/features/organizer/api';
import { cn } from '@/lib/cn';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { Card, LoadError } from '../organizer/parts';

const PERIODS = [
  { key: 'all', label: 'All time' },
  { key: '30d', label: '30 days' },
  { key: '7d', label: '7 days' },
  { key: 'month', label: 'This month' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

const STREAMS: Stream[] = ['ticket', 'service', 'slot'];
const STREAM_COLOR: Record<Stream, string> = { ticket: 'bg-primary', service: 'bg-accent', slot: 'bg-valid' };
const ROLES: UserRole[] = ['attendee', 'organizer', 'provider', 'exhibitor', 'staff', 'admin'];
const EVENT_STATUSES: EventStatus[] = ['published', 'pending', 'completed', 'draft', 'rejected', 'suspended', 'cancelled'];
const DAY_MS = 86_400_000;

const rangeFor = (period: PeriodKey, now: Date): { from?: string; to?: string } => {
  if (period === 'all') return {};
  if (period === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: now.toISOString() };
  const days = period === '7d' ? 7 : 30;
  return { from: new Date(now.getTime() - days * DAY_MS).toISOString(), to: now.toISOString() };
};

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

export function AdminOverviewScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('period');
  const period: PeriodKey = PERIODS.some((item) => item.key === raw) ? (raw as PeriodKey) : 'all';

  const { data, error, loading, reload } = useAsync(async () => {
    const now = new Date();
    const [stats, settings, events, providers] = await Promise.all([
      adminApi.stats(rangeFor(period, now)),
      adminApi.settings(),
      adminApi.pendingEvents(4),
      adminApi.pendingProviders(4),
    ]);
    return { stats, settings, events, providers, now: now.getTime() };
  }, [period]);

  const periodLabel = PERIODS.find((item) => item.key === period)!.label.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Platform overview</h1>
          <p className="text-sm text-fg-secondary">Sales, commission and activity across tikly. Money and tickets follow the period you pick.</p>
        </div>
        <div role="radiogroup" aria-label="Period" className="flex max-w-full gap-1 self-start overflow-x-auto rounded-full border border-border bg-raised p-1 [scrollbar-width:none] md:self-auto">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              role="radio"
              aria-checked={period === item.key}
              onClick={() => router.replace(item.key === 'all' ? pathname : `${pathname}?period=${item.key}`, { scroll: false })}
              className={cn(
                'h-9 shrink-0 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors sm:px-4',
                period === item.key ? 'bg-primary text-white' : 'text-fg-secondary hover:text-fg',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <LoadError what="the platform totals" onRetry={reload} />
      ) : !data ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-32 animate-pulse rounded-[18px] bg-raised" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-[18px] bg-raised" />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-6 transition-opacity', loading && 'opacity-60')}>
          <Totals stats={data.stats} periodLabel={periodLabel} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <RevenueCard stats={data.stats} commission={data.settings.commission} />
            <AttentionCard events={data.events.items} eventTotal={data.events.meta.total} providers={data.providers.items} providerTotal={data.providers.meta.total} now={data.now} />
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <UsersCard stats={data.stats} />
            <EventsCard stats={data.stats} />
          </div>
        </div>
      )}
    </div>
  );
}

function Totals({ stats, periodLabel }: { stats: AdminStats; periodLabel: string }) {
  const payments = STREAMS.reduce((sum, stream) => sum + stats.revenue[stream].payments, 0);
  const { gross, commission, refunded } = stats.revenue.total;
  const tiles: { label: string; value: string; note: ReactNode; icon: Parameters<typeof Icon>[0]['name'] }[] = [
    {
      label: 'Gross sales',
      value: formatMoney(gross),
      note: `${formatAmount(payments)} payment${payments === 1 ? '' : 's'} · ${periodLabel}`,
      icon: 'budget',
    },
    {
      label: 'Commission earned',
      value: formatMoney(commission),
      note: refunded ? `${percent(commission, gross)}% of gross · ${formatMoney(refunded)} refunded` : `${percent(commission, gross)}% of gross`,
      icon: 'stats',
    },
    { label: 'Tickets sold', value: formatAmount(stats.ticketsSold), note: periodLabel, icon: 'tickets' },
    {
      label: 'Users',
      value: formatAmount(stats.users.total),
      note: `${formatAmount(stats.users.organizer)} organizers · ${formatAmount(stats.users.attendee)} attendees`,
      icon: 'user',
    },
  ];
  return (
    <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.label}>
          <Card className="h-full p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-fg-secondary">{tile.label}</p>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-subtle text-primary">
                <Icon name={tile.icon} size={18} />
              </span>
            </div>
            <p className="mt-1 text-xl leading-tight font-extrabold tracking-tight sm:text-[26px]">{tile.value}</p>
            <p className="mt-1 text-[13px] text-fg-muted">{tile.note}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function RevenueCard({ stats, commission }: { stats: AdminStats; commission: Record<Stream, number> }) {
  const total = stats.revenue.total.gross;
  return (
    <Card className="overflow-hidden">
      <div className="p-6 pb-4">
        <h2 className="text-xl font-extrabold">Revenue by stream</h2>
        <p className="text-[13px] text-fg-muted">Successful payments. Payouts are what organizers and providers receive.</p>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface" aria-hidden>
          {STREAMS.map((stream) => (
            <span key={stream} className={STREAM_COLOR[stream]} style={{ width: `${percent(stats.revenue[stream].gross, total)}%` }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg-secondary">
          {STREAMS.map((stream) => (
            <li key={stream} className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full', STREAM_COLOR[stream])} />
              {STREAM_LABEL[stream]} · {percent(stats.revenue[stream].gross, total)}%
            </li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface">
            <tr className="text-left text-xs font-bold tracking-wide text-fg-muted uppercase">
              <th className="px-4 py-3 pl-6">Stream</th>
              <th className="px-4 py-3 text-right">Payments</th>
              <th className="px-4 py-3 text-right">Gross</th>
              <th className="px-4 py-3 text-right">Commission</th>
              <th className="px-4 py-3 pr-6 text-right">Payouts</th>
            </tr>
          </thead>
          <tbody>
            {STREAMS.map((stream) => {
              const row = stats.revenue[stream];
              return (
                <tr key={stream} className="border-t border-border">
                  <td className="px-4 py-3 pl-6">
                    <p className="flex items-center gap-2 font-bold">
                      <span className={cn('size-2.5 rounded-full', STREAM_COLOR[stream])} />
                      {STREAM_LABEL[stream]}
                    </p>
                    <p className="pl-4.5 text-xs text-fg-muted">
                      {commission[stream]}% commission{row.refunded ? ` · ${formatMoney(row.refunded)} refunded` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">{formatAmount(row.payments)}</td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatMoney(row.gross)}</td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap text-primary">{formatMoney(row.commission)}</td>
                  <td className="px-4 py-3 pr-6 text-right whitespace-nowrap text-fg-secondary">{formatMoney(row.payees)}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-border bg-surface/60 font-extrabold">
              <td className="px-4 py-3 pl-6">Total</td>
              <td className="px-4 py-3 text-right">{formatAmount(STREAMS.reduce((sum, stream) => sum + stats.revenue[stream].payments, 0))}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">{formatMoney(stats.revenue.total.gross)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap text-primary">{formatMoney(stats.revenue.total.commission)}</td>
              <td className="px-4 py-3 pr-6 text-right whitespace-nowrap">
                {formatMoney(STREAMS.reduce((sum, stream) => sum + stats.revenue[stream].payees, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

type AttentionProps = {
  events: PendingEvent[];
  eventTotal: number;
  providers: PendingProvider[];
  providerTotal: number;
  now: number;
};

function AttentionCard({ events, eventTotal, providers, providerTotal, now }: AttentionProps) {
  const clear = eventTotal + providerTotal === 0;
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Needs your attention</h2>
        {!clear && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-accent px-2 text-sm font-bold text-on-accent">
            {eventTotal + providerTotal}
          </span>
        )}
      </div>
      {clear ? (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-valid-subtle p-4 text-sm font-semibold text-valid">
          <Icon name="check" size={18} /> All caught up. No events or providers are waiting.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          <section>
            <p className="text-xs font-bold tracking-wide text-fg-muted uppercase">Events awaiting approval · {eventTotal}</p>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">None waiting.</p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {events.map((event) => {
                  const wait = waitingSince(event.updatedAt, now);
                  const late = now - new Date(event.updatedAt).getTime() > DAY_MS;
                  return (
                    <li key={event.id} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
                      <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-primary-subtle">
                        {event.coverUrl && <img src={event.coverUrl} alt="" className="size-full object-cover" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{localize(event.title)}</p>
                        <p className="truncate text-xs text-fg-muted">
                          {event.organizer?.name ?? 'Unknown organizer'} · {formatShortDate(event.startAt)}
                        </p>
                      </div>
                      <span className={cn('shrink-0 text-right text-xs font-bold', late ? 'text-warning-text' : 'text-fg-secondary')}>
                        {wait}
                        <span className="block font-normal text-fg-muted">waiting</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section>
            <p className="text-xs font-bold tracking-wide text-fg-muted uppercase">Providers awaiting verification · {providerTotal}</p>
            {providers.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">None waiting.</p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {providers.map((provider) => (
                  <li key={provider.id} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-subtle font-bold text-primary">
                      {provider.businessName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{provider.businessName}</p>
                      <p className="truncate text-xs text-fg-muted">
                        {provider.city} · {provider.documents.length} document{provider.documents.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs font-bold text-fg-secondary">
                      {waitingSince(provider.updatedAt, now)}
                      <span className="block font-normal text-fg-muted">waiting</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-[13px] text-fg-muted">Approve or reject them from Approvals.</p>
        </div>
      )}
    </Card>
  );
}

function BarList({ rows, total }: { rows: { key: string; label: ReactNode; value: number; color?: string }[]; total: number }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">{row.label}</span>
            <span className="text-fg-secondary">
              <span className="font-bold text-fg">{formatAmount(row.value)}</span> · {percent(row.value, total)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
            <div className={cn('h-full rounded-full', row.color ?? 'bg-primary')} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function UsersCard({ stats }: { stats: AdminStats }) {
  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-extrabold">Users by role</h2>
        <span className="text-sm text-fg-muted">{formatAmount(stats.users.total)} in total, all time</span>
      </div>
      <BarList total={stats.users.total} rows={ROLES.map((role) => ({ key: role, label: ROLE_LABEL[role], value: stats.users[role] }))} />
    </Card>
  );
}

const STATUS_COLOR: Record<'valid' | 'warning' | 'invalid' | 'neutral', string> = {
  valid: 'bg-valid',
  warning: 'bg-warning',
  invalid: 'bg-invalid',
  neutral: 'bg-fg-muted',
};

function EventsCard({ stats }: { stats: AdminStats }) {
  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-extrabold">Events by status</h2>
        <span className="text-sm text-fg-muted">{formatAmount(stats.events.total)} in total, all time</span>
      </div>
      <BarList
        total={stats.events.total}
        rows={EVENT_STATUSES.map((status) => ({
          key: status,
          label: STATUS_META[status].label,
          value: stats.events[status],
          color: STATUS_COLOR[STATUS_META[status].tone],
        }))}
      />
    </Card>
  );
}
