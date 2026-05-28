'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, MessageSquare } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  orderNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
}

interface Summary {
  days: number;
  count: number;
  avgRating: number | null;
  distribution: Record<string, number>;
}

export default function FeedbackPage() {
  const list = useQuery({
    queryKey: ['feedback'],
    queryFn: () => apiFetch<{ items: FeedbackRow[] }>('/v1/feedback?limit=200'),
    staleTime: 60_000,
  });
  const summary = useQuery({
    queryKey: ['feedback-summary'],
    queryFn: () => apiFetch<Summary>('/v1/feedback/summary?days=30'),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        description="Ratings and comments customers leave after their meal"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
              Avg rating (30d)
            </div>
            {summary.isLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                  {summary.data?.avgRating ?? '—'}
                </span>
                {summary.data?.avgRating && (
                  <span className="text-sm text-zinc-500">/ 5</span>
                )}
              </div>
            )}
            {summary.data && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                {summary.data.avgRating && (
                  <span className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={11}
                        fill={i < Math.round(summary.data!.avgRating!) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </span>
                )}
                <span>{summary.data.count} responses</span>
              </div>
            )}
          </div>
        </Card>
        <Card className="sm:col-span-2">
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
              Distribution (30d)
            </div>
            {summary.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
            ) : summary.data ? (
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star, i) => {
                  const count = summary.data!.distribution[String(star)] ?? 0;
                  const max = Math.max(1, ...Object.values(summary.data!.distribution));
                  const widthPct = (count / max) * 100;
                  return (
                    <motion.div
                      key={star}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 text-xs"
                    >
                      <span className="w-10 inline-flex items-center gap-0.5 text-amber-500 font-medium">
                        {star} <Star size={10} fill="currentColor" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 0.5, delay: 0.1 + i * 0.04 }}
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums font-medium">{count}</span>
                    </motion.div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <Card>
        {list.isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : (list.data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={20} />}
            title="No feedback yet"
            description="Diners are prompted on the order tracking page after their food is served."
          />
        ) : (
          <ul>
            {(list.data?.items ?? []).map((f, idx) => (
              <motion.li
                key={f.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.01 }}
                className="px-5 py-3.5 border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < f.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    {f.orderNumber && (
                      <span className="text-xs text-zinc-500 tabular-nums">#{f.orderNumber}</span>
                    )}
                    {f.customerName && (
                      <span className="text-xs text-zinc-500">· {f.customerName}</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(f.createdAt).toLocaleString()}
                  </div>
                </div>
                {f.comment && (
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {f.comment}
                  </p>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
