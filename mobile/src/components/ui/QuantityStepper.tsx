import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';
import { Text } from './Text';

type QuantityStepperProps = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
};

export function QuantityStepper({ value, max, onChange, label }: QuantityStepperProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const canDecrease = value > 0;
  const canIncrease = value < max;

  return (
    <View
      className="flex-row items-center gap-3.5"
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrease) onChange(value + 1);
        if (event.nativeEvent.actionName === 'decrement' && canDecrease) onChange(value - 1);
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.decrease')}
        disabled={!canDecrease}
        onPress={() => onChange(value - 1)}
        hitSlop={6}
        className={cn(
          'h-9 w-9 items-center justify-center rounded-full border',
          canDecrease ? 'border-outline' : 'border-border opacity-50',
        )}
      >
        <Ionicons name="remove" size={18} color={colors.foreground} />
      </Pressable>
      <Text variant="title" className="w-5 text-center">
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.increase')}
        disabled={!canIncrease}
        onPress={() => onChange(value + 1)}
        hitSlop={6}
        className={cn('h-9 w-9 items-center justify-center rounded-full bg-action', !canIncrease && 'opacity-40')}
      >
        <Ionicons name="add" size={18} color={colors.onAction} />
      </Pressable>
    </View>
  );
}
