import { palette } from './palette';

export type ColorScheme = 'light' | 'dark';

export type SemanticColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderSubtle: string;
  outline: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  accent: string;
  onAccent: string;
  accentText: string;
  primary: string;
  onPrimary: string;
  action: string;
  onAction: string;
  media: string;
  onMedia: string;
  valid: string;
  warning: string;
  invalid: string;
  danger: string;
  onDanger: string;
};

export const semanticColors: Record<ColorScheme, SemanticColors> = {
  light: {
    background: palette.white,
    surface: palette.violet50,
    surfaceRaised: palette.white,
    border: palette.line200,
    borderSubtle: palette.line200,
    outline: palette.violet600,
    foreground: palette.ink900,
    foregroundSecondary: palette.ink600,
    foregroundMuted: palette.ink400,
    accent: palette.amber400,
    onAccent: palette.violet950,
    accentText: palette.violet600,
    primary: palette.violet600,
    onPrimary: palette.white,
    action: palette.violet600,
    onAction: palette.white,
    media: palette.violet950,
    onMedia: palette.white,
    valid: palette.green600,
    warning: palette.orange500,
    invalid: palette.red600,
    danger: palette.red600,
    onDanger: palette.white,
  },
  dark: {
    background: palette.violet950,
    surface: palette.violet900,
    surfaceRaised: palette.violet900,
    border: palette.violet700,
    borderSubtle: palette.violet800,
    outline: palette.violet100,
    foreground: palette.white,
    foregroundSecondary: palette.violet100,
    foregroundMuted: palette.violet300,
    accent: palette.amber400,
    onAccent: palette.violet950,
    accentText: palette.amber400,
    primary: palette.violet600,
    onPrimary: palette.white,
    action: palette.amber400,
    onAction: palette.violet950,
    media: palette.violet950,
    onMedia: palette.white,
    valid: palette.green400,
    warning: palette.orange500,
    invalid: palette.red400,
    danger: palette.red600,
    onDanger: palette.white,
  },
};

const toKebab = (value: string) => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const toChannels = (hex: string) => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

export const withAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')}`;

export const toCssVariables = (colors: SemanticColors) =>
  Object.fromEntries(
    Object.entries(colors).map(([key, hex]) => [`--color-${toKebab(key)}`, toChannels(hex)]),
  );
