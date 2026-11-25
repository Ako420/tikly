'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function TextField({ label, error, hint, type, className, ...props }: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-fg-secondary">
        {label}
      </label>
      <div
        className={cn(
          'flex h-13 items-center rounded-2xl border bg-raised px-4 transition-colors focus-within:border-2 focus-within:border-primary',
          error ? 'border-2 border-invalid' : 'border-border',
        )}
      >
        <input
          {...props}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-muted"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="text-sm font-semibold text-fg-muted hover:text-fg"
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-invalid">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
