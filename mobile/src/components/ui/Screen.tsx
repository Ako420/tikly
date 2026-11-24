import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  className?: string;
  edges?: ('top' | 'bottom')[];
};

export function Screen({ children, className, edges = ['top', 'bottom'] }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();

  return (
    <View
      className={cn('flex-1 bg-background', className)}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      }}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}
