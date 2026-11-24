import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View className="items-center gap-4 px-6 py-10">
      <View className="h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-raised">
        <Ionicons name={icon} size={28} color={colors.accentText} />
      </View>
      <View className="items-center gap-1.5">
        <Text variant="sectionTitle" className="text-center">
          {title}
        </Text>
        <Text tone="secondary" className="text-center">
          {body}
        </Text>
      </View>
      {actionLabel ? <Button label={actionLabel} variant="outline" onPress={onAction} className="mt-2" /> : null}
    </View>
  );
}
