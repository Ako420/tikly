import { View, type ViewStyle } from 'react-native';
import { cn } from '@/lib/cn';

type TicketNotchProps = {
  size: number;
  style: ViewStyle;
  color: string;
  outlined: boolean;
};

export function TicketNotch({ size, style, color, outlined }: TicketNotchProps) {
  return (
    <View
      className={cn('absolute rounded-full', outlined && 'border border-border')}
      style={[{ width: size, height: size, backgroundColor: color }, style]}
    />
  );
}
