import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'secondary' | 'danger';
type Size = 'lg' | 'md' | 'sm';

export const BUTTON_VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  outline: 'border border-primary text-fg bg-raised hover:bg-primary-subtle',
  secondary: 'border border-border bg-raised text-fg hover:bg-surface',
  danger: 'bg-invalid text-white hover:opacity-90',
};

export const BUTTON_SIZES: Record<Size, string> = {
  lg: 'h-13 rounded-2xl px-6 text-base',
  md: 'h-12 rounded-2xl px-5 text-[15px]',
  sm: 'h-9 rounded-xl px-4 text-sm',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'lg', className?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40',
    BUTTON_SIZES[size],
    BUTTON_VARIANTS[variant],
    className,
  );

export function Button({
  variant = 'primary',
  size = 'lg',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading} className={buttonClass(variant, size, className)}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}
