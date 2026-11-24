import { Pressable } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from './Text';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .filter((letter, index, letters) => index === 0 || index === letters.length - 1)
    .join('');

const sizeClass = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-[60px] w-[60px]' } as const;
const textVariant = { sm: 'label', md: 'subtitle', lg: 'sectionTitle' } as const;

type AvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
};

export function Avatar({ name, size = 'md', onPress }: AvatarProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={name}
      onPress={onPress}
      disabled={!onPress}
      className={cn('shrink-0 items-center justify-center rounded-full bg-primary', sizeClass[size])}
    >
      <Text variant={textVariant[size]} tone="onPrimary">
        {initialsOf(name)}
      </Text>
    </Pressable>
  );
}
