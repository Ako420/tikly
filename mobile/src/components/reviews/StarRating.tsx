import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

const STARS = [1, 2, 3, 4, 5];

type StarRatingProps = {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
};

export function StarRating({ value, size = 16, onChange }: StarRatingProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!onChange) {
    return (
      <View className="flex-row gap-0.5" accessible accessibilityLabel={t('reviews.starsLabel', { count: value })}>
        {STARS.map((star) => (
          <Ionicons key={star} name={star <= Math.round(value) ? 'star' : 'star-outline'} size={size} color={colors.accentText} />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-row gap-2" accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: value }}>
      {STARS.map((star) => (
        <Pressable
          key={star}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('reviews.starsLabel', { count: star })}
          accessibilityState={{ selected: star === value }}
          onPress={() => onChange(star)}
        >
          <Ionicons name={star <= value ? 'star' : 'star-outline'} size={size} color={colors.accentText} />
        </Pressable>
      ))}
    </View>
  );
}
