'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormAlert } from '@/components/ui/FormAlert';
import { Icon } from '@/components/ui/Icon';
import {
  localizeText,
  providerApi,
  SERVICE_CATEGORIES,
  SERVICE_UNITS,
  type ProviderService,
  type ServiceCategory,
  type ServiceInput,
  type ServiceUnit,
} from '@/features/provider/api';
import { fill } from '@/features/provider/format';
import { ApiError } from '@/lib/http/errors';
import { formatAmount } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { CATEGORY_ICONS, Drawer, EmptyState, Field, Input, LoadError, PageHeader, ProfileRequired, Select, Skeleton, Textarea } from './parts';
import { useProvider } from './ProviderShell';

type Editing = { mode: 'create' } | { mode: 'edit'; service: ProviderService };

export function ServicesScreen() {
  const { t, locale, profile, profileLoading } = useProvider();
  const copy = t.providerPages.services;
  const router = useRouter();
  const wantsNew = useSearchParams().get('new') === '1';
  const services = useAsync(providerApi.services, []);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const verified = profile?.verification === 'verified';

  const [newHandled, setNewHandled] = useState(false);
  if (wantsNew && verified && !newHandled) {
    setNewHandled(true);
    setEditing({ mode: 'create' });
  }

  const closeEditor = () => {
    setEditing(null);
    if (wantsNew) router.replace('/provider/services');
  };

  const remove = async (service: ProviderService) => {
    const title = localizeText(service.title, locale);
    if (!window.confirm(fill(copy.removeConfirm, { title }))) return;
    setRemovingId(service.id);
    setError(undefined);
    try {
      await providerApi.removeService(service.id);
      services.reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.errors.generic);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          verified ? (
            <button type="button" onClick={() => setEditing({ mode: 'create' })} className={buttonClass('primary', 'md')}>
              <Icon name="add" size={18} />
              {copy.add}
            </button>
          ) : null
        }
      />
      <FormAlert message={error} />

      {profileLoading ? (
        <Skeleton />
      ) : !profile ? (
        <ProfileRequired />
      ) : services.loading && !services.data ? (
        <Skeleton />
      ) : services.error && !services.data ? (
        <LoadError onRetry={services.reload} />
      ) : (services.data ?? []).length === 0 && !verified ? (
        <ProfileRequired text={copy.notVerified} />
      ) : (services.data ?? []).length === 0 ? (
        <EmptyState
          icon="marketplace"
          text={copy.empty}
          action={
            <button type="button" onClick={() => setEditing({ mode: 'create' })} className={buttonClass('primary', 'sm')}>
              {copy.add}
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(services.data ?? []).map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              busy={removingId === service.id}
              onEdit={() => setEditing({ mode: 'edit', service })}
              onRemove={() => void remove(service)}
            />
          ))}
          {verified ? (
            <button
              type="button"
              onClick={() => setEditing({ mode: 'create' })}
              className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-border p-6 text-center hover:bg-raised"
            >
              <span className="grid size-12 place-items-center rounded-full bg-primary-subtle text-primary">
                <Icon name="add" />
              </span>
              <span className="font-bold">{copy.add}</span>
              <span className="max-w-56 text-sm text-fg-secondary">{copy.addCardBody}</span>
            </button>
          ) : null}
        </div>
      )}

      {editing ? (
        <ServiceEditor
          key={editing.mode === 'edit' ? editing.service.id : 'new'}
          service={editing.mode === 'edit' ? editing.service : null}
          defaultCity={profile?.city ?? ''}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor();
            services.reload();
          }}
        />
      ) : null}
    </div>
  );
}

type CardProps = { service: ProviderService; busy: boolean; onEdit: () => void; onRemove: () => void };

function ServiceCard({ service, busy, onEdit, onRemove }: CardProps) {
  const { t, locale } = useProvider();
  const copy = t.providerPages.services;
  const cover = service.photos[0];
  const photoCount = service.photos.length;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative grid h-36 place-items-center bg-primary-subtle text-primary">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <Icon name={CATEGORY_ICONS[service.category]} size={44} />
        )}
        {photoCount > 0 ? (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-raised px-2.5 py-1 text-xs font-semibold text-fg">
            <Icon name="image" size={14} />
            {photoCount === 1 ? copy.photo : fill(copy.photos, { count: photoCount })}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-bold tracking-wider text-primary uppercase">{copy.categories[service.category]}</p>
        <h2 className="text-lg leading-6 font-extrabold">{localizeText(service.title, locale)}</h2>
        <p>
          <span className="text-xl font-extrabold">{formatAmount(service.price)} XAF</span>{' '}
          <span className="text-sm text-fg-secondary">{copy.units[service.unit]}</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-fg-secondary">
          <Icon name="location" size={15} />
          {service.city}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-semibold text-fg-secondary hover:text-invalid disabled:opacity-50"
          >
            <Icon name="trash" size={16} />
            {t.providerPages.common.remove}
          </button>
          <button type="button" onClick={onEdit} className="text-sm font-bold text-primary hover:underline">
            {t.providerPages.common.edit}
          </button>
        </div>
      </div>
    </Card>
  );
}

type EditorProps = { service: ProviderService | null; defaultCity: string; onClose: () => void; onSaved: () => void };

function ServiceEditor({ service, defaultCity, onClose, onSaved }: EditorProps) {
  const { t } = useProvider();
  const copy = t.providerPages.services;
  const form = copy.form;
  const [category, setCategory] = useState<ServiceCategory>(service?.category ?? 'canopy');
  const [titleEn, setTitleEn] = useState(service?.title.en ?? '');
  const [titleFr, setTitleFr] = useState(service?.title.fr ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [price, setPrice] = useState(service ? String(service.price) : '');
  const [unit, setUnit] = useState<ServiceUnit>(service?.unit ?? 'per_day');
  const [city, setCity] = useState(service?.city ?? defaultCity);
  const [photos, setPhotos] = useState<string[]>(service?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(undefined);
    try {
      for (const file of Array.from(files)) {
        const { url } = await providerApi.uploadImage(file);
        setPhotos((current) => [...current, url]);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.errors.generic);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (price.trim() === '') {
      setFieldErrors({ price: form.priceRequired });
      return;
    }
    const input: ServiceInput = {
      category,
      title: { ...(titleEn.trim() && { en: titleEn.trim() }), ...(titleFr.trim() && { fr: titleFr.trim() }) },
      description: description.trim() || undefined,
      photos,
      city: city.trim(),
      price: Number(price),
      unit,
    };
    setSaving(true);
    setError(undefined);
    setFieldErrors({});
    try {
      if (service) await providerApi.updateService(service.id, input);
      else await providerApi.createService(input);
      onSaved();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) setFieldErrors(caught.fieldErrors);
      else setError(caught instanceof ApiError ? caught.message : t.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={service ? form.editTitle : form.addTitle}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          <FormAlert message={error} />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={buttonClass('secondary', 'md')}>
              {t.providerPages.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || uploading}
              className={buttonClass('primary', 'md', 'flex-1')}
            >
              {saving ? t.providerPages.common.saving : service ? t.providerPages.common.save : form.create}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={form.category}>
          <Select value={category} onChange={(event) => setCategory(event.target.value as ServiceCategory)}>
            {SERVICE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {copy.categories[value]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={form.titleEn} error={fieldErrors['title.en'] ?? fieldErrors.title} hint={form.titleHint}>
            <Input value={titleEn} onChange={(event) => setTitleEn(event.target.value)} maxLength={150} aria-invalid={Boolean(fieldErrors.title)} />
          </Field>
          <Field label={form.titleFr} error={fieldErrors['title.fr']}>
            <Input value={titleFr} onChange={(event) => setTitleFr(event.target.value)} maxLength={150} />
          </Field>
        </div>
        <Field label={form.description} optional error={fieldErrors.description}>
          <Textarea
            rows={4}
            value={description}
            maxLength={2000}
            placeholder={form.descriptionPlaceholder}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={form.price} error={fieldErrors.price}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-invalid={Boolean(fieldErrors.price)}
            />
          </Field>
          <Field label={form.unit}>
            <Select value={unit} onChange={(event) => setUnit(event.target.value as ServiceUnit)}>
              {SERVICE_UNITS.map((value) => (
                <option key={value} value={value}>
                  {copy.units[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={form.city} error={fieldErrors.city}>
          <Input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} aria-invalid={Boolean(fieldErrors.city)} />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-fg-secondary">{form.photos}</span>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, index) => (
              <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label={form.removePhoto}
                  onClick={() => setPhotos((current) => current.filter((_, position) => position !== index))}
                  className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-raised/90 text-fg hover:text-invalid"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
            {photos.length < 10 ? (
              <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-fg-secondary hover:bg-surface focus-within:outline-2 focus-within:outline-primary">
                <Icon name="image" />
                {uploading ? t.providerPages.common.uploading : form.addPhoto}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploading}
                  className="sr-only"
                  onChange={(event) => {
                    void upload(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
            ) : null}
          </div>
          <span className="text-xs text-fg-secondary">{form.photosHint}</span>
        </div>
      </div>
    </Drawer>
  );
}
