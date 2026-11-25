import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

type PhonePrefixProps = {
  country?: string;
  dialCode?: string;
  showCountry?: boolean;
};

export function PhonePrefix({ country = 'CM', dialCode = '+237', showCountry = true }: PhonePrefixProps) {
  const { colors } = useTheme();

  return (
    <View className="h-full flex-row items-center gap-1.5 border-r border-border px-3.5">
      <Text variant="button">{showCountry ? `${country} ${dialCode}` : dialCode}</Text>
      <Ionicons name="chevron-down" size={16} color={colors.foregroundMuted} />
    </View>
  );
}
