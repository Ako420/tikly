import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" };

const variants = {
  primary: "bg-action text-on-action hover:opacity-90",
  outline: "border-[1.5px] border-outline bg-transparent text-foreground hover:bg-surface",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`flex h-14 w-full shrink-0 items-center justify-center gap-3 rounded-2xl px-6 text-subtitle font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}


type ActionVariant = 'primary' | 'outline' | 'secondary' | 'danger';
type Size = 'lg' | 'md' | 'sm';

export const BUTTON_VARIANTS: Record<ActionVariant, string> = {
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

export const buttonClass = (variant: ActionVariant = 'primary', size: Size = 'lg', className?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40',
    BUTTON_SIZES[size],
    BUTTON_VARIANTS[variant],
    className,
  );

export function ActionButton({
  variant = 'primary',
  size = 'lg',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ActionVariant; size?: Size; loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading} className={buttonClass(variant, size, className)}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}
