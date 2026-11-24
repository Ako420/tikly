import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormScreen } from '@/components/ui/FormScreen';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { sampleUser } from '@/features/events/sampleEvents';
import { useTicketFormatter } from '@/features/tickets/formatTicket';
import { postReview } from '@/features/tickets/ticketActions';
import { useTicketBundle } from '@/features/tickets/useMyTickets';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateRange } from '@/lib/dates';
import { palette, typography, useTheme } from '@/theme';

const MAX_RATING = 5;
const MAX_COMMENT = 500;
const HIGHLIGHTS = ['performers', 'venue', 'sound', 'organisation', 'value', 'entry'] as const;

type Highlight = (typeof HIGHLIGHTS)[number];

export default function LeaveReview() {
  const { bundleId } = useLocalSearchParams<{ bundleId: string }>();
  const { bundle, refresh } = useTicketBundle(bundleId);
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const format = useTicketFormatter();
  const errorMessage = useApiErrorMessage();
  const [rating, setRating] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [comment, setComment] = useState('');
  const [focused, setFocused] = useState(false);
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState<string>();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/tickets'));

  if (!bundle) {
    return (
      <FormScreen onBack={close}>
        <EmptyState icon="ticket-outline" title={t('myTickets.detail.notFoundTitle')} body={t('myTickets.detail.notFoundBody')} />
      </FormScreen>
    );
  }

  const title = format.title(bundle);
  const displayName = format.holder(user?.name ?? sampleUser.name);

  const toggle = (value: Highlight) =>
    setHighlights((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  const submit = async () => {
    if (rating === 0 || posting) return;
    setPosting(true);
    setFormError(undefined);
    try {
      await postReview(bundle, { rating, comment, highlights });
      await refresh();
      close();
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setPosting(false);
    }
  };

  return (
    <FormScreen
      contentClassName="gap-5 pt-1"
      header={
        <View className="h-[52px] flex-row items-center justify-between px-6">
          <IconButton icon={<Ionicons name="close" size={20} color={colors.foreground} />} accessibilityLabel={t('common.close')} onPress={close} />
          <Text variant="eyebrow" tone="accent">
            {t('reviews.eyebrow')}
          </Text>
          <View className="w-10" />
        </View>
      }
    >

      <View className="flex-row items-center gap-3.5">
        {bundle.event.coverUrl ? (
          <Image source={{ uri: bundle.event.coverUrl }} resizeMode="cover" className="h-16 w-16 rounded-2xl" />
        ) : null}
        <View className="flex-1 gap-1">
          <Text variant="headline" accessibilityRole="header">
            {t('reviews.title', { event: title })}
          </Text>
          {bundle.checkedInAt ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="checkmark-circle" size={16} color={colors.valid} />
              <Text variant="caption" tone="secondary">
                {t('reviews.checkedIn', {
                  date: formatDateRange(bundle.checkedInAt, bundle.checkedInAt, language, false).replace(/\./g, ''),
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="items-center gap-3 rounded-card border border-border bg-surface px-4 py-5">
        <View className="flex-row gap-3" accessibilityRole="adjustable" accessibilityLabel={t('reviews.ratingLabel')}>
          {Array.from({ length: MAX_RATING }, (_, index) => {
            const value = index + 1;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={t('reviews.starLabel', { count: value })}
                accessibilityState={{ selected: rating === value }}
                hitSlop={4}
                onPress={() => setRating(value)}
              >
                <Ionicons name="star" size={44} color={value <= rating ? palette.amber400 : colors.border} />
              </Pressable>
            );
          })}
        </View>
        <Text variant="subheading">
          {rating > 0 ? t('reviews.ratingValue', { rating, max: MAX_RATING, label: t(`reviews.labels.${rating}`) }) : t('reviews.tapToRate')}
        </Text>
      </View>

      <View className="gap-2.5">
        <Text variant="bodySmStrong" tone="secondary">
          {t('reviews.highlightsLabel')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {HIGHLIGHTS.map((value) => {
            const selected = highlights.includes(value);
            return (
              <Pressable
                key={value}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggle(value)}
                className={cn('rounded-full px-3.5 py-2', selected ? 'bg-accent' : 'border border-border bg-surface')}
              >
                <Text variant="bodySmStrong" tone={selected ? 'onAccent' : 'primary'}>
                  {t(`reviews.highlights.${value}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2.5">
        <Text variant="bodySmStrong" tone="secondary">
          {t('reviews.commentLabel')}
        </Text>
        <View className={cn('rounded-2xl bg-surface px-4 pb-2.5 pt-3', focused ? 'border-2 border-accent-text' : 'border border-border')}>
          <TextInput
            value={comment}
            onChangeText={(value) => setComment(value.slice(0, MAX_COMMENT))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            multiline
            maxLength={MAX_COMMENT}
            placeholder={t('reviews.commentPlaceholder')}
            placeholderTextColor={colors.foregroundMuted}
            accessibilityLabel={t('reviews.commentLabel')}
            className="min-h-[96px] text-foreground"
            style={[typography.input, { textAlignVertical: 'top' }]}
          />
          <Text variant="captionSm" tone="muted" className="text-right">
            {`${comment.length} / ${MAX_COMMENT}`}
          </Text>
        </View>
      </View>

      <View className="mt-auto gap-3 pt-2">
        <Text variant="caption" tone="muted" className="text-center">
          {t('reviews.shownAs', { name: displayName })}
        </Text>
        {formError ? (
          <Text variant="bodySm" tone="invalid" className="text-center" accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}
        <Button label={t('reviews.post')} onPress={submit} loading={posting} disabled={rating === 0} />
      </View>
    </FormScreen>
  );
}
