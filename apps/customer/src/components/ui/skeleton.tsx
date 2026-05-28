import { cn } from '@qrder/ui';
import type { HTMLAttributes } from 'react';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('shimmer rounded-md', className)} style={{ minHeight: 8 }} {...rest} />
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 flex gap-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-4 w-16 mt-2" />
      </div>
      <Skeleton className="h-20 w-20 rounded-lg" />
    </div>
  );
}
