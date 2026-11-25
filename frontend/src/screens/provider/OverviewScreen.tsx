'use client';

import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { initialsOf } from '@/components/shell/DashboardShell';
import {
  bookingDays,
  localizeText,
  providerApi,
  suggestedAmount,
  type Earnings,
  type ProviderBooking,
} from '@/features/provider/api';
import {
  BOOKING_TONES,
  durationSince,
  fill,
  formatBookingRange,
  formatDate,
  intlLocale,
  monthRange,
  startOfToday,
  timeAgo,
} from '@/features/provider/format';
import type { Dictionary, Locale } from '@/i18n/dictionaries';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useProvider } from './ProviderShell';

const greetingKey = (hour: number) => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

const loadMonthEarnings = () =>
  Promise.all([providerApi.earnings(monthRange(0)), providerApi.earnings(monthRange(-1))]).then(
    ([current, previous]) => ({ current, previous }),
  );

export function OverviewScreen() {
  const { user, locale, t, profile, profileLoading } = useProvider();
  const copy = t.provider.overview;
  const page = t.providerPages.overview;
  const bookings = useAsync(providerApi.bookings, []);
  const earnings = useAsync(loadMonthEarnings, []);
  const now = new Date();
  const firstName = user.name.split(' ')[0] ?? '';
  const today = formatDate(now.toISOString(), locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const canAddService = profile?.verification === 'verified';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-fg-secondary first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight">
            {copy[greetingKey(now.getHours())].replace('{name}', firstName)}
          </h1>
        </div>
        {canAddService ? (
          <Link href="/provider/services?new=1" className={buttonClass('primary', 'md')}>
            <Icon name="add" size={18} />
            {copy.addService}
          </Link>
        ) : null}
      </header>

      {profileLoading ? null : !profile ? (
        <Notice
          icon="business"
          tone="warning"
          title={copy.setupTitle}
          body={copy.setupBody}
          action={{ href: '/provider/profile', label: t.providerPages.common.goToProfile }}
        />
      ) : profile.verification === 'pending' ? (
        <Notice icon="pending" tone="accent" title={page.verificationPending} body={page.verificationPendingBody} />
      ) : profile.verification === 'rejected' ? (
        <Notice
          icon="alert"
          tone="warning"
          title={page.verificationRejected}
          body={profile.rejectionReason ?? page.verificationRejectedBody}
          action={{ href: '/provider/profile', label: t.providerPages.common.edit }}
        />
      ) : null}

      {bookings.loading && !bookings.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-[18px] bg-raised" />
          ))}
        </div>
      ) : bookings.error && !bookings.data ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-[15px] font-semibold">{t.providerPages.common.loadError}</p>
          <button type="button" onClick={bookings.reload} className={buttonClass('secondary', 'sm')}>
            {t.providerPages.common.retry}
          </button>
        </Card>
      ) : (
        <Dashboard
          t={t}
          locale={locale}
          bookings={bookings.data ?? []}
          earnings={earnings.data}
          rating={profile ? { avg: profile.ratingAvg, count: profile.ratingCount } : null}
        />
      )}
    </div>
  );
}

type DashboardProps = {
  t: Dictionary;
  locale: Locale;
  bookings: ProviderBooking[];
  earnings: { current: Earnings; previous: Earnings } | null;
  rating: { avg: number; count: number } | null;
};

function Dashboard({ t, locale, bookings, earnings, rating }: DashboardProps) {
  const page = t.providerPages.overview;
  const kpis = page.kpis;
  const monthName = (offset: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { month: 'long' }).format(monthRange(offset).from);

  const requests = bookings
    .filter((booking) => booking.status === 'requested')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const upcoming = bookings
    .filter(
      (booking) =>
        (booking.status === 'accepted' || booking.status === 'paid') &&
        new Date(booking.endDate).getTime() >= startOfToday(),
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const nextPaid = upcoming.find((booking) => booking.status === 'paid');
  const paidAhead = upcoming.filter((booking) => booking.status === 'paid').length;

  const current = earnings?.current;
  const previous = earnings?.previous;
  const change =
    current && previous && previous.net > 0 ? Math.round(((current.net - previous.net) / previous.net) * 100) : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label={fill(kpis.net, { month: monthName(0) })}
          value={current ? formatMoney(current.net) : '…'}
          hint={
            change !== null
              ? fill(kpis.netChange, { change: `${change > 0 ? '+' : ''}${change}%`, month: monthName(-1) })
              : fill(kpis.netNoPrevious, { month: monthName(-1) })
          }
          hintTone={change !== null && change >= 0 ? 'valid' : 'muted'}
        />
        <Kpi
          label={kpis.requests}
          value={String(requests.length)}
          hint={
            requests[0]
              ? fill(kpis.oldestWaiting, { time: durationSince(requests[0].createdAt, locale) })
              : kpis.noneWaiting
          }
        />
        <Kpi
          label={kpis.upcoming}
          value={String(paidAhead)}
          hint={
            nextPaid
              ? fill(nextPaid.event?.city ? kpis.next : kpis.nextNoCity, {
                  date: formatDate(nextPaid.startDate, locale, { weekday: 'short', day: 'numeric', month: 'short' }),
                  city: nextPaid.event?.city ?? '',
                })
              : kpis.noneUpcoming
          }
        />
        <Kpi
          label={kpis.rating}
          value={rating && rating.count > 0 ? rating.avg.toFixed(1) : '–'}
          hint={
            !rating || rating.count === 0
              ? kpis.noReviews
              : rating.count === 1
                ? kpis.review
                : fill(kpis.reviews, { count: rating.count })
          }
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{page.requestsTitle}</h2>
              <p className="mt-0.5 text-sm text-fg-secondary">{page.requestsSubtitle}</p>
            </div>
            <Link href="/provider/bookings" className="shrink-0 text-sm font-bold text-primary hover:underline">
              {page.allBookings}
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="px-5 py-10 text-center text-[15px] text-fg-secondary">{page.noRequests}</p>
          ) : (
            <ul className="divide-y divide-border">
              {requests.slice(0, 3).map((booking) => (
                <RequestItem key={booking.id} booking={booking} t={t} locale={locale} />
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-xl font-extrabold tracking-tight">{page.jobsTitle}</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-[15px] text-fg-secondary">{page.noJobs}</p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {upcoming.slice(0, 4).map((booking) => (
                  <JobItem key={booking.id} booking={booking} t={t} locale={locale} />
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <Link href="/provider/earnings" className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold tracking-tight first-letter:uppercase">
                {fill(page.monthTitle, { month: monthName(0) })}
              </h2>
              <Icon name="chevron" size={18} className="text-fg-secondary" />
            </Link>
            {current ? (
              <dl className="mt-3 flex flex-col gap-2 text-[15px]">
                <Row label={fill(page.paidBookings, { count: current.paidBookings })} value={formatMoney(current.gross)} />
                <Row label={page.commission} value={current.commission > 0 ? `−${formatMoney(current.commission)}` : formatMoney(0)} />
                {current.refunded > 0 ? <Row label={page.refunded} value={`−${formatMoney(current.refunded)}`} /> : null}
                <div className="mt-1 border-t border-border pt-3">
                  <Row label={page.paidToYou} value={formatMoney(current.net)} strong />
                </div>
                <p className="mt-1 text-sm text-fg-secondary">{page.payoutNote}</p>
              </dl>
            ) : (
              <div className="mt-3 h-24 animate-pulse rounded-xl bg-surface" />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? 'font-bold' : 'text-fg-secondary'}>{label}</dt>
      <dd className={strong ? 'font-extrabold' : 'font-semibold'}>{value}</dd>
    </div>
  );
}

type KpiProps = { label: string; value: string; hint: string; hintTone?: 'valid' | 'muted' };

function Kpi({ label, value, hint, hintTone = 'muted' }: KpiProps) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="text-[15px] text-fg-secondary first-letter:uppercase">{label}</p>
      <p className="text-[30px] leading-9 font-extrabold tracking-tight">{value}</p>
      <p className={hintTone === 'valid' ? 'text-sm font-semibold text-valid' : 'text-sm text-fg-secondary'}>{hint}</p>
    </Card>
  );
}

function RequestItem({ booking, t, locale }: { booking: ProviderBooking; t: Dictionary; locale: Locale }) {
  const copy = t.provider.bookings;
  const organizer = booking.organizer?.name ?? copy.unknownOrganizer;
  const days = bookingDays(booking);
  return (
    <li className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">
          {initialsOf(organizer)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{organizer}</p>
          <p className="flex items-center gap-1.5 text-sm text-fg-secondary">
            <Icon name="calendar" size={14} className="shrink-0" />
            <span className="truncate">
              {booking.event ? localizeText(booking.event.title, locale) : copy.noEvent}
              {' · '}
              {formatBookingRange(booking, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </p>
        </div>
        <span className="shrink-0 text-sm text-fg-secondary">{timeAgo(booking.createdAt, locale)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {booking.service ? localizeText(booking.service.title, locale) : copy.unknownService} × {booking.quantity}
          </p>
          {booking.service ? (
            <p className="text-sm text-fg-secondary">
              {booking.quantity} × {formatAmount(booking.service.price)} XAF
              {booking.service.unit === 'per_day' ? ` · ${days === 1 ? copy.detail.day : copy.detail.days.replace('{count}', String(days))}` : ''}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 font-extrabold">{formatMoney(suggestedAmount(booking))}</p>
      </div>
      {booking.note ? (
        <p className="border-l-2 border-border pl-3 text-[15px] text-fg-secondary">“{booking.note}”</p>
      ) : null}
      <div className="flex justify-end">
        <Link href={`/provider/bookings?booking=${booking.id}`} className={buttonClass('outline', 'sm')}>
          {t.providerPages.overview.reply}
        </Link>
      </div>
    </li>
  );
}

function JobItem({ booking, t, locale }: { booking: ProviderBooking; t: Dictionary; locale: Locale }) {
  const copy = t.provider.bookings;
  const days = bookingDays(booking);
  const start = new Date(booking.startDate);
  return (
    <li>
      <Link
        href={`/provider/bookings?booking=${booking.id}`}
        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface"
      >
        <span className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-surface py-1.5">
          <span className="text-lg leading-5 font-extrabold">{start.getDate()}</span>
          <span className="text-[11px] font-bold text-primary uppercase">
            {new Intl.DateTimeFormat(intlLocale(locale), { month: 'short' }).format(start).replace('.', '')}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {booking.event ? localizeText(booking.event.title, locale) : copy.noEvent}
          </span>
          <span className="block truncate text-sm text-fg-secondary">
            {booking.service ? localizeText(booking.service.title, locale) : copy.unknownService} × {booking.quantity}
            {' · '}
            {days === 1 ? copy.detail.day : copy.detail.days.replace('{count}', String(days))}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill tone={BOOKING_TONES[booking.status]} className="h-6 px-2.5 text-xs">
            {copy.status[booking.status]}
          </StatusPill>
          <span className="text-sm font-bold">{formatMoney(booking.amount ?? suggestedAmount(booking))}</span>
        </span>
      </Link>
    </li>
  );
}

const NOTICE_TONES = {
  warning: 'border-warning/40 bg-warning-subtle',
  accent: 'border-accent/50 bg-accent/15',
};

type NoticeProps = {
  icon: IconName;
  tone: keyof typeof NOTICE_TONES;
  title: string;
  body: string;
  action?: { href: string; label: string };
};

function Notice({ icon, tone, title, body, action }: NoticeProps) {
  return (
    <section className={`flex flex-wrap items-start gap-4 rounded-[18px] border p-5 ${NOTICE_TONES[tone]}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-raised text-fg">
        <Icon name={icon} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-[17px] font-extrabold text-fg">{title}</h2>
        <p className="text-[15px] text-fg-secondary">{body}</p>
      </div>
      {action ? (
        <Link href={action.href} className={buttonClass('primary', 'sm', 'self-center')}>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
