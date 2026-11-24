import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function PhonePrefix({ country = 'CM', dialCode = '+237' }: { country?: string; dialCode?: string }) {
  const { colors } = useTheme();

  return (
    <View className="h-full flex-row items-center gap-1.5 border-r border-border px-3.5">
      <Text variant="button">{`${country} ${dialCode}`}</Text>
      <Ionicons name="chevron-down" size={16} color={colors.foregroundMuted} />
    </View>
  );
}
