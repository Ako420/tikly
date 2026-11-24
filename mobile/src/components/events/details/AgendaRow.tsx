import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { localize, type AgendaItem } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatTime } from '@/lib/dates';

export function AgendaRow({ item }: { item: AgendaItem }) {
  const { language } = useTranslation();

  return (
    <View className="flex-row gap-3.5 border-b border-border py-3">
      <Text variant="subtitle" tone="accent" className="w-[52px]">
        {formatTime(item.startAt, language)}
      </Text>
      <View className="flex-1 gap-0.5">
        <Text variant="itemTitle">{localize(item.title, language)}</Text>
        <Text variant="caption" tone="muted">
          {localize(item.location, language)}
        </Text>
      </View>
    </View>
  );
}
