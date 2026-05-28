import { cn } from '@qrder/ui';
import type { HTMLAttributes } from 'react';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('shimmer rounded-md', className)} style={{ minHeight: 8 }} {...rest} />
  );
}
