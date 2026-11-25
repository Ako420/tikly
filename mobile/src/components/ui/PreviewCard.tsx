import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ThemeScope, useTheme } from '@/theme';

const shadows = {
  light: '0px 16px 32px -12px rgba(20, 10, 69, 0.22)',
  dark: '0px 18px 40px -12px rgba(0, 0, 0, 0.45)',
};

export function PreviewCard({ children, className }: { children: ReactNode; className?: string }) {
  const { scheme } = useTheme();

  return (
    <ThemeScope
      scheme="light"
      className={cn('rounded-card bg-surface-raised', className)}
      style={{ boxShadow: shadows[scheme] }}
    >
      {children}
    </ThemeScope>
  );
}
