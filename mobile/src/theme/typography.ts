import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  wordmarkXl: { fontFamily: fontFamily.extrabold, fontSize: 44, lineHeight: 48, letterSpacing: -2.2 },
  wordmark: { fontFamily: fontFamily.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.6 },
  display: { fontFamily: fontFamily.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 17, lineHeight: 20 },
  amount: { fontFamily: fontFamily.extrabold, fontSize: 16, lineHeight: 20 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  button: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 20 },
  label: { fontFamily: fontFamily.bold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  micro: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
