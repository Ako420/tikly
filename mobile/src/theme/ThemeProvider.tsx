import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useColorScheme, vars } from 'nativewind';
import { semanticColors, toCssVariables, type ColorScheme, type SemanticColors } from './colors';

type ThemeValue = {
  scheme: ColorScheme;
  colors: SemanticColors;
};

const themeVariables = {
  light: vars(toCssVariables(semanticColors.light)),
  dark: vars(toCssVariables(semanticColors.dark)),
};

const ThemeContext = createContext<ThemeValue>({ scheme: 'light', colors: semanticColors.light });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const scheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const value = useMemo(() => ({ scheme, colors: semanticColors[scheme] }), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables[scheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

type ThemeScopeProps = ViewProps & {
  scheme: ColorScheme;
  className?: string;
};

export function ThemeScope({ scheme, style, ...props }: ThemeScopeProps) {
  const value = useMemo(() => ({ scheme, colors: semanticColors[scheme] }), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[themeVariables[scheme], style]} {...props} />
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
