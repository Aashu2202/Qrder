import { cn } from '@qrder/ui';
import type { HTMLAttributes } from 'react';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('shimmer rounded-md', className)}
      style={{ minHeight: 8 }}
      {...rest}
    />
  );
}

/**
 * A common "card with stats" skeleton. Used while real KPI cards are loading
 * so the layout doesn't jump.
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-24 mt-3" />
      <Skeleton className="h-3 w-20 mt-3" />
    </div>
  );
}

export function ListRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
