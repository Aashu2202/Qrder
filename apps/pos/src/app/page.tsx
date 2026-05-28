'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Bell, Sparkles, Activity, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, wsUrl, setOnAuthFailed } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useActiveBranchId } from '@/lib/branch';
import { BranchSwitcher } from '@/components/branch-switcher';
import type { TableRow, OrderListItem } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_STYLE: Record<
  string,
  { bg: string; ring: string; tone: 'success' | 'info' | 'warning' | 'violet' }
> = {
  available: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20',
    ring: 'ring-emerald-200/70 dark:ring-emerald-900/60',
    tone: 'success',
  },
  occupied: {
    bg: 'bg-gradient-to-br from-sky-50 to-blue-100/60 dark:from-sky-950/40 dark:to-blue-900/20',
    ring: 'ring-sky-200/70 dark:ring-sky-900/60',
    tone: 'info',
  },
  reserved: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20',
    ring: 'ring-amber-200/70 dark:ring-amber-900/60',
    tone: 'warning',
  },
  cleaning: {
    bg: 'bg-gradient-to-br from-violet-50 to-purple-100/60 dark:from-violet-950/40 dark:to-purple-900/20',
    ring: 'ring-violet-200/70 dark:ring-violet-900/60',
    tone: 'violet',
  },
};
const STATUS_LABEL: Record<string, string> = {
  available: 'Free',
  occupied: 'In use',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
};

export default function FloorPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s._hasHydrated);
  const clear = useAuth((s) => s.clear);
  const token = useAuth((s) => s.accessToken);
  const branchId = useActiveBranchId();
  const qc = useQueryClient();

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  useEffect(() => {
    setOnAuthFailed(() => {
      clear();
      router.replace('/login');
    });
    return () => setOnAuthFailed(null);
  }, [clear, router]);

  const tables = useQuery({
    queryKey: ['pos-tables', branchId],
    queryFn: () => apiFetch<{ items: TableRow[] }>(`/v1/tables?branchId=${branchId}`),
    enabled: !!user && !!branchId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const activeOrders = useQuery({
    queryKey: ['pos-active-orders', branchId],
    queryFn: () =>
      apiFetch<{ items: OrderListItem[] }>(`/v1/orders?activeOnly=true&branchId=${branchId}`),
    enabled: !!user && !!branchId,
    refetchInterval: 15_000,
    staleTime: 8_000,
  });

  const [waiterCalls, setWaiterCalls] = useState<Map<string, { reason: string; at: number }>>(
    new Map(),
  );

  useEffect(() => {
    if (!token) return;
    const socket = io(wsUrl, { auth: { token } });
    socket.on('table:status_changed', () =>
      qc.invalidateQueries({ queryKey: ['pos-tables'] }),
    );
    socket.on('order:placed', () => {
      qc.invalidateQueries({ queryKey: ['pos-active-orders'] });
      toast.success('New order placed', { duration: 1800 });
    });
    socket.on('order:status_changed', () =>
      qc.invalidateQueries({ queryKey: ['pos-active-orders'] }),
    );
    socket.on('table:waiter_called', (payload: { tableId: string; reason?: string }) => {
      setWaiterCalls((prev) => {
        const next = new Map(prev);
        next.set(payload.tableId, { reason: payload.reason ?? 'service', at: Date.now() });
        return next;
      });
      toast.info(`Waiter called: ${payload.reason ?? 'service'}`, { duration: 5000 });
    });
    return () => {
      socket.disconnect();
    };
  }, [token, qc]);

  useEffect(() => {
    if (waiterCalls.size === 0) return;
    const t = setInterval(() => {
      setWaiterCalls((prev) => {
        const next = new Map(prev);
        for (const [k, v] of next) {
          if (Date.now() - v.at > 60_000) next.delete(k);
        }
        return next.size === prev.size ? prev : next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [waiterCalls.size]);

  const orderByTable = useMemo(() => {
    const m = new Map<string, OrderListItem>();
    for (const o of activeOrders.data?.items ?? []) {
      if (o.tableId) m.set(o.tableId, o);
    }
    return m;
  }, [activeOrders.data?.items]);

  if (!hydrated)
    return (
      <div className="min-h-screen grid place-items-center text-sm text-zinc-500">Loading…</div>
    );
  if (!user) return null;

  const tableTotal = tables.data?.items.length ?? 0;
  const occupiedCount = (tables.data?.items ?? []).filter((t) => t.status === 'occupied').length;
  const occupancy = tableTotal > 0 ? Math.round((occupiedCount / tableTotal) * 100) : 0;
  const totalRevenue = (activeOrders.data?.items ?? []).reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/85 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/85">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">Floor</h1>
              <div className="text-[11px] text-zinc-500 truncate">
                {user.name} · {tableTotal} tables
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <StatChip
              icon={<Users size={11} />}
              label="Occupancy"
              value={`${occupancy}%`}
              tone="info"
            />
            <StatChip
              icon={<Activity size={11} />}
              label="Active"
              value={String(activeOrders.data?.items.length ?? 0)}
              tone="violet"
            />
            <StatChip
              icon={<TrendingUp size={11} />}
              label="Open bill"
              value={formatMoney(totalRevenue)}
              tone="brand"
            />
          </div>

          <div className="flex items-center gap-2">
            <BranchSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clear();
                router.replace('/login');
              }}
              leftIcon={<LogOut size={14} />}
            >
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-5 md:p-6">
        {!branchId ? (
          <div className="py-20 text-center text-sm text-zinc-500">Loading branch…</div>
        ) : tables.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : (tables.data?.items.length ?? 0) === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-zinc-500">No tables yet. Add tables from the admin app.</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            <AnimatePresence initial={false}>
              {(tables.data?.items ?? []).map((t, idx) => {
                const order = orderByTable.get(t.id);
                const style = STATUS_STYLE[t.status] ?? STATUS_STYLE.available!;
                const waiterCall = waiterCalls.get(t.id);
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.22, delay: Math.min(idx * 0.015, 0.25) }}
                    whileHover={{ y: -2 }}
                  >
                    <Link
                      href={`/table/${t.id}`}
                      className={
                        'relative block rounded-2xl ring-1 p-4 active:scale-[0.98] transition aspect-[4/3] flex flex-col justify-between ' +
                        style.bg +
                        ' ' +
                        style.ring +
                        ' shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]'
                      }
                    >
                      {waiterCall && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-lg shadow-red-500/40 pulse-soft"
                        >
                          <Bell size={10} /> {waiterCall.reason}
                        </motion.div>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
                          {t.number}
                        </div>
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-0.5 mt-1">
                          <Users size={11} /> {t.capacity}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Badge tone={style.tone} dot className="text-[10px]">
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                        {order && (
                          <div className="text-[11px] text-zinc-700 dark:text-zinc-300">
                            <div className="font-semibold tabular-nums">#{order.orderNumber}</div>
                            <div className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                              {formatMoney(order.totalAmount)}
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'info' | 'brand' | 'violet';
}) {
  const colors = {
    info: 'border-sky-200/70 bg-sky-50/60 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
    brand: 'border-brand-200/70 bg-brand-50/60 text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-300',
    violet: 'border-violet-200/70 bg-violet-50/60 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
  };
  return (
    <div className={`hidden lg:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colors[tone]}`}>
      {icon}
      <span className="opacity-70 text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
