'use client';

import { useEffect, useMemo, useState } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormAlert } from '@/components/ui/FormAlert';
import { Icon } from '@/components/ui/Icon';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { initialsOf } from '@/components/shell/DashboardShell';
import {
  bookingDays,
  localizeText,
  MIN_BOOKING_AMOUNT,
  providerApi,
  suggestedAmount,
  type BookingStatus,
  type ProviderBooking,
} from '@/features/provider/api';
import type { Dictionary, Locale } from '@/i18n/dictionaries';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/http/errors';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useProvider } from './ProviderShell';

type Tab = 'upcoming' | 'requests' | 'completed' | 'declined' | 'cancelled';
const TABS: Tab[] = ['upcoming', 'requests', 'completed', 'declined', 'cancelled'];

const STATUS_TONES: Record<BookingStatus, PillTone> = {
  requested: 'primary',
  accepted: 'warning',
  paid: 'valid',
  completed: 'neutral',
  declined: 'neutral',
  cancelled: 'neutral',
};

const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

function inTab(booking: ProviderBooking, tab: Tab) {
  switch (tab) {
    case 'upcoming':
      return (
        booking.status === 'paid' ||
        ((booking.status === 'requested' || booking.status === 'accepted') &&
          new Date(booking.endDate).getTime() >= startOfToday())
      );
    case 'requests':
      return booking.status === 'requested';
    default:
      return booking.status === tab;
  }
}

const byStart = (direction: 1 | -1) => (a: ProviderBooking, b: ProviderBooking) =>
  direction * (new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

const intlLocale = (locale: Locale) => (locale === 'fr' ? 'fr-FR' : 'en-GB');

const formatRange = (booking: ProviderBooking, locale: Locale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlLocale(locale), options).formatRange(new Date(booking.startDate), new Date(booking.endDate));

function timeAgo(iso: string, locale: Locale) {
  const format = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, 'hour');
  return format.format(Math.round(hours / 24), 'day');
}

export function BookingsScreen() {
  const { t, locale, reloadPending } = useProvider();
  const copy = t.provider.bookings;
  const { data, error, loading, reload } = useAsync(providerApi.bookings, []);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const bookings = data ?? [];
    return Object.fromEntries(
      TABS.map((key) => [
        key,
        bookings.filter((booking) => inTab(booking, key)).sort(byStart(key === 'upcoming' || key === 'requests' ? 1 : -1)),
      ]),
    ) as Record<Tab, ProviderBooking[]>;
  }, [data]);

  const rows = groups[tab];
  const selected = data?.find((booking) => booking.id === selectedId) ?? null;

  const refresh = () => {
    reload();
    reloadPending();
  };

  return (
    <div className="flex gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header>
          <h1 className="text-[28px] font-extrabold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-[15px] text-fg-secondary">{copy.subtitle}</p>
        </header>

        <div role="tablist" aria-label={copy.title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((key) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'h-10 shrink-0 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap transition-colors',
                tab === key ? 'border-primary bg-primary text-white' : 'border-border bg-raised text-fg hover:bg-surface',
              )}
            >
              {copy.tabs[key]}
              {data ? ` · ${groups[key].length}` : ''}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-16 animate-pulse rounded-2xl bg-raised" />
            ))}
          </div>
        ) : error && !data ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-[15px] font-semibold">{copy.loadError}</p>
            <button type="button" onClick={reload} className={buttonClass('secondary', 'sm')}>
              {copy.retry}
            </button>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary-subtle text-primary">
              <Icon name="bookings" size={26} />
            </span>
            <p className="max-w-sm text-[15px] text-fg-secondary">{copy.empty[tab]}</p>
          </Card>
        ) : (
          <BookingList rows={rows} selectedId={selectedId} onSelect={setSelectedId} t={t} locale={locale} />
        )}
      </div>

      {selected ? (
        <BookingPanel
          key={selected.id}
          booking={selected}
          t={t}
          locale={locale}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}

type ListProps = {
  rows: ProviderBooking[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  t: Dictionary;
  locale: Locale;
};

function BookingList({ rows, selectedId, onSelect, t, locale }: ListProps) {
  const copy = t.provider.bookings;
  const cells = (booking: ProviderBooking) => ({
    organizer: booking.organizer?.name ?? copy.unknownOrganizer,
    event: booking.event ? localizeText(booking.event.title, locale) : copy.noEvent,
    service: booking.service
      ? `${localizeText(booking.service.title, locale)} × ${booking.quantity}`
      : copy.unknownService,
    amount: formatMoney(booking.amount ?? suggestedAmount(booking)),
    dates: formatRange(booking, locale, { day: 'numeric', month: 'short' }),
    status: <StatusPill tone={STATUS_TONES[booking.status]}>{copy.status[booking.status]}</StatusPill>,
  });

  return (
    <Card className="overflow-hidden">
      <table className="hidden w-full text-left md:table">
        <thead>
          <tr className="border-b border-border text-xs font-bold tracking-wider text-fg-secondary uppercase">
            <th className="px-5 py-3">{copy.columns.organizer}</th>
            <th className="px-5 py-3">{copy.columns.service}</th>
            <th className="px-5 py-3">{copy.columns.dates}</th>
            <th className="px-5 py-3">{copy.columns.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((booking) => {
            const cell = cells(booking);
            const active = booking.id === selectedId;
            return (
              <tr
                key={booking.id}
                onClick={() => onSelect(booking.id)}
                className={cn(
                  'cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface',
                  active && 'bg-surface shadow-[inset_3px_0_0_var(--color-primary)]',
                )}
              >
                <td className="px-5 py-3.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(booking.id);
                    }}
                    aria-current={active ? 'true' : undefined}
                    className="text-left"
                  >
                    <span className="block text-[15px] font-bold">{cell.organizer}</span>
                    <span className="block text-sm text-fg-secondary">{cell.event}</span>
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <span className="block text-[15px] font-semibold">{cell.service}</span>
                  <span className="block text-sm text-fg-secondary">{cell.amount}</span>
                </td>
                <td className="px-5 py-3.5 text-[15px] whitespace-nowrap">{cell.dates}</td>
                <td className="px-5 py-3.5">{cell.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-border md:hidden">
        {rows.map((booking) => {
          const cell = cells(booking);
          return (
            <li key={booking.id}>
              <button
                type="button"
                onClick={() => onSelect(booking.id)}
                className={cn('flex w-full flex-col gap-2 p-4 text-left', booking.id === selectedId && 'bg-surface')}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold">{cell.organizer}</span>
                    <span className="block truncate text-sm text-fg-secondary">{cell.event}</span>
                  </span>
                  {cell.status}
                </span>
                <span className="flex justify-between gap-3 text-sm">
                  <span className="truncate font-semibold">{cell.service}</span>
                  <span className="shrink-0 text-fg-secondary">{cell.dates}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

type PanelProps = {
  booking: ProviderBooking;
  t: Dictionary;
  locale: Locale;
  onClose: () => void;
  onChanged: () => void;
};

function BookingPanel({ booking, t, locale, onClose, onChanged }: PanelProps) {
  const copy = t.provider.bookings;
  const detail = copy.detail;
  const suggested = suggestedAmount(booking);
  const [amount, setAmount] = useState(String(booking.amount ?? suggested));
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const organizer = booking.organizer?.name ?? copy.unknownOrganizer;
  const days = bookingDays(booking);
  const price = Number(amount);
  const priceValid = Number.isInteger(price) && price >= MIN_BOOKING_AMOUNT;
  const payable = booking.amount ?? (priceValid ? price : suggested);
  const isRequest = booking.status === 'requested';

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const accept = () => {
    if (!priceValid) {
      setError(detail.amountInvalid);
      return;
    }
    void run(() => providerApi.acceptBooking(booking.id, price));
  };

  const fill = (template: string) =>
    template.replace('{organizer}', organizer).replace('{amount}', formatMoney(payable));

  return (
    <>
      <button
        type="button"
        aria-label={detail.close}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-media/40 xl:hidden"
      />
      <aside
        aria-label={isRequest ? detail.title : detail.titleBooking}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-raised shadow-xl xl:sticky xl:top-25 xl:z-auto xl:h-[calc(100dvh-8.25rem)] xl:w-[400px] xl:shrink-0 xl:rounded-[18px] xl:border xl:shadow-none"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-lg font-extrabold">{isRequest ? detail.title : detail.titleBooking}</h2>
          <StatusPill tone={STATUS_TONES[booking.status]} className="h-6 px-2.5 text-xs">
            {copy.status[booking.status]}
          </StatusPill>
          <button
            type="button"
            onClick={onClose}
            aria-label={detail.close}
            className="ml-auto grid size-9 place-items-center rounded-full border border-border hover:bg-surface"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">
              {initialsOf(organizer)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{organizer}</p>
              <p className="text-sm text-fg-secondary">
                {detail.received.replace('{time}', timeAgo(booking.createdAt, locale))}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-lg font-extrabold">
              {booking.event ? localizeText(booking.event.title, locale) : copy.noEvent}
            </p>
            <p className="flex items-center gap-2 text-[15px]">
              <Icon name="calendar" size={18} className="shrink-0 text-fg-secondary" />
              {formatRange(booking, locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {days === 1 ? detail.day : detail.days.replace('{count}', String(days))}
            </p>
            {booking.event?.city ? (
              <p className="flex items-center gap-2 text-[15px]">
                <Icon name="location" size={18} className="shrink-0 text-fg-secondary" />
                {booking.event.city}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-primary">
                <Icon name="marketplace" size={20} />
              </span>
              <div className="min-w-0">
                <p className="font-bold">
                  {booking.service ? localizeText(booking.service.title, locale) : copy.unknownService}
                </p>
                {booking.service ? (
                  <p className="text-sm text-fg-secondary">
                    {detail.quantity.replace('{count}', String(booking.quantity))}
                    {' · '}
                    {detail.perUnit[booking.service.unit].replace('{price}', formatMoney(booking.service.price))}
                  </p>
                ) : null}
              </div>
            </div>

            {isRequest ? (
              <label className="flex flex-col gap-1.5 border-t border-border pt-3">
                <span className="text-sm font-semibold text-fg-secondary">{detail.price}</span>
                <span className="flex h-12 items-center gap-2 rounded-xl border border-border bg-raised px-3 focus-within:border-primary">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_BOOKING_AMOUNT}
                    step={500}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    aria-invalid={!priceValid}
                    className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none"
                  />
                  <span className="text-sm font-semibold text-fg-secondary">XAF</span>
                </span>
                <span className="text-xs text-fg-secondary">
                  {detail.priceHint.replace('{amount}', formatMoney(suggested))}
                </span>
              </label>
            ) : null}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-bold">{detail.organizerPays}</span>
              <span className="font-extrabold">{formatAmount(payable)} XAF</span>
            </div>
            <p className="text-xs text-fg-secondary">{detail.commissionNote}</p>
          </div>

          {booking.note ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-fg-secondary">{detail.message}</p>
              <p className="rounded-2xl bg-surface p-4 text-[15px]">{booking.note}</p>
            </div>
          ) : null}

          {booking.declineReason ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-fg-secondary">{detail.declinedBecause}</p>
              <p className="rounded-2xl bg-surface p-4 text-[15px]">{booking.declineReason}</p>
            </div>
          ) : null}

          {isRequest && declining ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-fg-secondary">{detail.declineReason}</span>
              <textarea
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder={detail.declineReasonPlaceholder}
                className="rounded-2xl border border-border bg-raised p-3 text-[15px] outline-none focus:border-primary"
              />
            </label>
          ) : null}
        </div>

        <PanelFooter
          booking={booking}
          t={t}
          busy={busy}
          error={error}
          declining={declining}
          note={
            isRequest
              ? declining
                ? undefined
                : fill(detail.acceptNote)
              : booking.status === 'accepted'
                ? fill(detail.awaitingPayment)
                : booking.status === 'paid'
                  ? isPast(booking.endDate)
                    ? detail.completeNote
                    : detail.paidNote
                  : undefined
          }
          onAccept={accept}
          onStartDecline={() => setDeclining(true)}
          onCancelDecline={() => setDeclining(false)}
          onDecline={() => void run(() => providerApi.declineBooking(booking.id, reason.trim() || undefined))}
          onComplete={() => void run(() => providerApi.completeBooking(booking.id))}
        />
      </aside>
    </>
  );
}

type FooterProps = {
  booking: ProviderBooking;
  t: Dictionary;
  busy: boolean;
  error?: string;
  declining: boolean;
  note?: string;
  onAccept: () => void;
  onStartDecline: () => void;
  onCancelDecline: () => void;
  onDecline: () => void;
  onComplete: () => void;
};

function PanelFooter({
  booking,
  t,
  busy,
  error,
  declining,
  note,
  onAccept,
  onStartDecline,
  onCancelDecline,
  onDecline,
  onComplete,
}: FooterProps) {
  const detail = t.provider.bookings.detail;
  const canComplete = booking.status === 'paid' && isPast(booking.endDate);
  if (!note && !error && booking.status !== 'requested' && !canComplete) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
      <FormAlert message={error} />
      {note ? <p className="text-sm text-fg-secondary">{note}</p> : null}

      {booking.status === 'requested' ? (
        declining ? (
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={onCancelDecline} className={buttonClass('secondary', 'md', 'flex-1')}>
              {detail.keep}
            </button>
            <button type="button" disabled={busy} onClick={onDecline} className={buttonClass('danger', 'md', 'flex-1')}>
              {busy ? detail.working : detail.confirmDecline}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={onStartDecline} className={buttonClass('secondary', 'md')}>
              {detail.decline}
            </button>
            <button type="button" disabled={busy} onClick={onAccept} className={buttonClass('primary', 'md', 'flex-1')}>
              <Icon name="check" size={18} />
              {busy ? detail.working : detail.accept}
            </button>
          </div>
        )
      ) : canComplete ? (
        <button type="button" disabled={busy} onClick={onComplete} className={buttonClass('primary', 'md')}>
          <Icon name="check" size={18} />
          {busy ? detail.working : detail.complete}
        </button>
      ) : null}
    </div>
  );
}
