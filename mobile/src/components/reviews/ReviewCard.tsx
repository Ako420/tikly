import { View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import type { EventReview } from '@/features/reviews/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { StarRating } from './StarRating';

export function ReviewCard({ review }: { review: EventReview }) {
  const { language } = useTranslation();
  const date = new Date(review.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View className="gap-2.5 rounded-2xl border border-border bg-surface-raised p-4">
      <View className="flex-row items-center gap-3">
        <Avatar name={review.author} size="sm" />
        <View className="flex-1 gap-0.5">
          <Text variant="itemTitle" numberOfLines={1}>
            {review.author}
          </Text>
          <Text variant="captionSm" tone="muted">
            {date}
          </Text>
        </View>
        <StarRating value={review.rating} size={14} />
      </View>
      {review.comment ? <Text variant="bodySm" tone="secondary">{review.comment}</Text> : null}
    </View>
  );
}
