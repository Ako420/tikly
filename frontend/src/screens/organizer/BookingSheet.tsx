'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  BOOKING_STATUS_META,
  CATEGORY_LABEL,
  daysBetween,
  formatDayRange,
  marketplaceApi,
  serviceTitle,
  UNIT_LABEL,
  whatsappLink,
  type Booking,
  type PaymentOrder,
} from '@/features/marketplace/api';
import { ApiError } from '@/lib/http/errors';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';

const POLL_MS = 3000;
const POLL_LIMIT = 60;

type Props = { bookingId: string; onClose: () => void; onChanged: () => void };

export function BookingSheet({ bookingId, onClose, onChanged }: Props) {
  const { data: booking, error, reload } = useAsync(() => marketplaceApi.booking(bookingId), [bookingId]);

  const refresh = useCallback(() => {
    reload();
    onChanged();
  }, [reload, onChanged]);

  return (
    <Modal
      variant="sheet"
      title="Booking"
      onClose={onClose}
      badge={booking && <StatusPill tone={BOOKING_STATUS_META[booking.status].tone}>{BOOKING_STATUS_META[booking.status].label}</StatusPill>}
    >
      {error ? (
        <div className="p-6 text-center">
          <p className="text-fg-secondary">{error instanceof ApiError ? error.message : 'We could not load this booking.'}</p>
          <button onClick={reload} className="mt-3 font-bold text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : !booking ? (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : (
        <BookingBody booking={booking} onChanged={refresh} />
      )}
    </Modal>
  );
}

function BookingBody({ booking, onChanged }: { booking: Booking; onChanged: () => void }) {
  const service = booking.service;
  const days = daysBetween(booking.startDate, booking.endDate);
  const paymentPending = booking.payment?.status === 'pending';
  const canCancel = (booking.status === 'requested' || booking.status === 'accepted') && !paymentPending;

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <section className="flex gap-3">
          <span className="size-16 shrink-0 overflow-hidden rounded-2xl bg-primary-subtle">
            {service?.photo && <img src={service.photo} alt="" className="size-full object-cover" />}
          </span>
          <div className="min-w-0">
            {service && (
              <p className="text-xs font-bold tracking-wide text-primary uppercase">{CATEGORY_LABEL[service.category]}</p>
            )}
            <p className="font-extrabold">{service ? serviceTitle(service.title) : 'Service no longer listed'}</p>
            {service && (
              <p className="text-[13px] text-fg-secondary">
                Listed at {formatMoney(service.price)} {UNIT_LABEL[service.unit]}
              </p>
            )}
            {service && (
              <Link href={`/organizer/marketplace/services/${service.id}`} className="text-[13px] font-bold text-primary hover:underline">
                View service
              </Link>
            )}
          </div>
        </section>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 rounded-2xl bg-surface p-4 text-sm">
          <dt className="text-fg-secondary">Dates</dt>
          <dd className="text-right font-semibold">
            {formatDayRange(booking.startDate, booking.endDate)} · {days} day{days === 1 ? '' : 's'}
          </dd>
          <dt className="text-fg-secondary">Quantity</dt>
          <dd className="text-right font-semibold">{formatAmount(booking.quantity)}</dd>
          <dt className="text-fg-secondary">For event</dt>
          <dd className="truncate text-right font-semibold">{booking.event ? serviceTitle(booking.event.title) : 'Not linked'}</dd>
          <dt className="text-fg-secondary">Price</dt>
          <dd className="text-right font-extrabold">
            {booking.amount !== null ? formatMoney(booking.amount) : <span className="font-semibold text-fg-muted">Set by the provider</span>}
          </dd>
        </dl>

        {booking.note && (
          <section>
            <h2 className="text-sm font-bold text-fg-secondary">Your message</h2>
            <p className="mt-1.5 rounded-2xl border border-border p-3 text-sm whitespace-pre-line">{booking.note}</p>
          </section>
        )}

        {booking.status === 'declined' && (
          <p className="rounded-2xl bg-invalid-subtle p-3 text-sm">
            <span className="font-bold text-invalid">Declined by the provider.</span>{' '}
            {booking.declineReason ?? 'No reason given.'}
          </p>
        )}
        {booking.status === 'requested' && (
          <p className="rounded-2xl bg-primary-subtle p-3 text-sm text-primary">
            Waiting for the provider. They confirm availability and set the final price, then you pay here.
          </p>
        )}
        {booking.status === 'paid' && (
          <p className="flex gap-2 rounded-2xl bg-valid-subtle p-3 text-sm text-valid">
            <Icon name="check" size={18} className="shrink-0" />
            Paid. {booking.event ? 'The cost was added to your event budget.' : 'The provider has been told.'}
          </p>
        )}

        {booking.provider && (
          <section className="rounded-2xl border border-border p-4">
            <p className="text-xs font-bold tracking-wide text-fg-muted uppercase">Provider</p>
            <p className="mt-1 font-extrabold">{booking.provider.businessName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${booking.provider.phone}`} className={buttonClass('secondary', 'sm')}>
                <Icon name="phone" size={16} /> {booking.provider.phone}
              </a>
              {booking.provider.whatsapp && (
                <a href={whatsappLink(booking.provider.whatsapp)} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>
                  <Icon name="whatsapp" size={16} /> WhatsApp
                </a>
              )}
            </div>
          </section>
        )}
      </div>

      {(booking.status === 'accepted' || paymentPending || canCancel) && (
        <footer className="flex flex-col gap-3 border-t border-border p-5">
          {(booking.status === 'accepted' || paymentPending) && booking.amount !== null && (
            <PayForm booking={booking} onChanged={onChanged} />
          )}
          {canCancel && <CancelButton bookingId={booking.id} onChanged={onChanged} />}
        </footer>
      )}
    </>
  );
}

function PayForm({ booking, onChanged }: { booking: Booking; onChanged: () => void }) {
  const phoneId = useId();
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [orderId, setOrderId] = useState<string | null>(booking.payment?.status === 'pending' ? booking.payment.orderId : null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let tries = 0;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const next = await marketplaceApi.order(orderId);
        if (stopped) return;
        setOrder(next);
        if (next.status !== 'pending') {
          setOrderId(null);
          if (next.status === 'paid') onChanged();
          else setMessage(next.status === 'failed' ? 'The payment was declined. You can try again.' : 'The payment request expired. You can try again.');
          return;
        }
      } catch {
        if (stopped) return;
      }
      tries += 1;
      if (tries < POLL_LIMIT) timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId, onChanged]);

  const pay = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!/^6\d{8}$/.test(digits)) {
      setMessage('Enter a 9-digit Mobile Money or Orange Money number, like 6XX XX XX XX.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const created = await marketplaceApi.pay(booking.id, digits, crypto.randomUUID());
      setOrder(created);
      if (created.status !== 'paid') setOrderId(created.id);
      onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'BOOKING_PAYMENT_PENDING') {
        const pendingId = (caught.details as { orderId?: string } | null)?.orderId;
        if (pendingId) {
          setOrderId(pendingId);
          onChanged();
        } else setMessage(caught.message);
      } else {
        setMessage(caught instanceof ApiError ? caught.message : 'We could not start the payment. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!orderId) return;
    setBusy(true);
    try {
      const next = await marketplaceApi.verify(orderId);
      setOrder(next);
      if (next.status === 'paid') {
        setOrderId(null);
        onChanged();
      } else if (next.status === 'pending') {
        setMessage('Not confirmed yet. Approve the prompt on your phone, then try again.');
      }
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : 'We could not check the payment.');
    } finally {
      setBusy(false);
    }
  };

  if (orderId) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-2xl bg-warning-subtle p-3 text-sm text-warning-text">
          <span className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p>
            {order?.payment?.message ?? 'Confirm the payment on your phone.'} We check every few seconds and update this booking when it
            clears.
          </p>
        </div>
        <button onClick={confirm} disabled={busy} className={buttonClass('outline', 'md', 'w-full')}>
          I have paid
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-fg-secondary">Amount due</p>
        <p className="text-xl font-extrabold">{formatMoney(booking.amount ?? 0)}</p>
      </div>
      <label htmlFor={phoneId} className="text-sm font-semibold text-fg-secondary">
        Pay with MTN MoMo or Orange Money
      </label>
      <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-raised px-4 focus-within:border-2 focus-within:border-primary">
        <span className="font-semibold text-fg-muted">+237</span>
        <input
          id={phoneId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="6XX XX XX XX"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-muted"
        />
      </div>
      {message && (
        <p role="alert" className="text-sm text-invalid">
          {message}
        </p>
      )}
      <button onClick={pay} disabled={busy} className={buttonClass('primary', 'md', 'w-full')}>
        {busy ? 'Sending the prompt…' : `Pay ${formatMoney(booking.amount ?? 0)}`}
      </button>
    </div>
  );
}

function CancelButton({ bookingId, onChanged }: { bookingId: string; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    try {
      await marketplaceApi.cancel(bookingId);
      onChanged();
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : 'We could not cancel this booking.');
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="h-10 text-sm font-bold text-invalid hover:underline">
        Cancel booking
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-invalid/40 p-3">
      <p className="text-sm font-semibold">Cancel this booking? The provider is told right away.</p>
      {message && <p className="text-sm text-invalid">{message}</p>}
      <div className="flex justify-end gap-2">
        <button autoFocus onClick={() => setConfirming(false)} disabled={busy} className={buttonClass('secondary', 'sm')}>
          Keep it
        </button>
        <button onClick={cancel} disabled={busy} className={buttonClass('danger', 'sm')}>
          {busy ? 'Cancelling…' : 'Yes, cancel'}
        </button>
      </div>
    </div>
  );
}
