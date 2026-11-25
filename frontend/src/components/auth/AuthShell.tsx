import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

export function AuthShell({ eyebrow, title, subtitle, children, footer }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh flex-1 bg-background lg:grid-cols-[640px_1fr]">
      <aside className="relative hidden overflow-hidden bg-media p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#4a2bd9_0,transparent_55%),radial-gradient(circle_at_80%_70%,#211366_0,transparent_60%)]" />
        <div className="relative">
          <Logo tone="light" />
        </div>
        <div className="relative max-w-lg">
          <p className="text-xs font-bold tracking-widest text-accent uppercase">For organizers, providers and admins</p>
          <p className="mt-3 text-5xl leading-tight font-extrabold tracking-tight">Plan it, sell it, run the gate.</p>
          <p className="mt-4 text-lg text-on-media-muted">
            Budgets, tickets, staff and Mobile Money payouts for events across the CEMAC region, in one place.
          </p>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <p className="text-xs font-bold tracking-widest text-primary uppercase">{eyebrow}</p>
          <h1 className="mt-2 text-[32px] leading-tight font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-[15px] text-fg-secondary">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-fg-secondary">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
