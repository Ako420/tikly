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
  resultTitle: { fontFamily: fontFamily.extrabold, fontSize: 52, lineHeight: 58, letterSpacing: -1.3 },
  display: { fontFamily: fontFamily.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
  headline: { fontFamily: fontFamily.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7 },
  sectionTitle: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
  titleLg: { fontFamily: fontFamily.extrabold, fontSize: 19, lineHeight: 23 },
  dateDayLg: { fontFamily: fontFamily.extrabold, fontSize: 24, lineHeight: 26 },
  ticketCode: { fontFamily: fontFamily.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: 2 },
  dateDay: { fontFamily: fontFamily.extrabold, fontSize: 18, lineHeight: 20 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 17, lineHeight: 20 },
  subtitle: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20 },
  subheading: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22 },
  amount: { fontFamily: fontFamily.extrabold, fontSize: 16, lineHeight: 20 },
  amountLg: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26 },
  itemTitle: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  bodySmStrong: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20 },
  link: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 20 },
  input: { fontFamily: fontFamily.regular, fontSize: 16 },
  button: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 20 },
  label: { fontFamily: fontFamily.bold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  captionSm: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
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
  tag: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16 },
  tagStrong: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
