'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { ShoppingBag, Filter, Activity, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, wsUrl } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatMoney } from '@/lib/money';
import { OrderStatus, type OrderStatus as Status } from '@qrder/shared';
import type { Order } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

const STATUS_TONE: Record<
  string,
  'warning' | 'info' | 'success' | 'violet' | 'neutral' | 'danger'
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

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  completed: 'Completed',
  rejected: 'Rejected',
  canceled: 'Canceled',
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [activeOnly, setActiveOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', activeOnly],
    queryFn: () =>
      apiFetch<{ items: Order[] }>(`/v1/orders?activeOnly=${activeOnly ? 'true' : 'false'}`),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!accessToken) return;
    const socket = io(wsUrl, { auth: { token: accessToken } });
    socket.on('order:placed', () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('New order received', { duration: 2000 });
    });
    socket.on('order:status_changed', () => qc.invalidateQueries({ queryKey: ['orders'] }));
    return () => {
      socket.disconnect();
    };
  }, [accessToken, qc]);

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      apiFetch(`/v1/orders/${id}/status`, { method: 'PATCH', json: { status } }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order marked ${STATUS_LABEL[vars.status] ?? vars.status}`);
    },
    onError: () => toast.error('Failed to update order'),
  });

  const orders = useMemo(() => data?.items ?? [], [data?.items]);
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.status, (m.get(o.status) ?? 0) + 1);
    return m;
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Live order feed across the branch"
        actions={
          <>
            <Badge tone="success" dot>
              <Activity size={10} className="animate-pulse" /> Live
            </Badge>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-zinc-700 dark:text-zinc-300">Active only</span>
            </label>
          </>
        }
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-zinc-500 inline-flex items-center gap-1 shrink-0">
          <Filter size={12} /> Status:
        </span>
        <FilterChip
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          count={orders.length}
          label="All"
        />
        {Array.from(statusCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => (
            <FilterChip
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              count={count}
              label={STATUS_LABEL[status] ?? status}
              tone={STATUS_TONE[status] ?? 'neutral'}
            />
          ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={20} />}
            title={statusFilter === 'all' ? 'No orders' : `No ${STATUS_LABEL[statusFilter]?.toLowerCase()} orders`}
            description={
              activeOnly
                ? 'New orders will appear here in real time.'
                : 'Try removing the "Active only" filter.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/70">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total</th>
                  <th className="px-4 py-2.5 font-medium">Placed</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((o, idx) => (
                    <motion.tr
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.18, delay: idx * 0.015 }}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3 font-medium tabular-nums">#{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[o.status] ?? 'neutral'} dot>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatMoney(o.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {formatRelative(o.placedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {o.status === 'placed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setStatus.mutate({ id: o.id, status: OrderStatus.ACCEPTED })
                              }
                            >
                              Accept
                            </Button>
                          )}
                          {o.status === 'ready' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setStatus.mutate({ id: o.id, status: OrderStatus.SERVED })
                              }
                              leftIcon={<Check size={12} />}
                            >
                              Serve
                            </Button>
                          )}
                          {o.status === 'served' && (
                            <Button
                              size="sm"
                              variant="gradient"
                              onClick={() =>
                                setStatus.mutate({ id: o.id, status: OrderStatus.COMPLETED })
                              }
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: 'warning' | 'info' | 'success' | 'violet' | 'neutral' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={
        'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition border ' +
        (active
          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white'
          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800')
      }
    >
      {tone && (
        <span
          className={
            'h-1.5 w-1.5 rounded-full ' +
            (tone === 'success'
              ? 'bg-emerald-500'
              : tone === 'warning'
                ? 'bg-amber-500'
                : tone === 'danger'
                  ? 'bg-red-500'
                  : tone === 'info'
                    ? 'bg-sky-500'
                    : tone === 'violet'
                      ? 'bg-violet-500'
                      : 'bg-zinc-500')
          }
        />
      )}
      {label}
      <span className={active ? 'text-white/70 dark:text-zinc-700' : 'text-zinc-400'}>{count}</span>
    </button>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}
