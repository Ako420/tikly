import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { ReduceMotion, SlideInDown, SlideInUp, SlideOutDown, SlideOutUp } from 'react-native-reanimated';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { DURATION, haptic } from '@/lib/motion';
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
  const [goingUp, setGoingUp] = useState(true);
  const enter = (goingUp ? SlideInDown : SlideInUp).duration(DURATION.base).reduceMotion(ReduceMotion.System);
  const exit = (goingUp ? SlideOutUp : SlideOutDown).duration(DURATION.base).reduceMotion(ReduceMotion.System);
  const change = (next: number) => {
    setGoingUp(next > value);
    haptic.select();
    onChange(next);
  };

  return (
    <View
      className="flex-row items-center gap-3.5"
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrease) change(value + 1);
        if (event.nativeEvent.actionName === 'decrement' && canDecrease) change(value - 1);
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.decrease')}
        disabled={!canDecrease}
        onPress={() => change(value - 1)}
        hitSlop={6}
        className={cn(
          'h-9 w-9 items-center justify-center rounded-full border',
          canDecrease ? 'border-outline' : 'border-border opacity-50',
        )}
      >
        <Ionicons name="remove" size={18} color={colors.foreground} />
      </Pressable>
      <View className="h-7 w-5 items-center justify-center overflow-hidden">
        <Animated.View key={value} entering={enter} exiting={exit} className="absolute">
          <Text variant="title" className="text-center">
            {value}
          </Text>
        </Animated.View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.increase')}
        disabled={!canIncrease}
        onPress={() => change(value + 1)}
        hitSlop={6}
        className={cn('h-9 w-9 items-center justify-center rounded-full bg-action', !canIncrease && 'opacity-40')}
      >
        <Ionicons name="add" size={18} color={colors.onAction} />
      </Pressable>
    </View>
  );
}
