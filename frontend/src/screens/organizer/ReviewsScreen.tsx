'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useId, useState, type FormEvent } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDayRange, marketplaceApi, serviceTitle, type Booking } from '@/features/marketplace/api';
import { formatShortDate, localize, reviewApi, type ReviewSummary } from '@/features/organizer/api';
import { ApiError } from '@/lib/http/errors';
import { cn } from '@/lib/cn';
import { formatAmount } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { Card, LoadError, Pager } from './parts';

type SetParams = (next: Record<string, string | undefined>, resetPage?: boolean) => void;

const STARS = [5, 4, 3, 2, 1] as const;
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function ReviewsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get('tab') === 'providers' ? 'providers' : 'events';

  const setParams: SetParams = useCallback(
    (next, resetPage = true) => {
      const merged = new URLSearchParams(params);
      if (resetPage) merged.delete('page');
      for (const [key, value] of Object.entries(next)) {
        if (value) merged.set(key, value);
        else merged.delete(key);
      }
      const query = merged.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-extrabold tracking-tight">Reviews</h1>
        <p className="text-sm text-fg-secondary">
          What attendees say about your events, and your ratings of the providers you booked.
        </p>
      </header>

      <div role="tablist" aria-label="Reviews" className="flex gap-1 border-b border-border">
        {(['events', 'providers'] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => router.replace(key === 'events' ? pathname : `${pathname}?tab=providers`, { scroll: false })}
            className={cn(
              '-mb-px border-b-2 px-3 py-3 text-[15px] font-bold',
              tab === key ? 'border-primary text-primary' : 'border-transparent text-fg-secondary hover:text-fg',
            )}
          >
            {key === 'events' ? 'About your events' : 'Rate providers'}
          </button>
        ))}
      </div>

      {tab === 'events' ? <EventReviews params={params} setParams={setParams} /> : <ProviderRatings />}
    </div>
  );
}

function Stars({ value, size = 18, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex text-accent', className)} aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} viewBox="0 0 24 24" width={size} height={size} aria-hidden className={star <= Math.round(value) ? '' : 'text-border'}>
          <path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

function EventReviews({ params, setParams }: { params: URLSearchParams; setParams: SetParams }) {
  const page = Math.max(1, Number(params.get('page')) || 1);
  const eventId = params.get('event') ?? '';
  const rawRating = Number(params.get('rating'));
  const rating = rawRating >= 1 && rawRating <= 5 ? rawRating : undefined;

  const summary = useAsync(reviewApi.summary, []);
  const list = useAsync(
    () => reviewApi.list({ page, eventId: eventId || undefined, rating }),
    [page, eventId, rating],
  );

  if (summary.error) return <LoadError what="your reviews" onRetry={summary.reload} />;
  if (!summary.data) {
    return (
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="h-80 animate-pulse rounded-[18px] bg-raised" />
        <div className="h-96 animate-pulse rounded-[18px] bg-raised" />
      </div>
    );
  }

  if (summary.data.count === 0) {
    return (
      <Card className="border-dashed p-12 text-center">
        <Icon name="reviews" size={32} className="mx-auto text-primary" />
        <p className="mt-3 text-xl font-bold">No reviews yet</p>
        <p className="mx-auto mt-2 max-w-md text-fg-muted">
          Attendees whose ticket was scanned at the gate can rate an event once it has ended. Their reviews will appear here.
        </p>
      </Card>
    );
  }

  const filtered = Boolean(eventId || rating);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SummaryPanel summary={summary.data} eventId={eventId} rating={rating} setParams={setParams} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-6">
          <h2 className="mr-auto text-[17px] font-extrabold">
            {filtered ? 'Filtered reviews' : 'All reviews'}
            {list.data && <span className="ml-2 text-sm font-semibold text-fg-muted">{formatAmount(list.data.meta.total)}</span>}
          </h2>
          <select
            value={eventId}
            onChange={(change) => setParams({ event: change.target.value || undefined })}
            aria-label="Event"
            className="h-10 max-w-full rounded-xl border border-border bg-raised px-3 text-sm font-semibold sm:max-w-64"
          >
            <option value="">All events</option>
            {summary.data.events.map((event) => (
              <option key={event.id} value={event.id}>
                {localize(event.title)}
              </option>
            ))}
          </select>
          {filtered && (
            <button onClick={() => setParams({ event: undefined, rating: undefined })} className="text-sm font-bold text-primary hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {list.error ? (
          <div className="p-8 text-center">
            <p className="text-fg-secondary">We could not load reviews.</p>
            <button onClick={list.reload} className="mt-3 font-bold text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : !list.data ? (
          <div className="flex flex-col gap-3 p-4 sm:px-6">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : list.data.items.length === 0 ? (
          <p className="px-6 py-14 text-center text-fg-muted">No reviews match these filters.</p>
        ) : (
          <div className={cn('transition-opacity', list.loading && 'opacity-60')}>
            <ul>
              {list.data.items.map((review) => (
                <li key={review.id} className="border-b border-border px-4 py-5 last:border-b-0 sm:px-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={review.rating} />
                    <span className="text-sm font-bold">{RATING_WORDS[review.rating]}</span>
                    <span className="ml-auto text-[13px] text-fg-muted">{formatShortDate(review.createdAt)}</span>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 leading-relaxed whitespace-pre-line">{review.comment}</p>
                  ) : (
                    <p className="mt-2 text-sm text-fg-muted italic">No comment, rating only.</p>
                  )}
                  <p className="mt-2 text-[13px] text-fg-secondary">
                    <span className="font-semibold text-fg">{review.author}</span>
                    {review.event && (
                      <>
                        {' · '}
                        <Link href={`/organizer/events/${review.event.id}`} className="hover:text-primary hover:underline">
                          {localize(review.event.title)}
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            {list.data.meta.pages > 1 && (
              <Pager meta={list.data.meta} onPage={(next) => setParams({ page: next > 1 ? String(next) : undefined }, false)} />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

type SummaryProps = { summary: ReviewSummary; eventId: string; rating?: number; setParams: SetParams };

function SummaryPanel({ summary, eventId, rating, setParams }: SummaryProps) {
  const max = Math.max(...Object.values(summary.distribution), 1);
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <p className="text-sm font-semibold text-fg-secondary">Average rating</p>
        <div className="mt-1 flex items-end gap-3">
          <span className="text-5xl leading-none font-extrabold tracking-tight">{summary.average.toFixed(1)}</span>
          <div className="pb-1">
            <Stars value={summary.average} size={20} />
            <p className="text-[13px] text-fg-muted">
              {formatAmount(summary.count)} review{summary.count === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <ul className="mt-5 flex flex-col gap-1">
          {STARS.map((star) => {
            const count = summary.distribution[String(star) as keyof ReviewSummary['distribution']];
            const selected = rating === star;
            return (
              <li key={star}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={count === 0}
                  onClick={() => setParams({ rating: selected ? undefined : String(star) })}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50',
                    selected ? 'bg-primary-subtle' : 'enabled:hover:bg-surface',
                  )}
                >
                  <span className="w-10 shrink-0 text-left font-semibold">
                    {star} <span className="text-accent">★</span>
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(count / max) * 100}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right text-fg-muted">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="text-[17px] font-extrabold">By event</h2>
        <ul className="mt-3 flex flex-col gap-1">
          {summary.events.map((event) => {
            const selected = eventId === event.id;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setParams({ event: selected ? undefined : event.id })}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                    selected ? 'bg-primary-subtle' : 'hover:bg-surface',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm font-bold', selected && 'text-primary')}>{localize(event.title)}</span>
                    <span className="text-xs text-fg-muted">{formatShortDate(event.startAt)}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="font-extrabold">
                      <span className="text-accent">★</span> {event.ratingAvg.toFixed(1)}
                    </span>
                    <span className="block text-xs text-fg-muted">{event.ratingCount}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function ProviderRatings() {
  const { data, error, reload } = useAsync(() => marketplaceApi.bookings({ page: 1, status: 'completed' }), []);

  if (error) return <LoadError what="your completed bookings" onRetry={reload} />;
  if (!data) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((key) => (
          <div key={key} className="h-56 animate-pulse rounded-[18px] bg-raised" />
        ))}
      </div>
    );
  }
  if (data.items.length === 0) {
    return (
      <Card className="border-dashed p-12 text-center">
        <Icon name="marketplace" size={32} className="mx-auto text-primary" />
        <p className="mt-3 text-xl font-bold">Nothing to rate yet</p>
        <p className="mx-auto mt-2 max-w-md text-fg-muted">
          Once a provider marks a booking as done, you can rate them here. Your rating helps other organizers choose.
        </p>
        <Link href="/organizer/marketplace?tab=bookings" className={buttonClass('outline', 'sm', 'mt-5')}>
          See my bookings
        </Link>
      </Card>
    );
  }

  const toRate = data.items.filter((booking) => !booking.review);
  const rated = data.items.filter((booking) => booking.review);
  return (
    <div className="flex flex-col gap-8">
      {toRate.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-fg-muted uppercase">Waiting for your rating · {toRate.length}</h2>
          <ul className="grid gap-5 lg:grid-cols-2">
            {toRate.map((booking) => (
              <li key={booking.id}>
                <RateCard booking={booking} onRated={reload} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {rated.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-fg-muted uppercase">Rated</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {rated.map((booking) => (
              <li key={booking.id}>
                <Card className="flex items-center gap-4 p-4">
                  <BookingHeading booking={booking} />
                  <span className="shrink-0 text-right">
                    <Stars value={booking.review!.rating} size={16} />
                    <span className="block text-xs text-fg-muted">Your rating</span>
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BookingHeading({ booking }: { booking: Booking }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-primary-subtle">
        {booking.service?.photo && <img src={booking.service.photo} alt="" className="size-full object-cover" />}
      </span>
      <div className="min-w-0">
        <p className="truncate font-extrabold">{booking.provider?.businessName ?? 'Provider'}</p>
        <p className="truncate text-[13px] text-fg-secondary">
          {booking.service ? serviceTitle(booking.service.title) : 'Service'} · {formatDayRange(booking.startDate, booking.endDate)}
        </p>
      </div>
    </div>
  );
}

function RateCard({ booking, onRated }: { booking: Booking; onRated: () => void }) {
  const ids = { stars: useId(), comment: useId() };
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (!rating) {
      setError('Choose a rating from 1 to 5 stars.');
      return;
    }
    if (!booking.provider) return;
    setBusy(true);
    setError(undefined);
    try {
      await reviewApi.rateProvider(booking.provider.id, { bookingId: booking.id, rating, comment: comment.trim() || undefined });
      onRated();
    } catch (caught) {
      setBusy(false);
      if (caught instanceof ApiError && caught.code === 'REVIEW_EXISTS') onRated();
      else setError(caught instanceof ApiError ? caught.message : 'We could not save your rating. Try again.');
    }
  };

  return (
    <Card className="h-full p-5">
      <BookingHeading booking={booking} />
      <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
        <fieldset aria-describedby={error ? `${ids.stars}-error` : undefined}>
          <legend className="text-sm font-semibold text-fg-secondary">How was {booking.provider?.businessName ?? 'the provider'}?</legend>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <label key={star} className="cursor-pointer p-0.5">
                  <input
                    type="radio"
                    name={`${ids.stars}-rating`}
                    value={star}
                    checked={rating === star}
                    onChange={() => {
                      setRating(star);
                      setError(undefined);
                    }}
                    className="peer sr-only"
                  />
                  <span className="sr-only">
                    {star} star{star === 1 ? '' : 's'}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width={30}
                    height={30}
                    aria-hidden
                    className={cn(
                      'rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-primary',
                      star <= rating ? 'text-accent' : 'text-border hover:text-accent/60',
                    )}
                  >
                    <path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
                  </svg>
                </label>
              ))}
            </div>
            <span className="text-sm font-bold" aria-live="polite">
              {RATING_WORDS[rating]}
            </span>
          </div>
          {error && (
            <p id={`${ids.stars}-error`} className="mt-1 text-[13px] text-invalid">
              {error}
            </p>
          )}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.comment} className="text-sm font-semibold text-fg-secondary">
            Comment <span className="font-normal text-fg-muted">(optional, shown on their profile)</span>
          </label>
          <textarea
            id={ids.comment}
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(change) => setComment(change.target.value)}
            placeholder="Punctual? Good equipment? Would you book them again?"
            className="w-full resize-y rounded-2xl border border-border bg-raised px-4 py-3 text-[15px] outline-none focus:border-2 focus:border-primary"
          />
        </div>
        <button type="submit" disabled={busy} className={buttonClass('primary', 'md', 'self-start')}>
          {busy ? 'Saving…' : 'Submit rating'}
        </button>
      </form>
    </Card>
  );
}
