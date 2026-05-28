'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@qrder/ui';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'gradient';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100',
  gradient:
    'text-white shadow-md hover:shadow-lg ' +
    'bg-[linear-gradient(135deg,#fb923c_0%,#ea580c_100%)] ' +
    'hover:bg-[linear-gradient(135deg,#fb923c_0%,#c2410c_100%)] dark:glow-brand',
  secondary:
    'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
  outline:
    'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 ' +
    'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  ghost: 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-11 w-11 p-0',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : leftIcon ? (
        <span className="inline-flex">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon ? <span className="inline-flex">{rightIcon}</span> : null}
    </button>
  );
});
