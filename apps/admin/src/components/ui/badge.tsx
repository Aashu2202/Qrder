import { cn } from '@qrder/ui';
import type { HTMLAttributes } from 'react';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

const tones: Record<Tone, string> = {
  neutral:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  brand:
    'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
  success:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger:
    'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info:
    'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  violet:
    'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'success' && 'bg-emerald-500',
            tone === 'warning' && 'bg-amber-500',
            tone === 'danger' && 'bg-red-500',
            tone === 'info' && 'bg-sky-500',
            tone === 'brand' && 'bg-brand-500',
            tone === 'violet' && 'bg-violet-500',
            tone === 'neutral' && 'bg-zinc-500',
          )}
        />
      )}
      {children}
    </span>
  );
}
