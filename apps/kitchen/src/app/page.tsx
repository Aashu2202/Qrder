'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, LogOut, Flame, CheckCircle2, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';
import { apiFetch, wsUrl, setOnAuthFailed } from '@/lib/api';
import { OrderItemStatus, type OrderItemStatus as Status } from '@qrder/shared';

interface QueueItem {
  id: string;
  menuItemId: string;
  nameSnapshot: string;
  quantity: number;
  status: Status;
  cookingNotes: string | null;
  stationId: string | null;
}
interface QueueOrder {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: string;
  tableId: string | null;
  items: QueueItem[];
}

export default function KdsBoardPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.accessToken);
  const hydrated = useAuth((s) => s._hasHydrated);
  const clear = useAuth((s) => s.clear);
  const branchId = user?.branchId;
  const queryClient = useQueryClient();

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

  const { data, isLoading } = useQuery({
    queryKey: ['kds-queue', branchId],
    queryFn: () =>
      apiFetch<{ items: QueueOrder[] }>(
        `/v1/kitchen/queue${branchId ? `?branchId=${branchId}` : ''}`,
      ),
    enabled: !!user,
    refetchInterval: 15_000,
    staleTime: 8_000,
  });

  useEffect(() => {
    if (!token) return;
    const socket = io(wsUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('order:placed', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-queue'] });
      toast.success('New order received', { duration: 1800 });
    });
    socket.on('order:status_changed', () =>
      queryClient.invalidateQueries({ queryKey: ['kds-queue'] }),
    );
    socket.on('order:item_status_changed', () =>
      queryClient.invalidateQueries({ queryKey: ['kds-queue'] }),
    );
    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  const setItemStatus = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: Status }) =>
      apiFetch(`/v1/kitchen/items/${itemId}`, { method: 'PATCH', json: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kds-queue'] }),
  });

  const orders = useMemo(() => data?.items ?? [], [data?.items]);

  // Stats
  const stats = useMemo(() => {
    let urgent = 0;
    let cooking = 0;
    let ready = 0;
    for (const o of orders) {
      const age = ageMinutes(o.placedAt);
      if (age >= 10) urgent++;
      for (const it of o.items) {
        if (it.status === OrderItemStatus.PREPARING) cooking++;
        if (it.status === OrderItemStatus.READY) ready++;
      }
    }
    return { urgent, cooking, ready };
  }, [orders]);

  if (!hydrated) {
    return (
      <div className="min-h-screen grid place-items-center text-sm" style={{ color: 'var(--color-kds-muted)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 border-b px-6 py-3.5 flex items-center justify-between backdrop-blur-md"
        style={{
          borderColor: 'var(--color-kds-border)',
          background: 'rgb(11 11 14 / 0.85)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/30">
            <ChefHat size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Kitchen Display</h1>
            <div className="text-[11px]" style={{ color: 'var(--color-kds-muted)' }}>
              {user.name} · {orders.length} active order{orders.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <StatPill icon={<AlertTriangle size={12} />} label="Urgent" value={stats.urgent} color="late" />
          <StatPill icon={<Flame size={12} />} label="Cooking" value={stats.cooking} color="warn" />
          <StatPill icon={<CheckCircle2 size={12} />} label="Ready" value={stats.ready} color="fresh" />
        </div>

        <button
          onClick={() => {
            useAuth.getState().clear();
            router.replace('/login');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-white/5 transition"
          style={{ borderColor: 'var(--color-kds-border)' }}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <main className="p-4 md:p-6">
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 shimmer h-48"
                style={{ background: 'var(--color-kds-card)' }}
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 grid place-items-center text-emerald-400 mb-4"
            >
              <CheckCircle2 size={28} />
            </motion.div>
            <h2 className="text-xl font-semibold tracking-tight mb-1">All caught up</h2>
            <p className="text-sm" style={{ color: 'var(--color-kds-muted)' }}>
              New orders will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onItemStatus={(itemId, status) => setItemStatus.mutate({ itemId, status })}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'late' | 'warn' | 'fresh';
}) {
  const colors = {
    late: { bg: 'rgb(239 68 68 / 0.12)', border: 'rgb(239 68 68 / 0.3)', text: '#fca5a5' },
    warn: { bg: 'rgb(245 158 11 / 0.12)', border: 'rgb(245 158 11 / 0.3)', text: '#fcd34d' },
    fresh: { bg: 'rgb(34 197 94 / 0.12)', border: 'rgb(34 197 94 / 0.3)', text: '#86efac' },
  };
  const c = colors[color];
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
    >
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}

function ageMinutes(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function OrderCard({
  order,
  onItemStatus,
}: {
  order: QueueOrder;
  onItemStatus: (itemId: string, status: Status) => void;
}) {
  const age = ageMinutes(order.placedAt);
  const urgent = age >= 10;
  const warn = age >= 5 && !urgent;

  const accent = urgent
    ? 'var(--color-kds-late)'
    : warn
      ? 'var(--color-kds-warn)'
      : 'var(--color-kds-fresh)';

  const accentBg = urgent
    ? 'rgb(239 68 68 / 0.06)'
    : warn
      ? 'rgb(245 158 11 / 0.05)'
      : 'rgb(34 197 94 / 0.04)';

  const next = (s: Status): Status =>
    s === OrderItemStatus.PENDING
      ? OrderItemStatus.PREPARING
      : s === OrderItemStatus.PREPARING
        ? OrderItemStatus.READY
        : OrderItemStatus.READY;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className={'rounded-2xl overflow-hidden ' + (urgent ? 'pulse-urgent' : '')}
      style={{
        background: 'var(--color-kds-card)',
        borderColor: accent,
        borderWidth: 2,
        borderStyle: 'solid',
      }}
    >
      <header
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: accentBg, borderBottom: `1px solid ${accent}` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tabular-nums">#{order.orderNumber}</span>
          {urgent && <Flame size={14} style={{ color: accent }} className="pulse-soft" />}
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold tabular-nums" style={{ color: accent }}>
          <Clock size={11} />
          {age}m
        </div>
      </header>

      <ul className="p-3 space-y-2">
        {order.items.map((it) => (
          <motion.li
            key={it.id}
            layout
            whileTap={{ scale: 0.98 }}
            className="rounded-xl px-3 py-2.5 cursor-pointer transition active:scale-[0.99]"
            style={{ background: 'var(--color-kds-card-elevated)' }}
            onClick={() => onItemStatus(it.id, next(it.status))}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold flex-1 min-w-0">
                <span
                  className="inline-grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold mr-2 align-middle"
                  style={{
                    background: 'rgb(255 255 255 / 0.08)',
                    color: 'var(--color-kds-text)',
                  }}
                >
                  {it.quantity}
                </span>
                <span className="align-middle">{it.nameSnapshot}</span>
              </div>
              <ItemStatusBadge status={it.status} />
            </div>
            {it.cookingNotes && (
              <div
                className="mt-1.5 ml-8 text-xs italic px-2 py-1 rounded-md"
                style={{
                  color: '#fcd34d',
                  background: 'rgb(245 158 11 / 0.1)',
                  borderLeft: '2px solid #f59e0b',
                }}
              >
                “{it.cookingNotes}”
              </div>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function ItemStatusBadge({ status }: { status: Status }) {
  const map: Record<
    Status,
    { label: string; bg: string; fg: string; icon: React.ReactNode }
  > = {
    pending: {
      label: 'Pending',
      bg: 'rgb(113 113 122 / 0.2)',
      fg: '#d4d4d8',
      icon: <Clock size={10} />,
    },
    preparing: {
      label: 'Cooking',
      bg: 'rgb(245 158 11 / 0.18)',
      fg: '#fcd34d',
      icon: <Flame size={10} />,
    },
    ready: {
      label: 'Ready',
      bg: 'rgb(34 197 94 / 0.2)',
      fg: '#86efac',
      icon: <CheckCircle2 size={10} />,
    },
    served: {
      label: 'Served',
      bg: 'rgb(168 85 247 / 0.18)',
      fg: '#d8b4fe',
      icon: <CheckCircle2 size={10} />,
    },
  };
  const s = map[status];
  return (
    <motion.span
      key={status}
      initial={{ scale: 0.85 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400 }}
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full shrink-0"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.icon}
      {s.label}
    </motion.span>
  );
}
