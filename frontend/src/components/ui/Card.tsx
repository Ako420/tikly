import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-[18px] border border-border bg-raised', className)}>{children}</section>;
}
