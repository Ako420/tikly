'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  BOOKING_STATUS_META,
  CATEGORIES,
  CATEGORY_LABEL,
  formatDayRange,
  marketplaceApi,
  serviceTitle,
  UNIT_LABEL,
  type BookingStatus,
  type ServiceCategory,
  type ServiceSummary,
} from '@/features/marketplace/api';
import { cn } from '@/lib/cn';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { BookingSheet } from './BookingSheet';
import { Card, Pager } from './parts';

type SetParams = (next: Record<string, string | undefined>, resetPage?: boolean) => void;

const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Kribi', 'Limbe', 'Buea'];

const PRICE_CAPS = [
  { value: '', label: 'Any price' },
  { value: '50000', label: 'Up to 50 000 XAF' },
  { value: '150000', label: 'Up to 150 000 XAF' },
  { value: '300000', label: 'Up to 300 000 XAF' },
  { value: '500000', label: 'Up to 500 000 XAF' },
];

const BOOKING_FILTERS: { value: '' | BookingStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'accepted', label: 'Ready to pay' },
  { value: 'paid', label: 'Paid' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
];

const isCategory = (value: string | null): value is ServiceCategory => CATEGORIES.some((item) => item.key === value);

export function MarketplaceScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get('tab') === 'bookings' ? 'bookings' : 'browse';

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
        <h1 className="text-[28px] font-extrabold tracking-tight">Marketplace</h1>
        <p className="text-sm text-fg-secondary">
          Halls, chairs, canopies, sound, catering and decoration from verified providers. Request a booking, or call them directly.
        </p>
      </header>

      <div role="tablist" aria-label="Marketplace" className="flex gap-1 border-b border-border">
        {(['browse', 'bookings'] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => router.replace(key === 'browse' ? pathname : `${pathname}?tab=bookings`, { scroll: false })}
            className={cn(
              '-mb-px border-b-2 px-3 py-3 text-[15px] font-bold',
              tab === key ? 'border-primary text-primary' : 'border-transparent text-fg-secondary hover:text-fg',
            )}
          >
            {key === 'browse' ? 'Browse services' : 'My bookings'}
          </button>
        ))}
      </div>

      {tab === 'browse' ? <Browse params={params} setParams={setParams} /> : <Bookings params={params} setParams={setParams} />}
    </div>
  );
}

function Browse({ params, setParams }: { params: URLSearchParams; setParams: SetParams }) {
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') ?? '';
  const rawCategory = params.get('category');
  const category = isCategory(rawCategory) ? rawCategory : undefined;
  const city = params.get('city') ?? '';
  const max = params.get('max') ?? '';
  const [search, setSearch] = useState(q);

  useEffect(() => {
    if (search.trim() === q) return;
    const timer = setTimeout(() => setParams({ q: search.trim() || undefined }), 350);
    return () => clearTimeout(timer);
  }, [search, q, setParams]);

  const services = useAsync(
    () => marketplaceApi.services({ page, q: q || undefined, category, city: city || undefined, maxPrice: max ? Number(max) : undefined }),
    [page, q, category, city, max],
  );
  const filtered = Boolean(q || category || city || max);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-border bg-raised px-4 text-fg-muted">
          <Icon name="search" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search services, like canopy or sound system"
            aria-label="Search services"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <select
            value={city}
            onChange={(event) => setParams({ city: event.target.value || undefined })}
            aria-label="City"
            className="h-12 rounded-2xl border border-border bg-raised px-4 text-[15px] font-semibold lg:w-44"
          >
            <option value="">All cities</option>
            {CITIES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            value={max}
            onChange={(event) => setParams({ max: event.target.value || undefined })}
            aria-label="Price"
            className="h-12 rounded-2xl border border-border bg-raised px-4 text-[15px] font-semibold lg:w-52"
          >
            {PRICE_CAPS.map((cap) => (
              <option key={cap.value} value={cap.value}>
                {cap.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={!category} onClick={() => setParams({ category: undefined })}>
          All
        </Chip>
        {CATEGORIES.map((item) => (
          <Chip key={item.key} selected={category === item.key} onClick={() => setParams({ category: item.key })}>
            <Icon name={item.icon} size={18} />
            {item.label}
          </Chip>
        ))}
      </div>

      {services.error ? (
        <Card className="p-8 text-center">
          <p className="text-fg-secondary">We could not load services.</p>
          <button onClick={services.reload} className="mt-3 font-bold text-primary hover:underline">
            Try again
          </button>
        </Card>
      ) : !services.data ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="h-80 animate-pulse rounded-[18px] bg-raised" />
          ))}
        </div>
      ) : services.data.items.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <p className="text-xl font-bold">{filtered ? 'No services match' : 'No services listed yet'}</p>
          <p className="mt-2 text-fg-muted">
            {filtered ? 'Try another category, city or price.' : 'Verified providers will appear here as they list services.'}
          </p>
        </Card>
      ) : (
        <div className={cn('flex flex-col gap-5 transition-opacity', services.loading && 'opacity-60')}>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {services.data.items.map((service) => (
              <li key={service.id}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
          {services.data.meta.pages > 1 && (
            <Card className="overflow-hidden">
              <Pager meta={services.data.meta} onPage={(next) => setParams({ page: next > 1 ? String(next) : undefined }, false)} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
        selected ? 'border-primary bg-primary text-white' : 'border-border bg-raised text-fg hover:border-primary',
      )}
    >
      {children}
    </button>
  );
}

function ServiceCard({ service }: { service: ServiceSummary }) {
  const href = `/organizer/marketplace/services/${service.id}`;
  const icon = CATEGORIES.find((item) => item.key === service.category)?.icon ?? 'other';
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-primary-subtle">
        {service.photos[0] ? (
          <img src={service.photos[0]} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-primary">
            <Icon name={icon} size={40} />
          </span>
        )}
        {service.photos.length > 1 && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-raised px-2.5 py-1 text-xs font-semibold">
            <Icon name="image" size={14} /> {service.photos.length} photos
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-bold tracking-wide text-primary uppercase">{CATEGORY_LABEL[service.category]}</p>
        <Link href={href} className="text-[17px] leading-snug font-extrabold group-hover:text-primary">
          {serviceTitle(service.title)}
        </Link>
        <p>
          <span className="text-xl font-extrabold">{formatMoney(service.price)}</span>{' '}
          <span className="text-sm text-fg-secondary">{UNIT_LABEL[service.unit]}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-[13px] text-fg-secondary">
          <span className="min-w-0 truncate">
            <span className="font-semibold text-fg">{service.provider.businessName}</span> · {service.city}
          </span>
          {service.provider.ratingCount > 0 ? (
            <span className="shrink-0 font-semibold text-fg">
              <span className="text-accent">★</span> {service.provider.ratingAvg.toFixed(1)}{' '}
              <span className="text-fg-muted">({service.provider.ratingCount})</span>
            </span>
          ) : (
            <span className="shrink-0 text-fg-muted">No reviews yet</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function Bookings({ params, setParams }: { params: URLSearchParams; setParams: SetParams }) {
  const page = Math.max(1, Number(params.get('page')) || 1);
  const rawStatus = params.get('status') ?? '';
  const status = BOOKING_FILTERS.some((item) => item.value === rawStatus) ? (rawStatus as '' | BookingStatus) : '';
  const open = params.get('booking');

  const bookings = useAsync(() => marketplaceApi.bookings({ page, status: status || undefined }), [page, status]);
  const close = useCallback(() => setParams({ booking: undefined }, false), [setParams]);

  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {BOOKING_FILTERS.map((filter) => (
          <Chip key={filter.value} selected={status === filter.value} onClick={() => setParams({ status: filter.value || undefined })}>
            {filter.label}
          </Chip>
        ))}
      </div>

      <Card className="overflow-hidden">
        {bookings.error ? (
          <div className="p-8 text-center">
            <p className="text-fg-secondary">We could not load your bookings.</p>
            <button onClick={bookings.reload} className="mt-3 font-bold text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : !bookings.data ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-16 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : bookings.data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-lg font-bold">{status ? 'No bookings with this status' : 'No bookings yet'}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {status ? 'Try another filter.' : 'Find a service in the marketplace and request a booking for your dates.'}
            </p>
            {!status && (
              <Link href="/organizer/marketplace" className="mt-4 inline-block font-bold text-primary hover:underline">
                Browse services
              </Link>
            )}
          </div>
        ) : (
          <div className={cn('transition-opacity', bookings.loading && 'opacity-60')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface">
                  <tr>
                    {['Service & provider', 'Event', 'Dates', 'Price', 'Status'].map((label, index) => (
                      <th
                        key={label}
                        className={cn(
                          'px-4 py-3 text-left text-xs font-bold tracking-wide text-fg-muted uppercase first:pl-6 last:pr-6',
                          index === 3 && 'text-right',
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.data.items.map((booking) => {
                    const meta = BOOKING_STATUS_META[booking.status];
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => setParams({ booking: booking.id }, false)}
                        className={cn('cursor-pointer border-t border-border hover:bg-surface', open === booking.id && 'bg-primary-subtle/50')}
                      >
                        <td className="max-w-72 px-4 py-3 pl-6">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setParams({ booking: booking.id }, false);
                            }}
                            className="block max-w-full truncate text-left font-bold hover:text-primary"
                          >
                            {booking.service ? serviceTitle(booking.service.title) : 'Removed service'}
                            <span className="font-semibold text-fg-secondary"> × {formatAmount(booking.quantity)}</span>
                          </button>
                          <p className="truncate text-[13px] text-fg-muted">{booking.provider?.businessName}</p>
                        </td>
                        <td className="max-w-56 truncate px-4 py-3 text-fg-secondary">
                          {booking.event ? serviceTitle(booking.event.title) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDayRange(booking.startDate, booking.endDate)}</td>
                        <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                          {booking.amount !== null ? formatMoney(booking.amount) : <span className="font-normal text-fg-muted">Awaiting quote</span>}
                        </td>
                        <td className="px-4 py-3 pr-6">
                          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager meta={bookings.data.meta} onPage={(next) => setParams({ page: next > 1 ? String(next) : undefined }, false)} />
          </div>
        )}
      </Card>

      {open && <BookingSheet key={open} bookingId={open} onClose={close} onChanged={bookings.reload} />}
    </div>
  );
}
