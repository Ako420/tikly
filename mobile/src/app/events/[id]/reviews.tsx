import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import { StarRating } from '@/components/reviews/StarRating';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useEventFormatter } from '@/features/events/formatEvent';
import { useEventDetails } from '@/features/events/useEvents';
import { useEventReviews } from '@/features/reviews/useEventReviews';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useTheme } from '@/theme';

export default function EventReviewsScreen() {
  const { id, write } = useLocalSearchParams<{ id: string; write?: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const format = useEventFormatter();
  const errorMessage = useApiErrorMessage();
  const event = useEventDetails(id).data;
  const reviews = useEventReviews(id);
  const [composing, setComposing] = useState(write === '1');
  const [submitted, setSubmitted] = useState(false);

  const canReview = user?.role === 'attendee' && !submitted;
  const fetchedAverage = reviews.items.length > 0 ? reviews.items.reduce((sum, item) => sum + item.rating, 0) / reviews.items.length : 0;
  const average = submitted || !event?.rating ? fetchedAverage : event.rating.average;

  const header = (
    <View className="gap-5 pb-4">
      <View className="gap-1.5">
        <Text variant="eyebrow" tone="accent">
          {t('reviews.eyebrow')}
        </Text>
        <Text variant="headline" accessibilityRole="header" numberOfLines={2}>
          {event ? format.title(event) : t('reviews.title')}
        </Text>
      </View>

      {reviews.total > 0 ? (
        <View className="flex-row items-center gap-4 rounded-2xl bg-surface p-4">
          <Text variant="display">{average.toFixed(1)}</Text>
          <View className="gap-1">
            <StarRating value={average} size={18} />
            <Text variant="bodySm" tone="muted">
              {t('reviews.count', { count: reviews.total })}
            </Text>
          </View>
        </View>
      ) : null}

      {canReview ? (
        composing ? (
          <ReviewComposer
            eventId={id}
            onCreated={(review) => {
              reviews.prepend(review);
              setComposing(false);
              setSubmitted(true);
            }}
          />
        ) : (
          <Button
            variant="outline"
            label={t('reviews.write')}
            icon={<Ionicons name="create-outline" size={18} color={colors.accentText} />}
            onPress={() => setComposing(true)}
          />
        )
      ) : null}

      {submitted ? (
        <Text variant="bodySmStrong" tone="accent">
          {t('reviews.thanks')}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <View className="h-[52px] flex-row items-center px-6">
        <IconButton
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/events/[id]', params: { id } }))}
        />
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={reviews.items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerClassName="gap-3 px-6 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
          onEndReached={reviews.loadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => <ReviewCard review={item} />}
          ListEmptyComponent={
            reviews.loading ? (
              <ActivityIndicator color={colors.accentText} className="py-10" />
            ) : reviews.error ? (
              <EmptyState
                icon="cloud-offline-outline"
                title={t('reviews.errorTitle')}
                body={errorMessage(reviews.error)}
                actionLabel={t('reviews.retry')}
                onAction={reviews.reload}
              />
            ) : (
              <EmptyState icon="star-outline" title={t('reviews.emptyTitle')} body={t('reviews.emptyBody')} />
            )
          }
          ListFooterComponent={
            reviews.loading && reviews.items.length > 0 ? <ActivityIndicator color={colors.accentText} className="py-4" /> : undefined
          }
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
