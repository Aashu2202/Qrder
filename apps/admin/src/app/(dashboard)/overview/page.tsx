'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Armchair,
  ArrowUpRight,
  Flame,
  Activity,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useActiveBranchId } from '@/lib/branch';
import { formatMoney } from '@/lib/money';
import type { TableRow } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton, StatCardSkeleton } from '@/components/ui/skeleton';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PageHeader } from '@/components/ui/page-header';

interface Summary {
  range: string;
  revenue: number;
  completedOrders: number;
  avgTicket: number;
  byStatus: Record<string, number>;
}
interface TopItem {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

const STATUS_TONES: Record<
  string,
  'info' | 'warning' | 'success' | 'neutral' | 'danger' | 'violet'
> = {
  placed: 'warning',
  accepted: 'info',
  preparing: 'info',
  ready: 'success',
  served: 'violet',
  completed: 'neutral',
  rejected: 'danger',
  canceled: 'danger',
};

export default function OverviewPage() {
  const branchId = useActiveBranchId();
  const branchQs = branchId ? `&branchId=${branchId}` : '';

  const today = useQuery({
    queryKey: ['analytics-summary', 'today', branchId],
    queryFn: () => apiFetch<Summary>(`/v1/analytics/summary?range=today${branchQs}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const week = useQuery({
    queryKey: ['analytics-summary', '7d', branchId],
    queryFn: () => apiFetch<Summary>(`/v1/analytics/summary?range=7d${branchQs}`),
    staleTime: 60_000,
  });
  const topItems = useQuery({
    queryKey: ['analytics-top', 'today', branchId],
    queryFn: () =>
      apiFetch<{ items: TopItem[] }>(`/v1/analytics/top-items?range=today&limit=5${branchQs}`),
    staleTime: 60_000,
  });
  const tables = useQuery({
    queryKey: ['tables', branchId],
    queryFn: () => apiFetch<{ items: TableRow[] }>(`/v1/tables?branchId=${branchId}`),
    enabled: !!branchId,
    staleTime: 30_000,
  });

  const tableTotal = tables.data?.items.length ?? 0;
  const tablesOccupied = (tables.data?.items ?? []).filter((t) => t.status === 'occupied').length;
  const occupancyPct = tableTotal > 0 ? Math.round((tablesOccupied / tableTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Today at a glance — auto-refreshes every minute"
        actions={
          <Badge tone="success" dot className="text-xs">
            <Activity size={10} className="animate-pulse" /> Live
          </Badge>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {today.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              tone="brand"
              icon={<TrendingUp size={16} />}
              label="Revenue today"
              value={today.data?.revenue ?? 0}
              format={(n) => formatMoney(Math.round(n))}
              hint={week.data ? `${formatMoney(week.data.revenue)} past 7 days` : ''}
            />
            <KpiCard
              tone="violet"
              icon={<ShoppingBag size={16} />}
              label="Completed orders"
              value={today.data?.completedOrders ?? 0}
              hint={`${week.data?.completedOrders ?? 0} past 7 days`}
            />
            <KpiCard
              tone="emerald"
              icon={<Receipt size={16} />}
              label="Avg ticket"
              value={today.data?.avgTicket ?? 0}
              format={(n) => formatMoney(Math.round(n))}
              hint={today.data?.completedOrders ? 'Today' : 'No orders yet'}
            />
            <KpiCard
              tone="sky"
              icon={<Armchair size={16} />}
              label="Tables occupied"
              value={tablesOccupied}
              format={(n) => `${Math.round(n)} / ${tableTotal}`}
              hint={tableTotal === 0 ? 'No tables yet' : `${occupancyPct}% occupancy`}
            />
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Today by status
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">All orders placed today</p>
              </div>
              <Badge tone="neutral">
                {today.data
                  ? Object.values(today.data.byStatus).reduce((a, b) => a + b, 0)
                  : 0}
              </Badge>
            </div>
            {today.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5" />
                ))}
              </div>
            ) : today.data && Object.keys(today.data.byStatus).length > 0 ? (
              <ul className="space-y-1.5">
                {Object.entries(today.data.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count], i) => {
                    const total = Object.values(today.data!.byStatus).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <motion.li
                        key={status}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 text-sm"
                      >
                        <Badge
                          tone={STATUS_TONES[status] ?? 'neutral'}
                          dot
                          className="capitalize w-24 justify-start"
                        >
                          {status}
                        </Badge>
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: 0.1 + i * 0.04 }}
                            className="h-full bg-brand-500 rounded-full"
                          />
                        </div>
                        <span className="w-8 text-right tabular-nums font-medium">{count}</span>
                      </motion.li>
                    );
                  })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 py-4 text-center">No orders today yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Flame size={14} className="text-brand-500" />
                  Top sellers
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">By quantity, today</p>
              </div>
              <a
                href="/analytics"
                className="text-xs text-zinc-500 hover:text-brand-700 inline-flex items-center gap-0.5"
              >
                Analytics <ArrowUpRight size={11} />
              </a>
            </div>
            {topItems.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5" />
                ))}
              </div>
            ) : topItems.data && topItems.data.items.length > 0 ? (
              <ol className="space-y-1.5">
                {topItems.data.items.map((it, i) => (
                  <motion.li
                    key={it.menuItemId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid h-5 w-5 place-items-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate">{it.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 shrink-0">
                      <span>{it.quantity} sold</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatMoney(it.revenue)}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-zinc-500 py-4 text-center">No completed orders yet.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

const KPI_TONE: Record<string, { gradient: string; icon: string; ring: string }> = {
  brand: {
    gradient: 'from-brand-500/15 to-amber-300/10',
    icon: 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
    ring: 'ring-brand-500/20',
  },
  violet: {
    gradient: 'from-violet-500/15 to-fuchsia-400/10',
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    ring: 'ring-violet-500/20',
  },
  emerald: {
    gradient: 'from-emerald-500/15 to-teal-400/10',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500/20',
  },
  sky: {
    gradient: 'from-sky-500/15 to-cyan-400/10',
    icon: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
    ring: 'ring-sky-500/20',
  },
};

function KpiCard({
  tone,
  icon,
  label,
  value,
  format,
  hint,
}: {
  tone: keyof typeof KPI_TONE;
  icon: React.ReactNode;
  label: string;
  value: number;
  format?: (n: number) => string;
  hint?: string;
}) {
  const t = KPI_TONE[tone]!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-xl border border-zinc-200/60 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-zinc-800/60 dark:bg-zinc-900 ring-1 ${t.ring}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-60`}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${t.icon}`}>{icon}</span>
        </div>
        <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          <AnimatedCounter value={value} format={format} />
        </div>
        {hint && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>}
      </div>
    </motion.div>
  );
}
