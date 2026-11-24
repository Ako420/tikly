import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { cn } from '@/lib/cn';
import { typography, type TypographyVariant } from '@/theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'onAction'
  | 'onPrimary'
  | 'onAccent'
  | 'onMedia'
  | 'inverse'
  | 'valid'
  | 'warning'
  | 'invalid';

const toneClass: Record<TextTone, string> = {
  primary: 'text-foreground',
  secondary: 'text-foreground-secondary',
  muted: 'text-foreground-muted',
  accent: 'text-accent-text',
  onAction: 'text-on-action',
  onPrimary: 'text-on-primary',
  onAccent: 'text-on-accent',
  onMedia: 'text-on-media',
  inverse: 'text-background',
  valid: 'text-valid',
  warning: 'text-warning',
  invalid: 'text-invalid',
};

export type TextProps = NativeTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  className?: string;
};

export function Text({ variant = 'body', tone = 'primary', className, style, ...props }: TextProps) {
  return <NativeText className={cn(toneClass[tone], className)} style={[typography[variant], style]} {...props} />;
}
