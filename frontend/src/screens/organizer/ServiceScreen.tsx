'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormAlert';
import { Icon } from '@/components/ui/Icon';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  daysBetween,
  estimate,
  marketplaceApi,
  serviceTitle,
  UNIT_LABEL,
  whatsappLink,
  type ServiceDetail,
} from '@/features/marketplace/api';
import { localize, organizerApi, type OrganizerEvent } from '@/features/organizer/api';
import { ApiError } from '@/lib/http/errors';
import { cn } from '@/lib/cn';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { Card, LoadError } from './parts';

const BOOKABLE: OrganizerEvent['status'][] = ['draft', 'pending', 'published'];

const isoDay = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const tomorrow = () => isoDay(new Date(Date.now() + 86_400_000));

export function ServiceScreen({ serviceId }: { serviceId: string }) {
  const { data, error, loading, reload } = useAsync(
    async () => {
      const [service, events] = await Promise.all([
        marketplaceApi.service(serviceId),
        organizerApi.events().catch(() => [] as OrganizerEvent[]),
      ]);
      const upcoming = events
        .filter((event) => BOOKABLE.includes(event.status) && new Date(event.startAt).getTime() > Date.now())
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
      return { service, events: upcoming };
    },
    [serviceId],
  );

  if (loading && !data) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="h-[28rem] animate-pulse rounded-[18px] bg-raised" />
        <div className="h-[28rem] animate-pulse rounded-[18px] bg-raised" />
      </div>
    );
  }
  if (error || !data) return <LoadError what="this service" onRetry={reload} />;

  const { service, events } = data;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/organizer/marketplace" className="flex items-center gap-1 text-sm font-semibold text-fg-secondary hover:text-fg">
        <Icon name="back" size={16} /> Marketplace
      </Link>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Gallery service={service} />
          <Card className="p-6">
            <p className="text-xs font-bold tracking-wide text-primary uppercase">{CATEGORY_LABEL[service.category]}</p>
            <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-tight">{serviceTitle(service.title)}</h1>
            <p className="mt-2">
              <span className="text-2xl font-extrabold">{formatMoney(service.price)}</span>{' '}
              <span className="text-fg-secondary">{UNIT_LABEL[service.unit]}</span>
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-fg-secondary">
              <Icon name="location" size={16} /> {service.city}
            </p>
            {service.description && <p className="mt-5 leading-relaxed whitespace-pre-line text-fg-secondary">{service.description}</p>}
          </Card>
          <ProviderCard service={service} />
        </div>
        <BookingForm service={service} events={events} />
      </div>
    </div>
  );
}

function Gallery({ service }: { service: ServiceDetail }) {
  const [index, setIndex] = useState(0);
  const icon = CATEGORIES.find((item) => item.key === service.category)?.icon ?? 'other';
  if (service.photos.length === 0) {
    return (
      <div className="grid aspect-[16/9] place-items-center rounded-[18px] bg-primary-subtle text-primary">
        <Icon name={icon} size={56} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-primary-subtle">
        <img src={service.photos[index]} alt={`${serviceTitle(service.title)}, photo ${index + 1}`} className="absolute inset-0 size-full object-cover" />
      </div>
      {service.photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {service.photos.map((photo, position) => (
            <button
              key={photo}
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Show photo ${position + 1}`}
              aria-pressed={index === position}
              className={cn(
                'h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2',
                index === position ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={photo} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({ service }: { service: ServiceDetail }) {
  const { provider } = service;
  return (
    <Card className="p-6">
      <p className="text-xs font-bold tracking-wide text-fg-muted uppercase">Provided by</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-white">
          {provider.businessName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-extrabold">
            {provider.businessName}
            <span className="rounded-full bg-valid-subtle px-2 py-0.5 text-[11px] font-bold text-valid">Verified</span>
          </p>
          <p className="text-sm text-fg-secondary">
            {[provider.city, provider.country].filter(Boolean).join(', ')}
            {provider.ratingCount > 0
              ? ` · ★ ${provider.ratingAvg.toFixed(1)} (${provider.ratingCount} review${provider.ratingCount === 1 ? '' : 's'})`
              : ' · No reviews yet'}
          </p>
        </div>
      </div>
      {provider.description && <p className="mt-4 text-sm leading-relaxed text-fg-secondary">{provider.description}</p>}
      {(provider.phone || provider.whatsapp) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {provider.phone && (
            <a href={`tel:${provider.phone}`} className={buttonClass('secondary', 'sm')}>
              <Icon name="phone" size={16} /> {provider.phone}
            </a>
          )}
          {provider.whatsapp && (
            <a href={whatsappLink(provider.whatsapp)} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>
              <Icon name="whatsapp" size={16} /> WhatsApp
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

function BookingForm({ service, events }: { service: ServiceDetail; events: OrganizerEvent[] }) {
  const router = useRouter();
  const ids = { event: useId(), start: useId(), end: useId(), quantity: useId(), note: useId() };
  const first = events[0];
  const [eventId, setEventId] = useState(first?.id ?? '');
  const [start, setStart] = useState(first ? isoDay(new Date(first.startAt)) : tomorrow());
  const [end, setEnd] = useState(first ? isoDay(new Date(first.endAt)) : tomorrow());
  const [quantity, setQuantity] = useState(service.unit === 'per_event' ? '1' : '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const pickEvent = (id: string) => {
    setEventId(id);
    const event = events.find((item) => item.id === id);
    if (event) {
      setStart(isoDay(new Date(event.startAt)));
      setEnd(isoDay(new Date(event.endAt)));
    }
  };

  const count = Number(quantity) || 0;
  const days = start && end && end >= start ? daysBetween(`${start}T12:00:00`, `${end}T12:00:00`) : 1;
  const total = estimate(service.price, service.unit, count || 1, days);

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    const next: Record<string, string> = {};
    if (!start || start < tomorrow()) next.start = 'Pick a date from tomorrow on.';
    if (!end || end < start) next.end = 'The end date must be on or after the start date.';
    if (!Number.isInteger(count) || count < 1) next.quantity = 'Enter how many you need.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setFormError(undefined);
    try {
      const booking = await marketplaceApi.book({
        serviceId: service.id,
        eventId: eventId || undefined,
        startDate: new Date(`${start}T08:00:00`).toISOString(),
        endDate: new Date(`${end}T23:00:00`).toISOString(),
        quantity: count,
        note: note.trim() || undefined,
      });
      router.push(`/organizer/marketplace?tab=bookings&booking=${booking.id}`);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length) {
        const fields = caught.fieldErrors;
        setErrors({ start: fields.startDate, end: fields.endDate, quantity: fields.quantity });
        setFormError(fields.serviceId ?? fields.eventId ?? fields.note);
      } else {
        setFormError(caught instanceof ApiError ? caught.message : 'We could not send your request. Try again.');
      }
      setBusy(false);
    }
  };

  const field = 'h-12 w-full rounded-2xl border bg-raised px-4 text-[15px] outline-none focus:border-2 focus:border-primary';

  return (
    <Card className="p-6 xl:sticky xl:top-24">
      <h2 className="text-xl font-extrabold">Request a booking</h2>
      <p className="mt-1 text-sm text-fg-secondary">
        The provider confirms availability and sets the final price. You only pay once they accept.
      </p>
      <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
        <FormAlert message={formError} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.event} className="text-sm font-semibold text-fg-secondary">
            For which event
          </label>
          <select id={ids.event} value={eventId} onChange={(event) => pickEvent(event.target.value)} className={cn(field, 'border-border font-semibold')}>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {localize(event.title)}
              </option>
            ))}
            <option value="">Not for a specific event</option>
          </select>
          {eventId && <p className="text-[13px] text-fg-muted">Once paid, the cost goes into this event’s budget.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DateField id={ids.start} label="From" value={start} min={tomorrow()} error={errors.start} onChange={setStart} className={field} />
          <DateField id={ids.end} label="To" value={end} min={start || tomorrow()} error={errors.end} onChange={setEnd} className={field} />
        </div>
        {service.unit !== 'per_event' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.quantity} className="text-sm font-semibold text-fg-secondary">
              {service.unit === 'per_day' ? 'How many' : 'Quantity'}
            </label>
            <input
              id={ids.quantity}
              inputMode="numeric"
              value={quantity}
              placeholder="e.g. 200"
              onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ''))}
              aria-invalid={errors.quantity ? true : undefined}
              aria-describedby={errors.quantity ? `${ids.quantity}-error` : undefined}
              className={cn(field, errors.quantity ? 'border-invalid' : 'border-border')}
            />
            {errors.quantity && (
              <p id={`${ids.quantity}-error`} className="text-[13px] text-invalid">
                {errors.quantity}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.note} className="text-sm font-semibold text-fg-secondary">
            Message to the provider <span className="font-normal text-fg-muted">(optional)</span>
          </label>
          <textarea
            id={ids.note}
            value={note}
            maxLength={1000}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Delivery address, setup time, anything they should know"
            className="w-full resize-y rounded-2xl border border-border bg-raised px-4 py-3 text-[15px] outline-none focus:border-2 focus:border-primary"
          />
        </div>

        <div className="rounded-2xl bg-surface p-4 text-sm">
          <div className="flex justify-between text-fg-secondary">
            <span>
              {formatMoney(service.price)} {UNIT_LABEL[service.unit]}
              {service.unit !== 'per_event' && ` × ${formatAmount(count || 1)}`}
              {service.unit === 'per_day' && ` × ${days} day${days === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-semibold">Estimate</span>
            <span className="text-xl font-extrabold">{formatMoney(total)}</span>
          </div>
        </div>

        <button type="submit" disabled={busy} className={buttonClass('primary', 'md', 'w-full')}>
          {busy ? 'Sending…' : 'Send booking request'}
        </button>
      </form>
    </Card>
  );
}

type DateFieldProps = {
  id: string;
  label: string;
  value: string;
  min: string;
  error?: string;
  onChange: (value: string) => void;
  className: string;
};

function DateField({ id, label, value, min, error, onChange, className }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-fg-secondary">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(className, error ? 'border-invalid' : 'border-border')}
      />
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-invalid">
          {error}
        </p>
      )}
    </div>
  );
}
