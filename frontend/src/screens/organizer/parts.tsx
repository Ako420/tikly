import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-[18px] border border-border bg-raised', className)}>{children}</section>;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-primary-subtle', className)}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }} />
    </div>
  );
}

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-fg-secondary">We could not load {what}.</p>
      <button onClick={onRetry} className="mt-3 font-bold text-primary hover:underline">
        Try again
      </button>
    </Card>
  );
}
