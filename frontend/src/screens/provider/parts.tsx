'use client';

import Link from 'next/link';
import { useEffect, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ServiceCategory } from '@/features/provider/api';
import { cn } from '@/lib/cn';
import { useProvider } from './ProviderShell';

export const CATEGORY_ICONS: Record<ServiceCategory, IconName> = {
  hall: 'business',
  chairs: 'chair',
  canopy: 'tent',
  sound: 'speaker',
  catering: 'utensils',
  decoration: 'sparkle',
  other: 'more',
};

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-[15px] text-fg-secondary">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useProvider();
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-[15px] font-semibold">{t.providerPages.common.loadError}</p>
      <button type="button" onClick={onRetry} className={buttonClass('secondary', 'sm')}>
        {t.providerPages.common.retry}
      </button>
    </Card>
  );
}

export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-[18px] bg-raised" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, text, action }: { icon: IconName; text: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-subtle text-primary">
        <Icon name={icon} size={26} />
      </span>
      <p className="max-w-md text-[15px] text-fg-secondary">{text}</p>
      {action}
    </Card>
  );
}

export function ProfileRequired({ text }: { text?: string }) {
  const { t } = useProvider();
  return (
    <EmptyState
      icon="business"
      text={text ?? t.providerPages.common.needsProfile}
      action={
        <Link href="/provider/profile" className={buttonClass('primary', 'sm')}>
          {t.providerPages.common.goToProfile}
        </Link>
      }
    />
  );
}

type FieldProps = { label: string; hint?: string; error?: string; optional?: boolean; children: ReactNode };

export function Field({ label, hint, error, optional, children }: FieldProps) {
  const { t } = useProvider();
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-fg-secondary">
        {label}
        {optional ? <span className="font-normal text-fg-muted"> · {t.providerPages.common.optional}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-invalid">{error}</span>
      ) : hint ? (
        <span className="text-xs text-fg-secondary">{hint}</span>
      ) : null}
    </label>
  );
}

const controlClass =
  'w-full rounded-xl border border-border bg-raised px-3 text-[15px] text-fg outline-none focus:border-primary aria-invalid:border-invalid';

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(controlClass, 'h-12', className)} {...props} />
);

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(controlClass, 'h-12', className)} {...props} />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(controlClass, 'py-2.5', className)} {...props} />
);

export function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  const { t } = useProvider();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label={t.shell.closeMenu} onClick={onClose} className="absolute inset-0 bg-media/40" />
      <section role="dialog" aria-modal="true" aria-label={title} className="relative flex h-full w-full max-w-[520px] flex-col bg-raised shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.provider.bookings.detail.close}
            className="grid size-9 place-items-center rounded-full border border-border hover:bg-surface"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <div className="border-t border-border px-5 py-4">{footer}</div>
      </section>
    </div>
  );
}
