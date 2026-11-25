import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const TONES = {
  valid: 'bg-valid text-white',
  warning: 'bg-warning text-white',
  invalid: 'bg-invalid text-white',
  neutral: 'bg-surface text-fg-secondary border border-border',
  primary: 'bg-primary-subtle text-primary',
} as const;

export type PillTone = keyof typeof TONES;

export function StatusPill({ tone, children, className }: { tone: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-[13px] font-bold whitespace-nowrap', TONES[tone], className)}>
      {children}
    </span>
  );
}
