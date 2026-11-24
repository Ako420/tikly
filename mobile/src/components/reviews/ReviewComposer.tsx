import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { reviewsApi, type EventReview } from '@/features/reviews/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { typography, useTheme } from '@/theme';
import { StarRating } from './StarRating';

const MAX_COMMENT = 1000;

type ReviewComposerProps = {
  eventId: string;
  onCreated: (review: EventReview) => void;
};

export function ReviewComposer({ eventId, onCreated }: ReviewComposerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    if (rating === 0) {
      setError(t('reviews.ratingRequired'));
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const trimmed = comment.trim();
      onCreated(await reviewsApi.createForEvent(eventId, { rating, comment: trimmed || undefined }));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
      <View className="gap-1">
        <Text variant="subheading">{t('reviews.composeTitle')}</Text>
        <Text variant="bodySm" tone="muted">
          {t('reviews.composeHint')}
        </Text>
      </View>
      <StarRating value={rating} size={32} onChange={setRating} />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={t('reviews.commentPlaceholder')}
        placeholderTextColor={colors.foregroundMuted}
        multiline
        maxLength={MAX_COMMENT}
        textAlignVertical="top"
        accessibilityLabel={t('reviews.commentPlaceholder')}
        className="min-h-[110px] rounded-2xl border border-border bg-surface-raised px-4 py-3"
        style={[typography.input, { color: colors.foreground }]}
      />
      {error ? (
        <Text variant="bodySm" className="text-invalid" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={t('reviews.submit')} loading={submitting} onPress={submit} />
    </View>
  );
}
