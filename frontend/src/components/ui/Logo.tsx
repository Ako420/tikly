import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Logo({ tone = 'dark', href = '/' }: { tone?: 'dark' | 'light'; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight', tone === 'light' ? 'text-white' : 'text-fg')}>
      <span aria-hidden className="grid size-8 -rotate-6 place-items-center rounded-[10px] bg-accent">
        <svg viewBox="0 0 24 24" width={18} height={18} fill="#140a45">
          <path d="M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4zm9 1v2h2V8zm0 3v2h2v-2zm0 3v2h2v-2z" />
        </svg>
      </span>
      tikly
    </Link>
  );
}
