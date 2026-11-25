'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { ActionButton } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormAlert';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import {
  eventDraftApi,
  formatShortDate,
  formatTime,
  type Category,
  type CreateEventInput,
  type TierName,
} from '@/features/organizer/api';
import { ApiError } from '@/lib/http/errors';
import { cn } from '@/lib/cn';
import { formatAmount, formatMoney } from '@/lib/money';
import { Card } from './parts';

const STEPS = [
  { title: 'Basics', body: 'Title, description, cover' },
  { title: 'Date & venue', body: 'When and where' },
  { title: 'Tickets', body: 'Up to 3 tiers' },
  { title: 'Review & submit', body: 'Send for approval' },
];

const TIER_LABEL: Record<TierName, string> = { standard: 'Standard', vip: 'VIP', vvip: 'VVIP' };
const TIER_ORDER: TierName[] = ['standard', 'vip', 'vvip'];
const COMMISSION = 0.1;
const COUNTRIES = ['Cameroon', 'Gabon', 'Congo', 'Chad', 'Central African Republic', 'Equatorial Guinea'];

type TierDraft = { name: TierName; price: string; quantity: string; salesEndAt: string };

type Draft = {
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  category: string;
  coverUrl: string;
  coverName: string;
  startAt: string;
  endAt: string;
  venue: string;
  city: string;
  country: string;
  tiers: TierDraft[];
};

const EMPTY: Draft = {
  titleEn: '',
  titleFr: '',
  descriptionEn: '',
  descriptionFr: '',
  category: '',
  coverUrl: '',
  coverName: '',
  startAt: '',
  endAt: '',
  venue: '',
  city: '',
  country: 'Cameroon',
  tiers: [{ name: 'standard', price: '', quantity: '', salesEndAt: '' }],
};

const toInt = (value: string) => Number(value.replace(/\D/g, '') || 0);
const iso = (local: string) => (local ? new Date(local).toISOString() : '');

function validate(step: number, draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (!draft.titleEn.trim() && !draft.titleFr.trim()) errors.titleEn = 'Add a title in English or French.';
    if (!draft.descriptionEn.trim() && !draft.descriptionFr.trim()) errors.description = 'Add a description.';
    if (!draft.category) errors.category = 'Pick a category.';
  }
  if (step === 1) {
    if (!draft.startAt) errors.startAt = 'Pick a start date and time.';
    else if (new Date(draft.startAt) <= new Date()) errors.startAt = 'The start must be in the future.';
    if (!draft.endAt) errors.endAt = 'Pick an end date and time.';
    else if (draft.startAt && new Date(draft.endAt) <= new Date(draft.startAt)) errors.endAt = 'The end must be after the start.';
    if (!draft.venue.trim()) errors.venue = 'Add the venue.';
    if (!draft.city.trim()) errors.city = 'Add the city.';
  }
  if (step === 2) {
    if (draft.tiers.length === 0) errors.tiers = 'Add at least one ticket tier.';
    draft.tiers.forEach((tier, index) => {
      const price = toInt(tier.price);
      if (price !== 0 && price < 100) errors[`tier${index}.price`] = 'Free (0) or at least 100 XAF.';
      if (toInt(tier.quantity) < 1) errors[`tier${index}.quantity`] = 'At least 1 ticket.';
      if (!tier.salesEndAt) errors[`tier${index}.salesEndAt`] = 'Pick when sales end.';
      else if (new Date(tier.salesEndAt) <= new Date()) errors[`tier${index}.salesEndAt`] = 'Must be in the future.';
      else if (draft.endAt && new Date(tier.salesEndAt) > new Date(draft.endAt))
        errors[`tier${index}.salesEndAt`] = 'Sales must end before the event ends.';
    });
  }
  return errors;
}

export function CreateEventScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    eventDraftApi.categories().then(setCategories, () => setCategories([]));
  }, []);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const categoryLabel = categories.find((category) => category.key === draft.category)?.en ?? '';

  const goTo = (next: number) => {
    if (next > step) {
      for (let index = step; index < next; index += 1) {
        const found = validate(index, draft);
        if (Object.keys(found).length) {
          setErrors(found);
          setStep(index);
          return;
        }
      }
    }
    setErrors({});
    setFormError(null);
    setStep(next);
  };

  const canSave = [0, 1].every((index) => Object.keys(validate(index, draft)).length === 0);

  async function persist(submit: boolean) {
    setFormError(null);
    setBusy(submit ? 'submit' : 'save');
    try {
      const input: CreateEventInput = {
        title: { ...(draft.titleEn.trim() && { en: draft.titleEn.trim() }), ...(draft.titleFr.trim() && { fr: draft.titleFr.trim() }) },
        description: {
          ...(draft.descriptionEn.trim() && { en: draft.descriptionEn.trim() }),
          ...(draft.descriptionFr.trim() && { fr: draft.descriptionFr.trim() }),
        },
        category: draft.category,
        ...(draft.coverUrl && { coverUrl: draft.coverUrl }),
        venue: draft.venue.trim(),
        city: draft.city.trim(),
        country: draft.country,
        startAt: iso(draft.startAt),
        endAt: iso(draft.endAt),
      };
      const event = await eventDraftApi.create(input);
      const validTiers = Object.keys(validate(2, draft)).length === 0 ? draft.tiers : [];
      for (const tier of validTiers) {
        await eventDraftApi.addTier(event.id, {
          name: tier.name,
          price: toInt(tier.price),
          quantity: toInt(tier.quantity),
          salesEndAt: iso(tier.salesEndAt),
        });
      }
      if (submit) await eventDraftApi.submit(event.id);
      router.replace(`/organizer/events/${event.id}`);
    } catch (caught) {
      setBusy(null);
      if (caught instanceof ApiError) {
        setFormError(caught.code === 'NETWORK_ERROR' ? 'We could not reach Tikly. Check your connection.' : caught.message);
      } else setFormError('Something went wrong. Please try again.');
    }
  }

  const footerAction = [
    { label: 'Continue to date & venue', onClick: () => goTo(1) },
    { label: 'Continue to tickets', onClick: () => goTo(2) },
    { label: 'Continue to review', onClick: () => goTo(3) },
    { label: 'Submit for approval', onClick: () => persist(true) },
  ][step];

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-30 flex h-17 items-center gap-4 border-b border-border bg-raised px-4 sm:px-6">
        <Link href="/organizer/events" aria-label="Close" className="grid size-10 place-items-center rounded-full border border-border hover:bg-surface">
          <Icon name="close" size={18} />
        </Link>
        <div className="min-w-0">
          <p className="text-[17px] font-extrabold">Create event</p>
          <p className="truncate text-[13px] text-fg-muted">{canSave ? 'Ready to save as a draft' : 'Not saved yet'}</p>
        </div>
        <ActionButton
          variant="secondary"
          size="sm"
          className="ml-auto"
          disabled={!canSave || busy !== null}
          loading={busy === 'save'}
          title={canSave ? undefined : 'Fill in basics, date and venue first'}
          onClick={() => persist(false)}
        >
          Save and exit
        </ActionButton>
      </header>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[200px_1fr] xl:grid-cols-[200px_1fr_260px]">
        <nav aria-label="Steps" className="lg:pt-1">
          <p className="mb-3 hidden text-[11px] font-bold tracking-wider text-fg-muted uppercase lg:block">4 steps</p>
          <ol className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:flex-col">
            {STEPS.map((item, index) => (
              <li key={item.title} className="shrink-0">
                <button
                  onClick={() => goTo(index)}
                  aria-current={index === step ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-[14px] p-3 text-left',
                    index === step ? 'border border-border bg-raised shadow-sm' : 'hover:bg-raised/60',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                      index === step ? 'bg-primary text-white' : index < step ? 'bg-primary-subtle text-primary' : 'border border-border text-fg-secondary',
                    )}
                  >
                    {index < step ? <Icon name="check" size={14} /> : index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{item.title}</span>
                    <span className="hidden text-xs text-fg-muted lg:block">{item.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <Card className="h-fit p-5 sm:p-6">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">
            Step {step + 1} · {STEPS[step].title}
          </p>
          <div className="mt-5">
            <FormAlert message={formError ?? undefined} />
          </div>
          {step === 0 && <BasicsStep draft={draft} update={update} errors={errors} categories={categories} />}
          {step === 1 && <VenueStep draft={draft} update={update} errors={errors} />}
          {step === 2 && <TicketsStep draft={draft} update={update} errors={errors} />}
          {step === 3 && <ReviewStep draft={draft} categoryLabel={categoryLabel} onEdit={goTo} />}
        </Card>

        <aside className="hidden xl:block">
          {step === 2 ? <Earnings tiers={draft.tiers} /> : <Preview draft={draft} categoryLabel={categoryLabel} final={step === 3} />}
        </aside>
      </div>

      <footer className="sticky bottom-0 flex h-19 items-center gap-3 border-t border-border bg-raised px-4 sm:px-6">
        <span className="text-sm text-fg-secondary">Step {step + 1} of 4</span>
        <div className="ml-auto flex gap-3">
          {step > 0 && (
            <ActionButton variant="secondary" size="md" onClick={() => goTo(step - 1)} disabled={busy !== null}>
              Back
            </ActionButton>
          )}
          <ActionButton size="md" onClick={footerAction.onClick} loading={busy === 'submit'} disabled={busy !== null}>
            {footerAction.label}
          </ActionButton>
        </div>
      </footer>
    </div>
  );
}

type StepProps = {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  errors: Record<string, string>;
};

function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="mt-1 text-sm text-fg-secondary">{body}</p>
    </div>
  );
}

function FieldShell({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-fg-secondary">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-invalid">{error}</p> : hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
    </div>
  );
}

const boxClass = (error?: string) =>
  cn(
    'h-13 w-full rounded-2xl border bg-raised px-4 text-base text-fg outline-none focus:border-2 focus:border-primary',
    error ? 'border-2 border-invalid' : 'border-border',
  );

function BasicsStep({ draft, update, errors, categories }: StepProps & { categories: Category[] }) {
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const descriptionId = useId();
  const categoryId = useId();
  const key = language === 'en' ? 'descriptionEn' : 'descriptionFr';
  return (
    <>
      <StepHeading title="What's your event?" body="Write it in English, French or both. Attendees see the language they chose in the app." />
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="titleEn" label="Title in English" value={draft.titleEn} maxLength={150} onChange={(e) => update('titleEn', e.target.value)} error={errors.titleEn} hint="Up to 150 characters" />
          <TextField name="titleFr" label="Title in French" value={draft.titleFr} maxLength={150} onChange={(e) => update('titleFr', e.target.value)} hint="Optional" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor={descriptionId} className="text-sm font-semibold text-fg-secondary">
              Description
            </label>
            <div role="group" aria-label="Description language" className="flex rounded-lg border border-border p-0.5">
              {(['en', 'fr'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={language === code}
                  onClick={() => setLanguage(code)}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-bold uppercase', language === code ? 'bg-primary text-white' : 'text-fg-secondary')}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id={descriptionId}
            rows={4}
            maxLength={5000}
            value={draft[key]}
            onChange={(e) => update(key, e.target.value)}
            placeholder={language === 'en' ? 'Describe your event in English' : 'Décrivez votre événement en français'}
            className={cn(boxClass(errors.description), 'h-auto py-3')}
          />
          {errors.description ? <p className="text-sm text-invalid">{errors.description}</p> : <p className="text-sm text-fg-muted">Shown on the public event page</p>}
        </div>
        <FieldShell label="Category" error={errors.category} id={categoryId}>
          <select id={categoryId} value={draft.category} onChange={(e) => update('category', e.target.value)} className={boxClass(errors.category)}>
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.en}
              </option>
            ))}
          </select>
        </FieldShell>
        <CoverUpload draft={draft} update={update} />
      </div>
    </>
  );
}

function CoverUpload({ draft, update }: Pick<StepProps, 'draft' | 'update'>) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Use a JPG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return setError('The image must be 5 MB or smaller.');
    setUploading(true);
    try {
      const { url } = await eventDraftApi.uploadCover(file);
      update('coverUrl', url);
      update('coverName', file.name);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-fg-secondary">Cover image</span>
      <label
        htmlFor={id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}
        className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-surface p-6 text-center has-focus-visible:outline-2 has-focus-visible:outline-primary"
      >
        {draft.coverUrl ? (
          <>
            <img src={draft.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
            <span className="relative rounded-xl bg-raised/90 px-3 py-1.5 text-sm font-bold">Replace cover image</span>
          </>
        ) : (
          <>
            <span className="grid size-10 place-items-center rounded-xl bg-raised text-primary shadow-sm">
              <Icon name="image" />
            </span>
            <span className="text-sm font-bold">{uploading ? 'Uploading…' : 'Upload cover image'}</span>
            <span className="text-[13px] text-fg-muted">Drag a file here or browse · 1600 × 900 recommended, JPG or PNG up to 5 MB</span>
          </>
        )}
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {error && <p className="text-sm text-invalid">{error}</p>}
    </div>
  );
}

function VenueStep({ draft, update, errors }: StepProps) {
  const countryId = useId();
  return (
    <>
      <StepHeading title="When and where?" body="Attendees get a reminder 24 hours before the start time." />
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="startAt" label="Starts" type="datetime-local" value={draft.startAt} onChange={(e) => update('startAt', e.target.value)} error={errors.startAt} />
          <TextField name="endAt" label="Ends" type="datetime-local" value={draft.endAt} min={draft.startAt || undefined} onChange={(e) => update('endAt', e.target.value)} error={errors.endAt} />
        </div>
        <hr className="border-border" />
        <TextField name="venue" label="Venue" value={draft.venue} maxLength={200} onChange={(e) => update('venue', e.target.value)} error={errors.venue} hint="Building, hall or ground name, and street if useful" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="city" label="City" value={draft.city} maxLength={100} onChange={(e) => update('city', e.target.value)} error={errors.city} />
          <FieldShell label="Country" id={countryId}>
            <select id={countryId} value={draft.country} onChange={(e) => update('country', e.target.value)} className={boxClass()}>
              {COUNTRIES.map((country) => (
                <option key={country}>{country}</option>
              ))}
            </select>
          </FieldShell>
        </div>
        <p className="flex items-center gap-2 rounded-xl bg-surface p-3 text-[13px] text-fg-secondary">
          <Icon name="alert" size={16} className="shrink-0 text-primary" />
          After the end time the event is marked Completed and attendees can leave reviews.
        </p>
      </div>
    </>
  );
}

function TicketsStep({ draft, update, errors }: StepProps) {
  const unused = TIER_ORDER.filter((name) => !draft.tiers.some((tier) => tier.name === name));
  const setTier = (index: number, patch: Partial<TierDraft>) =>
    update('tiers', draft.tiers.map((tier, position) => (position === index ? { ...tier, ...patch } : tier)));
  const defaultSalesEnd = draft.startAt;
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <StepHeading title="Set your ticket tiers" body="Up to three tiers. Prices are in whole francs; buyers pay with MTN MoMo or Orange Money." />
        <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-bold text-fg-secondary">{draft.tiers.length} of 3 tiers</span>
      </div>
      {errors.tiers && <p className="mb-4 text-sm text-invalid">{errors.tiers}</p>}
      <ul className="flex flex-col gap-4">
        {draft.tiers.map((tier, index) => (
          <li key={tier.name} className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-extrabold">{TIER_LABEL[tier.name]}</h2>
              <button
                type="button"
                aria-label={`Remove ${TIER_LABEL[tier.name]} tier`}
                onClick={() => update('tiers', draft.tiers.filter((_, position) => position !== index))}
                className="rounded-lg p-1.5 text-fg-muted hover:bg-surface hover:text-invalid"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_1.3fr]">
              <TextField
                name={`${tier.name}-price`}
                label="Price (XAF)"
                inputMode="numeric"
                placeholder="0 for free"
                value={tier.price ? formatAmount(toInt(tier.price)) : tier.price}
                onChange={(e) => setTier(index, { price: e.target.value.replace(/\D/g, '') })}
                error={errors[`tier${index}.price`]}
              />
              <TextField
                name={`${tier.name}-quantity`}
                label="Quantity"
                inputMode="numeric"
                value={tier.quantity}
                onChange={(e) => setTier(index, { quantity: e.target.value.replace(/\D/g, '') })}
                error={errors[`tier${index}.quantity`]}
              />
              <TextField
                name={`${tier.name}-salesEndAt`}
                label="Sales end"
                type="datetime-local"
                value={tier.salesEndAt}
                max={draft.endAt || undefined}
                onChange={(e) => setTier(index, { salesEndAt: e.target.value })}
                error={errors[`tier${index}.salesEndAt`]}
              />
            </div>
          </li>
        ))}
      </ul>
      {unused.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {unused.map((name) => (
            <ActionButton
              key={name}
              variant="outline"
              size="sm"
              onClick={() =>
                update(
                  'tiers',
                  [...draft.tiers, { name, price: '', quantity: '', salesEndAt: defaultSalesEnd }].sort(
                    (a, b) => TIER_ORDER.indexOf(a.name) - TIER_ORDER.indexOf(b.name),
                  ),
                )
              }
            >
              <Icon name="add" size={16} /> Add {TIER_LABEL[name]}
            </ActionButton>
          ))}
        </div>
      )}
      <p className="mt-5 flex gap-2 rounded-xl bg-surface p-3 text-[13px] text-fg-secondary">
        <Icon name="alert" size={16} className="shrink-0 text-primary" />
        Buyers can order up to 10 tickets at once. Tickets are held for 10 minutes while payment is pending, and can&apos;t be transferred.
      </p>
    </>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold">{title}</h2>
        <button onClick={onEdit} className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <Icon name="edit" size={14} /> Edit
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">{children}</dl>
    </section>
  );
}

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <>
    <dt className="text-fg-secondary">{label}</dt>
    <dd className="font-semibold break-words">{value}</dd>
  </>
);

const dateTime = (local: string) => (local ? `${formatShortDate(local)} · ${formatTime(local)}` : '—');

function ReviewStep({ draft, categoryLabel, onEdit }: { draft: Draft; categoryLabel: string; onEdit: (step: number) => void }) {
  const languages = [draft.titleEn && 'EN', draft.titleFr && 'FR'].filter(Boolean).join(', ');
  const description = draft.descriptionEn || draft.descriptionFr;
  return (
    <>
      <StepHeading title="Check everything before you submit" body="An admin reviews your event. You can edit it again if it's rejected." />
      <div className="flex flex-col gap-4">
        <ReviewSection title="Basics" onEdit={() => onEdit(0)}>
          <Row label="Title" value={`${draft.titleEn || draft.titleFr} (${languages})`} />
          <Row label="Category" value={categoryLabel || '—'} />
          <Row label="Description" value={<span className="line-clamp-2">{description}</span>} />
          <Row label="Cover" value={draft.coverName || 'No cover image'} />
        </ReviewSection>
        <ReviewSection title="Date & venue" onEdit={() => onEdit(1)}>
          <Row label="Starts" value={dateTime(draft.startAt)} />
          <Row label="Ends" value={dateTime(draft.endAt)} />
          <Row label="Venue" value={draft.venue} />
          <Row label="City" value={`${draft.city}, ${draft.country}`} />
        </ReviewSection>
        <ReviewSection title="Tickets" onEdit={() => onEdit(2)}>
          {draft.tiers.map((tier) => (
            <Row
              key={tier.name}
              label={TIER_LABEL[tier.name]}
              value={
                <span className="flex flex-wrap justify-between gap-2">
                  <span className="font-normal text-fg-secondary">
                    {formatAmount(toInt(tier.quantity))} tickets · sales end {dateTime(tier.salesEndAt)}
                  </span>
                  <span>{toInt(tier.price) ? formatMoney(toInt(tier.price)) : 'Free'}</span>
                </span>
              }
            />
          ))}
        </ReviewSection>
      </div>
    </>
  );
}

function Preview({ draft, categoryLabel, final }: { draft: Draft; categoryLabel: string; final: boolean }) {
  const prices = draft.tiers.map((tier) => toInt(tier.price)).filter((price) => price > 0);
  return (
    <div className="sticky top-24">
      <p className="mb-3 text-[11px] font-bold tracking-wider text-fg-muted uppercase">{final ? 'Final preview' : 'Live preview · app card'}</p>
      <Card className="overflow-hidden">
        <div className="grid h-36 place-items-center bg-media text-[13px] text-on-media-muted">
          {draft.coverUrl ? (
            <img src={draft.coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1">
              <Icon name="image" /> Your cover image appears here
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-[11px] font-bold tracking-wider text-primary uppercase">{categoryLabel || 'Category'}</p>
          <p className="mt-1 truncate font-extrabold">{draft.titleEn || draft.titleFr || 'Your event title'}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-secondary">
            <Icon name="calendar" size={14} /> {draft.startAt ? dateTime(draft.startAt) : 'Date not set'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-secondary">
            <Icon name="location" size={14} /> {draft.venue ? `${draft.venue}, ${draft.city}` : 'Venue not set'}
          </p>
          {final && prices.length > 0 && <p className="mt-2 text-sm font-bold">From {formatMoney(Math.min(...prices))}</p>}
        </div>
      </Card>
      {final ? (
        <p className="mt-3 flex gap-2 rounded-xl bg-warning-subtle p-3 text-[13px] text-warning-text">
          <Icon name="pending" size={16} className="shrink-0" />
          After you submit, the status is Pending approval. We&apos;ll notify you when an admin approves or rejects it.
        </p>
      ) : (
        <p className="mt-3 text-[13px] text-fg-secondary">After approval, this is how your event appears in the attendee app and on its public page.</p>
      )}
    </div>
  );
}

function Earnings({ tiers }: { tiers: TierDraft[] }) {
  const lines = tiers.map((tier) => ({ ...tier, price: toInt(tier.price), quantity: toInt(tier.quantity) }));
  const gross = lines.reduce((sum, tier) => sum + tier.price * tier.quantity, 0);
  const count = lines.reduce((sum, tier) => sum + tier.quantity, 0);
  const commission = Math.round(gross * COMMISSION);
  return (
    <div className="sticky top-24">
      <p className="mb-3 text-[11px] font-bold tracking-wider text-fg-muted uppercase">If every ticket sells</p>
      <Card className="p-4 text-sm">
        <ul className="flex flex-col gap-2">
          {lines.map((tier) => (
            <li key={tier.name} className="flex justify-between gap-2">
              <span>
                <span className="block font-bold">{TIER_LABEL[tier.name]}</span>
                <span className="text-xs text-fg-muted">
                  {formatAmount(tier.quantity)} × {formatAmount(tier.price)}
                </span>
              </span>
              <span className="font-bold">{formatMoney(tier.price * tier.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-[13px] text-fg-secondary">
          <p className="flex justify-between">
            <span>Gross · {formatAmount(count)} tickets</span>
            <span className="font-bold text-fg">{formatMoney(gross)}</span>
          </p>
          <p className="flex justify-between">
            <span>tikly commission · 10%</span>
            <span className="font-bold text-fg">−{formatMoney(commission)}</span>
          </p>
        </div>
        <div className="mt-3 rounded-xl bg-surface p-3">
          <p className="text-[13px] text-fg-secondary">You receive</p>
          <p className="text-2xl font-extrabold">{formatMoney(gross - commission)}</p>
        </div>
      </Card>
      <p className="mt-3 text-[13px] text-fg-secondary">Your share is paid to your Mobile Money account as each payment clears.</p>
    </div>
  );
}
