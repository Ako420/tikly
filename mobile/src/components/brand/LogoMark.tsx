import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

type LogoMarkSize = 'sm' | 'lg';

const sizes: Record<LogoMarkSize, { container: string; icon: number }> = {
  sm: { container: 'h-8 w-8 rounded-logo-sm', icon: 20 },
  lg: { container: 'h-24 w-24 rounded-logo-lg', icon: 56 },
};

export function LogoMark({ size = 'sm' }: { size?: LogoMarkSize }) {
  const { colors } = useTheme();

  return (
    <View
      className={cn('-rotate-12 items-center justify-center bg-accent', sizes[size].container)}
      style={size === 'lg' ? { boxShadow: '0px 24px 48px -16px rgba(20, 10, 69, 0.6)' } : undefined}
    >
      <MaterialCommunityIcons name="ticket-confirmation" size={sizes[size].icon} color={colors.onAccent} />
    </View>
  );
}
