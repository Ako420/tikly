'use client';

import Link from 'next/link';
import { useCallback, useId, useState, type FormEvent, type ReactNode } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormAlert';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  formatShortDate,
  localize,
  organizerApi,
  staffApi,
  type OrganizerEvent,
  type StaffMember,
} from '@/features/organizer/api';
import { ApiError } from '@/lib/http/errors';
import { cn } from '@/lib/cn';
import { useAsync } from '@/lib/useAsync';
import { Card, LoadError } from './parts';

const ASSIGNABLE: OrganizerEvent['status'][] = ['draft', 'pending', 'published'];
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MIN_PASSWORD = 8;

type Dialog =
  | { kind: 'create' }
  | { kind: 'rename'; member: StaffMember }
  | { kind: 'password'; member: StaffMember }
  | { kind: 'disable'; member: StaffMember }
  | { kind: 'credentials'; name: string; phone: string; password: string; isNew: boolean; warning?: string };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const generatePassword = () => {
  const values = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(values, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join('');
};

const displayPhone = (phone: string) => phone.replace(/^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '+237 $1$2 $3 $4 $5');

const apiMessage = (caught: unknown, fallback: string) => {
  if (!(caught instanceof ApiError)) return fallback;
  if (caught.code === 'NETWORK_ERROR') return 'We could not reach tikly. Check your connection.';
  return caught.message || fallback;
};

export function StaffScreen() {
  const { data, error, loading, reload } = useAsync(async () => {
    const [staff, events] = await Promise.all([staffApi.list(), organizerApi.events()]);
    const now = Date.now();
    const assignable = events
      .filter((event) => ASSIGNABLE.includes(event.status) && new Date(event.endAt).getTime() > now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    return { staff, events: assignable, now };
  }, []);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = useCallback(() => setDialog(null), []);

  const active = data?.staff.filter((member) => member.status === 'active') ?? [];
  const inactive = data?.staff.filter((member) => member.status !== 'active') ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Gate staff</h1>
          <p className="max-w-2xl text-sm text-fg-secondary">
            Staff sign in to the tikly mobile app with the phone number and password you set here. They only see the events you
            assign them, and scan tickets at the gate.
          </p>
        </div>
        <button onClick={() => setDialog({ kind: 'create' })} className={buttonClass('primary', 'md', 'shrink-0')}>
          <Icon name="add" size={18} /> Add staff
        </button>
      </header>

      {loading && !data ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-36 animate-pulse rounded-[18px] bg-raised" />
          ))}
        </div>
      ) : error || !data ? (
        <LoadError what="your gate staff" onRetry={reload} />
      ) : data.staff.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <Icon name="staff" size={32} className="mx-auto text-primary" />
          <p className="mt-3 text-xl font-bold">No gate staff yet</p>
          <p className="mx-auto mt-2 max-w-md text-fg-muted">
            Add the people who will scan tickets at your events. You choose their phone number and password, and share them with
            them.
          </p>
          <button onClick={() => setDialog({ kind: 'create' })} className={buttonClass('primary', 'sm', 'mt-5')}>
            <Icon name="add" size={16} /> Add your first staff member
          </button>
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {active.map((member) => (
              <li key={member.id}>
                <StaffCard member={member} events={data.events} now={data.now} onDialog={setDialog} onChanged={reload} />
              </li>
            ))}
          </ul>
          {inactive.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-fg-muted uppercase">Disabled</h2>
              <ul className="flex flex-col gap-4">
                {inactive.map((member) => (
                  <li key={member.id}>
                    <StaffCard member={member} events={data.events} now={data.now} onDialog={setDialog} onChanged={reload} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {dialog?.kind === 'create' && data && (
        <CreateDialog
          events={data.events}
          onClose={close}
          onCreated={(credentials) => {
            reload();
            setDialog({ kind: 'credentials', ...credentials, isNew: true });
          }}
        />
      )}
      {dialog?.kind === 'rename' && (
        <RenameDialog
          member={dialog.member}
          onClose={close}
          onDone={() => {
            reload();
            close();
          }}
        />
      )}
      {dialog?.kind === 'password' && (
        <PasswordDialog
          member={dialog.member}
          onClose={close}
          onDone={(password) => {
            reload();
            setDialog({ kind: 'credentials', name: dialog.member.name, phone: dialog.member.phone, password, isNew: false });
          }}
        />
      )}
      {dialog?.kind === 'disable' && (
        <DisableDialog
          member={dialog.member}
          onClose={close}
          onDone={() => {
            reload();
            close();
          }}
        />
      )}
      {dialog?.kind === 'credentials' && <CredentialsDialog {...dialog} onClose={close} />}
    </div>
  );
}

type CardProps = {
  member: StaffMember;
  events: OrganizerEvent[];
  now: number;
  onDialog: (dialog: Dialog) => void;
  onChanged: () => void;
};

function StaffCard({ member, events, now, onDialog, onChanged }: CardProps) {
  const selectId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isActive = member.status === 'active';
  const assignedIds = new Set(member.events.map((event) => event.id));
  const options = events.filter((event) => !assignedIds.has(event.id));

  const run = async (key: string, action: () => Promise<unknown>, fallback: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await action();
      onChanged();
    } catch (caught) {
      setMessage(apiMessage(caught, fallback));
    } finally {
      setBusy(null);
    }
  };

  const enable = () => run('enable', () => staffApi.update(member.id, { status: 'active' }), 'We could not enable this account.');

  return (
    <Card className={cn('p-5', !isActive && 'opacity-75')}>
      <div className="flex flex-wrap items-center gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full font-bold',
            isActive ? 'bg-primary text-white' : 'bg-surface text-fg-muted',
          )}
        >
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[17px] font-extrabold">{member.name}</span>
            <StatusPill tone={isActive ? 'valid' : 'neutral'} className="h-6 px-2.5 text-xs">
              {isActive ? 'Active' : member.status === 'suspended' ? 'Suspended' : 'Disabled'}
            </StatusPill>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-fg-secondary">
            <Icon name="phone" size={14} /> {displayPhone(member.phone)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <>
              <button onClick={() => onDialog({ kind: 'rename', member })} className={buttonClass('secondary', 'sm')}>
                <Icon name="edit" size={16} /> Rename
              </button>
              <button onClick={() => onDialog({ kind: 'password', member })} className={buttonClass('secondary', 'sm')}>
                Reset password
              </button>
              <button
                onClick={() => onDialog({ kind: 'disable', member })}
                className={buttonClass('secondary', 'sm', 'text-invalid hover:border-invalid')}
              >
                Disable
              </button>
            </>
          ) : (
            <button onClick={enable} disabled={busy !== null} className={buttonClass('outline', 'sm')}>
              {busy === 'enable' ? 'Enabling…' : 'Enable again'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-bold tracking-wide text-fg-muted uppercase">Scans at</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {member.events.length === 0 && <p className="text-sm text-fg-muted">No events assigned yet.</p>}
          {member.events.map((event) => {
            const past = new Date(event.endAt).getTime() < now;
            return (
              <span
                key={event.id}
                className={cn(
                  'inline-flex h-9 max-w-full items-center gap-2 rounded-full border pr-1 pl-3 text-sm',
                  past ? 'border-border text-fg-muted' : 'border-primary/30 bg-primary-subtle text-primary',
                )}
              >
                <Link href={`/organizer/events/${event.id}`} className="truncate font-semibold hover:underline">
                  {localize(event.title)}
                </Link>
                <span className="shrink-0 text-xs opacity-80">{formatShortDate(event.startAt)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${member.name} from ${localize(event.title)}`}
                  disabled={busy !== null}
                  onClick={() =>
                    run(`remove-${event.id}`, () => staffApi.unassign(event.id, member.id), 'We could not remove this event.')
                  }
                  className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-raised"
                >
                  <Icon name="close" size={14} />
                </button>
              </span>
            );
          })}
          {isActive && options.length > 0 && (
            <>
              <label htmlFor={selectId} className="sr-only">
                Assign {member.name} to an event
              </label>
              <select
                id={selectId}
                value=""
                disabled={busy !== null}
                onChange={(change) => {
                  const eventId = change.target.value;
                  if (eventId) run(`assign-${eventId}`, () => staffApi.assign(eventId, member.id), 'We could not assign this event.');
                }}
                className="h-9 w-48 rounded-full border border-dashed border-primary bg-raised px-3 text-sm font-semibold text-primary"
              >
                <option value="">{busy?.startsWith('assign') ? 'Assigning…' : '+ Assign to event'}</option>
                {options.map((event) => (
                  <option key={event.id} value={event.id}>
                    {localize(event.title)} · {formatShortDate(event.startAt)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {message && (
          <p role="alert" className="mt-2 text-sm text-invalid">
            {message}
          </p>
        )}
      </div>
    </Card>
  );
}

const fieldBox = (error?: string) =>
  cn(
    'flex h-12 items-center gap-2 rounded-2xl border bg-raised px-4 focus-within:border-2 focus-within:border-primary',
    error ? 'border-2 border-invalid' : 'border-border',
  );

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-fg-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-invalid">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PasswordInput({ id, value, onChange, error }: { id: string; value: string; onChange: (value: string) => void; error?: string }) {
  const [shown, setShown] = useState(true);
  return (
    <div className="flex gap-2">
      <div className={cn(fieldBox(error), 'flex-1')}>
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-base outline-none"
        />
        <button
          type="button"
          onClick={() => setShown((current) => !current)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="text-sm font-semibold text-fg-muted hover:text-fg"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      <button type="button" onClick={() => onChange(generatePassword())} className={buttonClass('secondary', 'md', 'shrink-0 px-4')}>
        Generate
      </button>
    </div>
  );
}

type Credentials = { name: string; phone: string; password: string; warning?: string };

function CreateDialog({
  events,
  onClose,
  onCreated,
}: {
  events: OrganizerEvent[];
  onClose: () => void;
  onCreated: (credentials: Credentials) => void;
}) {
  const ids = { name: useId(), phone: useId(), password: useId() };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(events[0] ? [events[0].id] : []));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    const digits = phone.replace(/\D/g, '').replace(/^237/, '');
    const next: Record<string, string | undefined> = {};
    if (name.trim().length < 2) next.name = 'Enter their full name.';
    if (!/^6\d{8}$/.test(digits)) next.phone = 'Enter a 9-digit Cameroon mobile number, like 6XX XX XX XX.';
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    setFormError(undefined);
    let created: StaffMember;
    try {
      created = await staffApi.create({ name: name.trim(), phone: `+237${digits}`, password });
    } catch (caught) {
      setBusy(false);
      if (caught instanceof ApiError && caught.code === 'PHONE_TAKEN') {
        setErrors({ phone: 'This number already has a tikly account. Use another number.' });
      } else if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length) {
        const fields = caught.fieldErrors;
        setErrors({ name: fields.name, phone: fields.phone, password: fields.password });
      } else {
        setFormError(apiMessage(caught, 'We could not add this staff member. Try again.'));
      }
      return;
    }

    const results = await Promise.allSettled([...picked].map((eventId) => staffApi.assign(eventId, created.id)));
    const failed = results.some((result) => result.status === 'rejected');
    onCreated({
      name: created.name,
      phone: created.phone,
      password,
      warning: failed ? 'Some events could not be assigned. Assign them from the staff list.' : undefined,
    });
  };

  return (
    <Modal title="Add gate staff" onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <FormAlert message={formError} />
          <Field id={ids.name} label="Full name" error={errors.name}>
            <div className={fieldBox(errors.name)}>
              <input
                id={ids.name}
                data-autofocus
                autoComplete="off"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Brice Tchoupo"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${ids.name}-error` : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-muted"
              />
            </div>
          </Field>
          <Field id={ids.phone} label="Phone number" error={errors.phone} hint="They sign in with this number.">
            <div className={fieldBox(errors.phone)}>
              <span className="font-semibold text-fg-muted">+237</span>
              <input
                id={ids.phone}
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="6XX XX XX XX"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? `${ids.phone}-error` : `${ids.phone}-hint`}
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-muted"
              />
            </div>
          </Field>
          <Field
            id={ids.password}
            label="Password"
            error={errors.password}
            hint={`At least ${MIN_PASSWORD} characters. You will see it once more after saving, to share it.`}
          >
            <PasswordInput id={ids.password} value={password} onChange={setPassword} error={errors.password} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-fg-secondary">Scans at</legend>
            {events.length === 0 ? (
              <p className="text-sm text-fg-muted">You have no upcoming events. You can assign events later.</p>
            ) : (
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-2xl border border-border p-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface">
                      <input
                        type="checkbox"
                        checked={picked.has(event.id)}
                        onChange={() => toggle(event.id)}
                        className="size-5 accent-primary"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{localize(event.title)}</span>
                      <span className="shrink-0 text-xs text-fg-muted">{formatShortDate(event.startAt)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </div>
        <footer className="flex justify-end gap-2 border-t border-border p-5">
          <button type="button" onClick={onClose} className={buttonClass('secondary', 'md')}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={buttonClass('primary', 'md')}>
            {busy ? 'Adding…' : 'Add staff'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function RenameDialog({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: () => void }) {
  const id = useId();
  const [name, setName] = useState(member.name);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter their full name.');
      return;
    }
    setBusy(true);
    try {
      await staffApi.update(member.id, { name: name.trim() });
      onDone();
    } catch (caught) {
      setError(apiMessage(caught, 'We could not rename this staff member.'));
      setBusy(false);
    }
  };

  return (
    <Modal title="Rename staff" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="p-5">
          <Field id={id} label="Full name" error={error}>
            <div className={fieldBox(error)}>
              <input
                id={id}
                data-autofocus
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
              />
            </div>
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t border-border p-5">
          <button type="button" onClick={onClose} className={buttonClass('secondary', 'md')}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={buttonClass('primary', 'md')}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function PasswordDialog({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: (password: string) => void }) {
  const id = useId();
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    try {
      await staffApi.update(member.id, { password });
      onDone(password);
    } catch (caught) {
      setError(apiMessage(caught, 'We could not change the password.'));
      setBusy(false);
    }
  };

  return (
    <Modal title={`Reset password for ${member.name}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="flex flex-col gap-3 p-5">
          <p className="text-sm text-fg-secondary">They are signed out of the app and must sign in again with the new password.</p>
          <Field id={id} label="New password" error={error} hint={`At least ${MIN_PASSWORD} characters.`}>
            <PasswordInput id={id} value={password} onChange={setPassword} error={error} />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t border-border p-5">
          <button type="button" onClick={onClose} className={buttonClass('secondary', 'md')}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={buttonClass('primary', 'md')}>
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function DisableDialog({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const disable = async () => {
    setBusy(true);
    try {
      await staffApi.update(member.id, { status: 'disabled' });
      onDone();
    } catch (caught) {
      setError(apiMessage(caught, 'We could not disable this account.'));
      setBusy(false);
    }
  };

  return (
    <Modal title={`Disable ${member.name}?`} onClose={onClose}>
      <div className="flex flex-col gap-3 p-5 text-sm text-fg-secondary">
        <p>They are signed out of the app straight away and cannot sign in or scan tickets. Their past check-ins are kept.</p>
        <p>You can enable the account again later.</p>
        {error && (
          <p role="alert" className="text-invalid">
            {error}
          </p>
        )}
      </div>
      <footer className="flex justify-end gap-2 border-t border-border p-5">
        <button type="button" data-autofocus onClick={onClose} className={buttonClass('secondary', 'md')}>
          Keep active
        </button>
        <button type="button" onClick={disable} disabled={busy} className={buttonClass('danger', 'md')}>
          {busy ? 'Disabling…' : 'Disable'}
        </button>
      </footer>
    </Modal>
  );
}

function CredentialsDialog({ name, phone, password, isNew, warning, onClose }: Credentials & { isNew: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `tikly gate staff sign-in\nName: ${name}\nPhone: ${displayPhone(phone)}\nPassword: ${password}\n\nOpen the tikly app and sign in with this phone number and password.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal title={isNew ? 'Staff added' : 'Password changed'} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <p className="flex gap-2 rounded-2xl bg-valid-subtle p-3 text-sm text-valid">
          <Icon name="check" size={18} className="shrink-0" />
          Share these sign-in details with {name}. This is the only time the password is shown.
        </p>
        {warning && <p className="rounded-2xl bg-warning-subtle p-3 text-sm text-warning-text">{warning}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-2xl border border-border p-4">
          <dt className="text-sm text-fg-secondary">Phone</dt>
          <dd className="text-right font-bold">{displayPhone(phone)}</dd>
          <dt className="text-sm text-fg-secondary">Password</dt>
          <dd className="text-right font-mono text-lg font-bold tracking-wide">{password}</dd>
        </dl>
        <p className="text-[13px] text-fg-muted">They open the tikly app, sign in with these details, and land in scanner mode.</p>
      </div>
      <footer className="flex justify-end gap-2 border-t border-border p-5">
        <button type="button" onClick={copy} className={buttonClass('secondary', 'md')} aria-live="polite">
          {copied ? (
            <>
              <Icon name="check" size={18} /> Copied
            </>
          ) : (
            'Copy details'
          )}
        </button>
        <button type="button" data-autofocus onClick={onClose} className={buttonClass('primary', 'md')}>
          Done
        </button>
      </footer>
    </Modal>
  );
}
