'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  badge?: ReactNode;
  variant?: 'center' | 'sheet';
  className?: string;
};

const outside = (event: PointerEvent, dialog: HTMLDialogElement) => {
  const rect = dialog.getBoundingClientRect();
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
};

export function Modal({ title, onClose, children, badge, variant = 'center', className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    const handleClose = () => onClose();
    let pressedOutside = false;
    const down = (event: PointerEvent) => {
      pressedOutside = outside(event, dialog);
    };
    const up = (event: PointerEvent) => {
      if (pressedOutside && outside(event, dialog)) dialog.close();
    };
    const fallback = !('closedBy' in HTMLDialogElement.prototype);
    dialog.addEventListener('close', handleClose);
    if (fallback) {
      dialog.addEventListener('pointerdown', down);
      dialog.addEventListener('pointerup', up);
    }
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', down);
      dialog.removeEventListener('pointerup', up);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as object)}
      className={cn(
        'flex-col bg-raised p-0 text-fg shadow-2xl open:flex',
        variant === 'sheet'
          ? 'fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-[440px]'
          : 'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-[18px]',
        className,
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <h1 id={titleId} className="text-[17px] font-extrabold">
          {title}
        </h1>
        {badge}
        <form method="dialog" className="ml-auto">
          <button aria-label="Close" className="grid size-10 place-items-center rounded-full border border-border hover:bg-surface">
            <Icon name="close" size={18} />
          </button>
        </form>
      </header>
      {children}
    </dialog>
  );
}
