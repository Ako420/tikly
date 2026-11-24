import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

type Tone = 'valid' | 'warning' | 'invalid' | 'neutral';

const toneClass: Record<Tone, string> = {
  valid: 'bg-valid',
  warning: 'bg-warning',
  invalid: 'bg-invalid',
  neutral: 'bg-surface border border-border',
};

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <View className={cn('h-7 justify-center rounded-full px-2.5', toneClass[tone])}>
      <Text variant="label" tone={tone === 'neutral' ? 'secondary' : 'onAccent'}>
        {label}
      </Text>
    </View>
  );
}
