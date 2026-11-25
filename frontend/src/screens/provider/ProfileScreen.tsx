'use client';

import { useState } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormAlert } from '@/components/ui/FormAlert';
import { Icon } from '@/components/ui/Icon';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { providerApi, type ProviderProfile, type ProviderProfileInput, type VerificationStatus } from '@/features/provider/api';
import { fill } from '@/features/provider/format';
import { ApiError } from '@/lib/http/errors';
import { Field, Input, PageHeader, Skeleton, Textarea } from './parts';
import { useProvider } from './ProviderShell';

const STATUS_TONES: Record<VerificationStatus, PillTone> = { pending: 'warning', verified: 'valid', rejected: 'invalid' };

const localPhone = (phone?: string) => (phone ?? '').replace(/^\+237/, '');

export function ProfileScreen() {
  const { t, profile, profileLoading } = useProvider();
  const copy = t.providerPages.profile;
  const [notice, setNotice] = useState<string>();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={copy.title}
        subtitle={profile ? copy.editSubtitle : copy.createSubtitle}
        action={
          profile ? <StatusPill tone={STATUS_TONES[profile.verification]}>{copy.status[profile.verification]}</StatusPill> : null
        }
      />
      {notice ? (
        <p role="status" className="rounded-2xl bg-valid-subtle px-4 py-3 text-sm font-semibold text-valid">
          {notice}
        </p>
      ) : null}
      {profileLoading && !profile ? (
        <Skeleton rows={4} />
      ) : (
        <ProfileForm key={profile?.id ?? 'new'} profile={profile} onSaved={setNotice} />
      )}
    </div>
  );
}

function ProfileForm({ profile, onSaved }: { profile: ProviderProfile | null; onSaved: (message?: string) => void }) {
  const { t, user, reloadProfile } = useProvider();
  const copy = t.providerPages.profile;
  const common = t.providerPages.common;
  const [businessName, setBusinessName] = useState(profile?.businessName ?? user.name);
  const [description, setDescription] = useState(profile?.description ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [country, setCountry] = useState(profile?.country ?? 'Cameroon');
  const [phone, setPhone] = useState(localPhone(profile?.phone));
  const [whatsapp, setWhatsapp] = useState(localPhone(profile?.whatsapp));
  const [documents, setDocuments] = useState<string[]>(profile?.documents ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const documentsChanged =
    profile !== null &&
    (documents.length !== profile.documents.length || documents.some((id) => !profile.documents.includes(id)));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(undefined);
    try {
      for (const file of Array.from(files)) {
        const { publicId } = await providerApi.uploadDocument(file);
        setDocuments((current) => [...current, publicId]);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.errors.generic);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (documents.length === 0) {
      setFieldErrors({ documents: copy.documentsRequired });
      return;
    }
    const input: ProviderProfileInput = {
      businessName: businessName.trim(),
      description: description.trim() || undefined,
      city: city.trim(),
      country: country.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || undefined,
      documents,
    };
    setSaving(true);
    setError(undefined);
    onSaved(undefined);
    setFieldErrors({});
    try {
      if (profile) await providerApi.updateProfile(input);
      else await providerApi.createProfile(input);
      onSaved(profile ? common.saved : copy.created);
      reloadProfile();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) setFieldErrors(caught.fieldErrors);
      else setError(caught instanceof ApiError ? caught.message : t.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const prefix = <span className="pr-1 text-[15px] font-semibold text-fg-secondary">+237</span>;

  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-6">
      {profile?.verification === 'rejected' && profile.rejectionReason ? (
        <div className="rounded-2xl border border-invalid/30 bg-invalid-subtle p-4">
          <p className="text-sm font-bold text-invalid">{copy.rejectedBecause}</p>
          <p className="mt-1 text-[15px]">{profile.rejectionReason}</p>
        </div>
      ) : null}
      {profile && profile.ratingCount > 0 ? (
        <p className="flex items-center gap-2 text-[15px] text-fg-secondary">
          <Icon name="star" size={18} className="text-accent" />
          {fill(profile.ratingCount === 1 ? copy.ratingOne : copy.rating, { rating: profile.ratingAvg.toFixed(1), count: profile.ratingCount })}
        </p>
      ) : null}

      <Field label={copy.businessName} error={fieldErrors.businessName}>
        <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={150} aria-invalid={Boolean(fieldErrors.businessName)} />
      </Field>
      <Field label={copy.description} optional error={fieldErrors.description}>
        <Textarea
          rows={4}
          value={description}
          maxLength={2000}
          placeholder={copy.descriptionPlaceholder}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={copy.city} error={fieldErrors.city}>
          <Input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} aria-invalid={Boolean(fieldErrors.city)} />
        </Field>
        <Field label={copy.country} error={fieldErrors.country}>
          <Input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={100} aria-invalid={Boolean(fieldErrors.country)} />
        </Field>
        <Field label={copy.phone} error={fieldErrors.phone}>
          <div className="flex h-12 items-center rounded-xl border border-border bg-raised pl-3 focus-within:border-primary">
            {prefix}
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t.fields.phonePlaceholder}
              aria-invalid={Boolean(fieldErrors.phone)}
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none"
            />
          </div>
        </Field>
        <Field label={copy.whatsapp} optional error={fieldErrors.whatsapp}>
          <div className="flex h-12 items-center rounded-xl border border-border bg-raised pl-3 focus-within:border-primary">
            {prefix}
            <input
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder={t.fields.phonePlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none"
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-fg-secondary">{copy.documents}</span>
        <ul className="flex flex-col gap-2">
          {documents.map((id, index) => (
            <li key={id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
              <Icon name="document" className="shrink-0 text-primary" />
              <span className="flex-1 text-[15px] font-semibold">{fill(copy.document, { number: index + 1 })}</span>
              <button
                type="button"
                aria-label={copy.removeDocument}
                onClick={() => setDocuments((current) => current.filter((docId) => docId !== id))}
                className="rounded-lg p-1 text-fg-secondary hover:text-invalid"
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
        <label className={buttonClass('secondary', 'sm', 'w-fit cursor-pointer focus-within:outline-2 focus-within:outline-primary')}>
          <Icon name="add" size={16} />
          {uploading ? common.uploading : copy.addDocument}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <span className={fieldErrors.documents ? 'text-xs text-invalid' : 'text-xs text-fg-secondary'}>
          {fieldErrors.documents ?? copy.documentsHint}
        </span>
        {documentsChanged && profile?.verification === 'verified' ? (
          <p className="rounded-xl bg-warning-subtle px-3 py-2 text-sm text-warning-text">{copy.documentsReview}</p>
        ) : null}
      </div>

      <FormAlert message={error} />
      <div className="flex justify-end">
        <button type="button" onClick={() => void save()} disabled={saving || uploading} className={buttonClass('primary', 'md')}>
          {saving ? (profile ? common.saving : copy.creating) : profile ? common.save : copy.create}
        </button>
      </div>
    </Card>
  );
}
