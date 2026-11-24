import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimeField } from '@/components/organizer/DateTimeField';
import { FieldBox } from '@/components/organizer/FieldBox';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { eventsApi, type ApiTier } from '@/features/events/api';
import type { TierName } from '@/features/events/types';
import { organizerApi, type EventInput, type OrganizerEvent } from '@/features/organizer/api';
import { HOME_CITIES } from '@/features/preferences/homeCity';
import { useTranslation } from '@/i18n/I18nProvider';
import { toApiError, useApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

type Lang = 'en' | 'fr';
type TierDraft = { id?: string; name: TierName; price: string; quantity: string; salesEndAt: Date };

const TIER_ORDER: TierName[] = ['standard', 'vip', 'vvip'];
const COUNTRY = 'Cameroon';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SALES_END_BEFORE_START_MS = 3 * HOUR_MS;

const defaultStart = () => {
  const date = new Date(Date.now() + 14 * DAY_MS);
  date.setHours(20, 0, 0, 0);
  return date;
};

const digits = (value: string) => Number(value.replace(/\D/g, '')) || 0;

type LoadedEvent = OrganizerEvent & { tiers: ApiTier[] };

export default function EventWizard() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const existing = useAsync(params.id ? () => organizerApi.event(params.id!) : null, params.id ?? 'new');

  if (params.id && !existing.data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accentText} size="large" />
        </View>
      </Screen>
    );
  }
  return <Wizard event={existing.data} />;
}

const toDrafts = (tiers: ApiTier[]): TierDraft[] =>
  [...tiers]
    .sort((a, b) => TIER_ORDER.indexOf(a.name) - TIER_ORDER.indexOf(b.name))
    .map((tier) => ({ id: tier.id, name: tier.name, price: String(tier.price), quantity: String(tier.quantity), salesEndAt: new Date(tier.salesEndAt) }));

function Wizard({ event }: { event?: LoadedEvent }) {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const errorMessage = useApiErrorMessage();
  const now = useNow();
  const categoryData = useAsync(() => eventsApi.categories(), 'categories').data;
  const categories = useMemo(() => categoryData ?? [], [categoryData]);

  const [eventId, setEventId] = useState(event?.id);
  const status: OrganizerEvent['status'] = event?.status ?? 'draft';
  const [step, setStep] = useState<1 | 2>(1);
  const [lang, setLang] = useState<Lang>(language);
  const [title, setTitle] = useState({ en: event?.title.en ?? '', fr: event?.title.fr ?? '' });
  const [description, setDescription] = useState({ en: event?.description.en ?? '', fr: event?.description.fr ?? '' });
  const [category, setCategory] = useState(event?.category ?? '');
  const [city, setCity] = useState<string>(event?.city ?? HOME_CITIES[0]);
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [startAt, setStartAt] = useState(() => (event ? new Date(event.startAt) : defaultStart()));
  const [endAt, setEndAt] = useState(() => (event ? new Date(event.endAt) : new Date(defaultStart().getTime() + 6 * HOUR_MS)));
  const [coverUrl, setCoverUrl] = useState<string | undefined>(event?.coverUrl);
  const [uploading, setUploading] = useState(false);
  const [tiers, setTiers] = useState<TierDraft[]>(() => toDrafts(event?.tiers ?? []));
  const [removedTierIds, setRemovedTierIds] = useState<string[]>([]);
  const [sheet, setSheet] = useState<'category' | 'city' | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const published = status === 'published';
  const locked = !['draft', 'rejected', 'published'].includes(status);
  const categoryLabel = useMemo(() => {
    const match = categories.find((item) => item.key === category);
    return match ? match[language] || match.en : t('organizer.form.category');
  }, [categories, category, language, t]);

  const errors = {
    title: !title.en.trim() && !title.fr.trim(),
    description: !description.en.trim() && !description.fr.trim(),
    category: !category,
    venue: !venue.trim(),
    dates: endAt <= startAt || startAt.getTime() <= now,
  };
  const detailsInvalid = Object.values(errors).some(Boolean);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    setError(undefined);
    try {
      setCoverUrl(await organizerApi.uploadImage(asset.uri, asset.mimeType ?? 'image/jpeg'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  const clean = (text: { en: string; fr: string }) => ({
    ...(text.en.trim() && { en: text.en.trim() }),
    ...(text.fr.trim() && { fr: text.fr.trim() }),
  });

  const saveDetails = async () => {
    if (published) {
      await organizerApi.updateEvent(eventId!, { description: clean(description), ...(coverUrl && { coverUrl }) });
      return eventId!;
    }
    const input: EventInput = {
      title: clean(title),
      description: clean(description),
      category,
      ...(coverUrl && { coverUrl }),
      venue: venue.trim(),
      city,
      country: COUNTRY,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    };
    if (eventId) {
      await organizerApi.updateEvent(eventId, input);
      return eventId;
    }
    const created = await organizerApi.createEvent(input);
    setEventId(created.id);
    return created.id;
  };

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      const apiError = toApiError(caught);
      setError(Object.values(apiError.fieldErrors)[0] ?? errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    setSubmitted(true);
    if (detailsInvalid && !published) return;
    run(async () => {
      await saveDetails();
      if (published) {
        router.back();
        return;
      }
      if (tiers.length === 0) {
        setTiers([{ name: 'standard', price: '', quantity: '', salesEndAt: new Date(startAt.getTime() - SALES_END_BEFORE_START_MS) }]);
      }
      setSubmitted(false);
      setStep(2);
    });
  };

  const tierErrors = tiers.map((tier) => ({
    price: tier.price === '' || (digits(tier.price) > 0 && digits(tier.price) < 100),
    quantity: digits(tier.quantity) < 1,
    salesEndAt: tier.salesEndAt > startAt || tier.salesEndAt.getTime() <= now,
  }));
  const tiersInvalid = tiers.length === 0 || tierErrors.some((item) => Object.values(item).some(Boolean));

  const saveTiers = async (id: string) => {
    await Promise.all(removedTierIds.map((tierId) => organizerApi.deleteTier(tierId)));
    setRemovedTierIds([]);
    const saved = await Promise.all(
      tiers.map(async (tier) => {
        const input = { price: digits(tier.price), quantity: digits(tier.quantity), salesEndAt: tier.salesEndAt.toISOString() };
        if (tier.id) {
          await organizerApi.updateTier(tier.id, input);
          return tier;
        }
        const created = await organizerApi.createTier(id, { name: tier.name, ...input });
        return { ...tier, id: created.id };
      }),
    );
    setTiers(saved);
  };

  const saveDraft = () => {
    setSubmitted(true);
    if (step === 1 ? detailsInvalid && !published : tiersInvalid) return;
    run(async () => {
      const id = await saveDetails();
      if (step === 2) await saveTiers(id);
      router.back();
    });
  };

  const submit = () => {
    setSubmitted(true);
    if (tiersInvalid) return;
    run(async () => {
      await saveTiers(eventId!);
      await organizerApi.submitEvent(eventId!);
      Alert.alert(t('organizer.form.submittedTitle'), t('organizer.form.submittedBody'));
      router.dismissTo('/my-events');
    });
  };

  const updateTier = (index: number, patch: Partial<TierDraft>) =>
    setTiers((current) => current.map((tier, position) => (position === index ? { ...tier, ...patch } : tier)));

  const removeTier = (index: number) => {
    const tier = tiers[index];
    if (tier?.id) setRemovedTierIds((current) => [...current, tier.id!]);
    setTiers((current) => current.filter((_, position) => position !== index));
  };

  const nextTierName = TIER_ORDER.find((name) => !tiers.some((tier) => tier.name === name));
  const totalTickets = tiers.reduce((sum, tier) => sum + digits(tier.quantity), 0);
  const maxRevenue = tiers.reduce((sum, tier) => sum + digits(tier.quantity) * digits(tier.price), 0);

  const header = (
    <View className="h-[52px] flex-row items-center justify-between px-6">
      <IconButton
        accessibilityLabel={step === 1 ? t('common.close') : t('common.back')}
        onPress={() => (step === 2 ? setStep(1) : router.back())}
        icon={<Ionicons name={step === 1 ? 'close' : 'chevron-back'} size={20} color={colors.foreground} />}
      />
      <Text variant="eyebrow" tone="accent">
        {published ? t('organizer.form.editEyebrow') : t(step === 1 ? 'organizer.form.step1' : 'organizer.form.step2')}
      </Text>
      {locked ? (
        <View className="w-10" />
      ) : (
        <Pressable accessibilityRole="button" onPress={saveDraft} disabled={saving} hitSlop={8}>
          <Text variant="link">{t('organizer.form.save')}</Text>
        </Pressable>
      )}
    </View>
  );

  const errorLine = error ? (
    <Text variant="bodySm" tone="invalid" accessibilityLiveRegion="polite">
      {error}
    </Text>
  ) : null;

  if (step === 2) {
    return (
      <Screen edges={['top']}>
        {header}
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3.5 px-6 pb-6 pt-1">
            <View className="gap-1">
              <Text variant="headline" accessibilityRole="header">
                {t('organizer.form.tiersTitle')}
              </Text>
              <Text variant="bodySm" tone="secondary">
                {t('organizer.form.tiersHint')}
              </Text>
            </View>
            {tiers.map((tier, index) => {
              const tierError = submitted ? tierErrors[index] : undefined;
              return (
                <View key={tier.name} className="gap-3 rounded-[18px] border border-border bg-surface-raised p-4">
                  <View className="flex-row items-center justify-between">
                    <Text variant="title">{t(`tickets.tiers.${tier.name}`)}</Text>
                    {tiers.length > 1 ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={t('organizer.form.removeTier')} onPress={() => removeTier(index)} hitSlop={8}>
                        <Ionicons name="trash" size={18} color={colors.foregroundMuted} />
                      </Pressable>
                    ) : null}
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1 gap-1">
                      <Text variant="captionSm" tone="muted">
                        {t('organizer.form.price')}
                      </Text>
                      <FieldBox
                        className="h-12"
                        value={tier.price}
                        onChangeText={(value) => updateTier(index, { price: value.replace(/\D/g, '') })}
                        keyboardType="number-pad"
                        placeholder="0"
                        error={tierError?.price}
                      />
                    </View>
                    <View className="w-[84px] gap-1">
                      <Text variant="captionSm" tone="muted">
                        {t('organizer.form.quantity')}
                      </Text>
                      <FieldBox
                        className="h-12"
                        value={tier.quantity}
                        onChangeText={(value) => updateTier(index, { quantity: value.replace(/\D/g, '') })}
                        keyboardType="number-pad"
                        placeholder="100"
                        error={tierError?.quantity}
                      />
                    </View>
                  </View>
                  <View className="gap-1">
                    <Text variant="captionSm" tone="muted">
                      {t('organizer.form.salesEnd')}
                    </Text>
                    <View className="flex-row">
                      <DateTimeField
                        compact
                        label={t('organizer.form.salesEnd')}
                        value={tier.salesEndAt}
                        onChange={(value) => updateTier(index, { salesEndAt: value })}
                        error={tierError?.salesEndAt}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
            {nextTierName ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setTiers((current) => [
                    ...current,
                    { name: nextTierName, price: '', quantity: '', salesEndAt: new Date(startAt.getTime() - SALES_END_BEFORE_START_MS) },
                  ])
                }
                className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border"
              >
                <Ionicons name="add" size={20} color={colors.accentText} />
                <Text variant="subtitle">{t('organizer.form.addTier', { tier: t(`tickets.tiers.${nextTierName}`) })}</Text>
              </Pressable>
            ) : null}
            <View className="flex-row items-start gap-2.5 rounded-2xl bg-surface p-4">
              <Ionicons name="shield-checkmark" size={20} color={colors.accentText} />
              <Text variant="bodySm" tone="secondary" className="flex-1">
                {t('organizer.form.reviewNote')}
              </Text>
            </View>
            {errorLine}
          </ScrollView>
        </KeyboardAvoidingView>
        <View className="flex-row items-center gap-4 border-t border-border bg-surface-raised px-6 pt-3.5" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          <View>
            <Text variant="amountLg">{t('organizer.form.ticketCount', { count: totalTickets })}</Text>
            <Text variant="caption" tone="muted">
              {t('organizer.form.upTo', { amount: formatMoney(maxRevenue) })}
            </Text>
          </View>
          <Button label={t('organizer.form.submit')} loading={saving} onPress={submit} fullWidth={false} className="flex-1" />
        </View>
      </Screen>
    );
  }

  const lockField = published || locked;

  return (
    <Screen edges={['top']}>
      {header}
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 px-6 pb-6 pt-1">
          <Text variant="headline" accessibilityRole="header">
            {eventId ? t('organizer.form.editTitle') : t('organizer.form.newTitle')}
          </Text>
          {status === 'rejected' && event?.rejectionReason ? (
            <View className="rounded-2xl border border-invalid bg-surface-raised p-3.5">
              <Text variant="bodySm" tone="secondary">
                {`${t('organizer.form.rejectedBecause')} “${event.rejectionReason}”`}
              </Text>
            </View>
          ) : null}
          {published ? (
            <Text variant="bodySm" tone="secondary">
              {t('organizer.form.publishedLock')}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('organizer.form.changeCover')}
            onPress={pickCover}
            disabled={uploading || locked}
            className="h-[150px] overflow-hidden rounded-[22px] bg-surface"
          >
            {coverUrl ? <Image source={{ uri: coverUrl }} className="absolute inset-0" /> : null}
            {!coverUrl && !uploading ? (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="image-outline" size={36} color={colors.foregroundMuted} />
              </View>
            ) : null}
            {uploading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={colors.accentText} />
              </View>
            ) : null}
            <View className="absolute bottom-2.5 right-2.5 h-9 flex-row items-center gap-1.5 rounded-full bg-background px-3">
              <Ionicons name="camera" size={16} color={colors.accentText} />
              <Text variant="label">{coverUrl ? t('organizer.form.changeCover') : t('organizer.form.addCover')}</Text>
            </View>
          </Pressable>

          <View className="flex-row items-center justify-between">
            <Text variant="bodySmStrong" tone="secondary">
              {t('organizer.form.title')}
            </Text>
            <View className="flex-row rounded-full border border-border bg-surface p-0.5">
              {(['en', 'fr'] as const).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: lang === option }}
                  onPress={() => setLang(option)}
                  className={cn('h-7 flex-row items-center rounded-full px-3', lang === option && 'bg-action')}
                >
                  <Text variant="label" tone={lang === option ? 'onAction' : 'secondary'}>
                    {`${option.toUpperCase()}${title[option].trim() ? '' : ' ·'}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <FieldBox
            value={title[lang]}
            onChangeText={(value) => setTitle((current) => ({ ...current, [lang]: value }))}
            placeholder={t('organizer.form.titlePlaceholder')}
            maxLength={150}
            editable={!lockField}
            highlighted={!lockField}
            error={submitted && errors.title}
          />

          <View className="flex-row gap-2.5">
            <Pressable
              accessibilityRole="button"
              disabled={lockField}
              onPress={() => setSheet('category')}
              className={cn(
                'h-14 flex-1 flex-row items-center justify-between rounded-2xl bg-surface-raised px-4',
                submitted && errors.category ? 'border-2 border-invalid' : 'border border-border',
                lockField && 'opacity-50',
              )}
            >
              <Text variant="itemTitle" numberOfLines={1} tone={category ? 'primary' : 'muted'} className="shrink">
                {categoryLabel}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.foregroundMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={lockField}
              onPress={() => setSheet('city')}
              className={cn('h-14 flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-surface-raised px-4', lockField && 'opacity-50')}
            >
              <Text variant="itemTitle" numberOfLines={1} className="shrink">{`${city}, CM`}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.foregroundMuted} />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2.5">
            <FieldBox
              className="flex-1"
              value={venue}
              onChangeText={setVenue}
              placeholder={t('organizer.form.venue')}
              maxLength={200}
              editable={!lockField}
              error={submitted && errors.venue}
            />
          </View>

          <View className="flex-row gap-2.5">
            <DateTimeField label={t('organizer.form.starts')} value={startAt} onChange={(value) => {
              setStartAt(value);
              if (endAt <= value) setEndAt(new Date(value.getTime() + 6 * HOUR_MS));
            }} disabled={lockField} error={submitted && errors.dates} />
            <DateTimeField label={t('organizer.form.ends')} value={endAt} onChange={setEndAt} disabled={lockField} error={submitted && errors.dates} />
          </View>

          <FieldBox
            multiline
            value={description[lang]}
            onChangeText={(value) => setDescription((current) => ({ ...current, [lang]: value }))}
            placeholder={t('organizer.form.descriptionPlaceholder')}
            maxLength={5000}
            editable={!locked}
            error={submitted && errors.description}
          />
          {errorLine}
        </ScrollView>
      </KeyboardAvoidingView>

      {locked ? null : (
        <View className="border-t border-border bg-surface-raised px-6 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          <Button label={published ? t('organizer.form.saveChanges') : t('organizer.form.next')} loading={saving} onPress={next} />
        </View>
      )}

      <OptionSheet
        visible={sheet === 'category'}
        title={t('organizer.form.category')}
        options={categories.map((item) => ({ value: item.key, label: item[language] || item.en }))}
        value={category}
        onSelect={(value) => {
          setCategory(value);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'city'}
        title={t('organizer.form.city')}
        options={HOME_CITIES.map((item) => ({ value: item, label: item }))}
        value={city}
        onSelect={(value) => {
          setCity(value);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}
