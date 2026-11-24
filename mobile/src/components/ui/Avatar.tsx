import { Pressable } from 'react-native';
import { Text } from './Text';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .filter((letter, index, letters) => index === 0 || index === letters.length - 1)
    .join('');

export function Avatar({ name, onPress }: { name: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={name}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full bg-primary"
    >
      <Text variant="subtitle" tone="onPrimary">
        {initialsOf(name)}
      </Text>
    </Pressable>
  );
}
