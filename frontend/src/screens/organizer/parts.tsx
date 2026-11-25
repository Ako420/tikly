import type { ReactNode } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { PageMeta } from '@/lib/http/client';
import { cn } from '@/lib/cn';
import { formatAmount } from '@/lib/money';

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

export function Pager({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.total, meta.page * meta.limit);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm sm:px-6">
      <p className="text-fg-secondary">
        {formatAmount(first)}–{formatAmount(last)} of {formatAmount(meta.total)}
      </p>
      {meta.pages > 1 && (
        <div className="flex gap-2">
          <button
            onClick={() => onPage(meta.page - 1)}
            disabled={meta.page <= 1}
            aria-label="Previous page"
            className={buttonClass('secondary', 'sm', 'px-3')}
          >
            <Icon name="back" size={16} />
          </button>
          <button
            onClick={() => onPage(meta.page + 1)}
            disabled={meta.page >= meta.pages}
            aria-label="Next page"
            className={buttonClass('secondary', 'sm', 'px-3')}
          >
            <Icon name="chevron" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
