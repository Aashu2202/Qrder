'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@qrder/ui';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient' | 'plain';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', interactive, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl transition-all duration-200',
        variant === 'default' &&
          'border border-zinc-200 bg-white shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900',
        variant === 'glass' &&
          'border border-white/40 bg-white/60 backdrop-blur-xl shadow-[var(--shadow-soft)] ' +
            'dark:border-white/5 dark:bg-zinc-900/60',
        variant === 'gradient' &&
          'border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-brand-50 shadow-[var(--shadow-soft)] ' +
            'dark:border-brand-900/40 dark:from-brand-900/20 dark:via-zinc-900 dark:to-zinc-900',
        variant === 'plain' && 'bg-transparent',
        interactive &&
          'cursor-pointer hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pb-3', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-3', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100',
        className,
      )}
      {...rest}
    />
  );
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-zinc-500 dark:text-zinc-400 mt-0.5', className)}
      {...rest}
    />
  );
}
