'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Receipt,
  Tag,
  ArrowRightLeft,
  Split,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, wsUrl, setOnAuthFailed, apiBase } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useActiveBranchId } from '@/lib/branch';
import { formatMoney } from '@/lib/money';
import type { Order, OrderListItem, TableRow } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuDrawer } from './menu-drawer';
import { DiscountDialog } from './discount-dialog';
import { TransferDialog } from './transfer-dialog';
import { SplitDialog } from './split-dialog';
import { SettleDialog } from './settle-dialog';

interface Props {
  params: Promise<{ id: string }>;
}

const ITEM_STATUS_TONE: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'violet'> = {
  pending: 'neutral',
  preparing: 'warning',
  ready: 'success',
  served: 'violet',
};

export default function TableWorkspacePage({ params }: Props) {
  const { id: tableId } = use(params);
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s._hasHydrated);
  const clear = useAuth((s) => s.clear);
  const token = useAuth((s) => s.accessToken);
  const branchId = useActiveBranchId();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);

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

  const orders = useQuery({
    queryKey: ['pos-active-orders', branchId],
    queryFn: () =>
      apiFetch<{ items: OrderListItem[] }>(`/v1/orders?activeOnly=true&branchId=${branchId}`),
    enabled: !!user && !!branchId,
    staleTime: 8_000,
  });

  const tables = useQuery({
    queryKey: ['pos-tables', branchId],
    queryFn: () => apiFetch<{ items: TableRow[] }>(`/v1/tables?branchId=${branchId}`),
    enabled: !!user && !!branchId,
    staleTime: 15_000,
  });

  const tableInfo = tables.data?.items.find((t) => t.id === tableId);
  const activeOrder = orders.data?.items.find((o) => o.tableId === tableId);

  const orderDetail = useQuery({
    queryKey: ['pos-order', activeOrder?.id],
    queryFn: () => apiFetch<Order>(`/v1/orders/${activeOrder!.id}`),
    enabled: !!activeOrder,
    refetchInterval: 15_000,
    staleTime: 8_000,
  });

  useEffect(() => {
    if (!token) return;
    const socket = io(wsUrl, { auth: { token } });
    socket.on('order:placed', () => {
      qc.invalidateQueries({ queryKey: ['pos-active-orders'] });
      qc.invalidateQueries({ queryKey: ['pos-order'] });
    });
    socket.on('order:status_changed', () => {
      qc.invalidateQueries({ queryKey: ['pos-active-orders'] });
      qc.invalidateQueries({ queryKey: ['pos-order'] });
    });
    socket.on('order:item_status_changed', () =>
      qc.invalidateQueries({ queryKey: ['pos-order'] }),
    );
    socket.on('table:status_changed', () => qc.invalidateQueries({ queryKey: ['pos-tables'] }));
    return () => {
      socket.disconnect();
    };
  }, [token, qc]);

  const createOrder = useMutation({
    mutationFn: (items: Array<{ menuItemId: string; quantity: number; modifierIds: string[] }>) =>
      apiFetch<Order>(`/v1/orders?branchId=${branchId}&tableId=${tableId}`, {
        method: 'POST',
        json: { items },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-active-orders'] });
      toast.success('Order created');
      setMenuOpen(false);
    },
    onError: () => toast.error('Failed to create order'),
  });

  const addItems = useMutation({
    mutationFn: (items: Array<{ menuItemId: string; quantity: number; modifierIds: string[] }>) =>
      apiFetch<Order>(`/v1/orders/${activeOrder!.id}/items`, {
        method: 'POST',
        json: { items },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-order'] });
      toast.success('Items added');
      setMenuOpen(false);
    },
    onError: () => toast.error('Failed to add items'),
  });

  const markAvailable = useMutation({
    mutationFn: () =>
      apiFetch(`/v1/tables/${tableId}/status`, { method: 'PATCH', json: { status: 'available' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      toast.success('Table available');
    },
  });

  const downloadInvoice = async () => {
    if (!orderDetail.data || !token) return;
    const res = await fetch(`${apiBase}/v1/orders/${orderDetail.data.id}/invoice.pdf`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast.error('Invoice not available yet');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (!hydrated)
    return (
      <div className="min-h-screen grid place-items-center text-sm text-zinc-500">Loading…</div>
    );
  if (!user) return null;

  const isCleaning = tableInfo?.status === 'cleaning';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/85 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/85">
        <div className="px-5 py-3 flex items-center gap-3 max-w-5xl mx-auto w-full">
          <Link
            href="/"
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
                Table {tableInfo?.number ?? '…'}
              </h1>
              {tableInfo && (
                <Badge
                  tone={
                    tableInfo.status === 'occupied'
                      ? 'info'
                      : tableInfo.status === 'available'
                        ? 'success'
                        : tableInfo.status === 'reserved'
                          ? 'warning'
                          : 'violet'
                  }
                  dot
                >
                  {tableInfo.status}
                </Badge>
              )}
            </div>
            {orderDetail.data ? (
              <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                #{orderDetail.data.orderNumber} · {orderDetail.data.status} ·{' '}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {formatMoney(orderDetail.data.totalAmount)}
                </span>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 mt-0.5">
                {isCleaning ? 'Cleaning' : 'No active order'}
              </div>
            )}
          </div>
          {!orderDetail.data && isCleaning && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAvailable.mutate()}
              loading={markAvailable.isPending}
              leftIcon={<CheckCircle2 size={14} />}
            >
              Mark available
            </Button>
          )}
          <Button
            variant="gradient"
            size="md"
            onClick={() => setMenuOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            {orderDetail.data ? 'Add items' : 'Start order'}
          </Button>
        </div>
      </header>

      <main className="flex-1 p-5 md:p-6 space-y-4 max-w-3xl w-full mx-auto">
        {orderDetail.isLoading && activeOrder ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        ) : orderDetail.data ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt size={14} className="text-zinc-500" />
                  <h2 className="text-sm font-semibold tracking-tight">Items</h2>
                </div>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {orderDetail.data.items.length} items
                </span>
              </div>
              <ul className="space-y-2.5">
                {orderDetail.data.items.map((it, idx) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex justify-between items-baseline text-sm border-b border-zinc-100 last:border-0 pb-2.5 last:pb-0 dark:border-zinc-800"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        <span className="tabular-nums">{it.quantity}×</span> {it.nameSnapshot}
                      </div>
                      {it.cookingNotes && (
                        <div className="text-xs italic mt-0.5 text-zinc-500">
                          {it.cookingNotes}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <div className="font-medium tabular-nums">{formatMoney(it.lineTotal)}</div>
                      <div className="mt-0.5">
                        <Badge tone={ITEM_STATUS_TONE[it.status] ?? 'neutral'} dot>
                          {it.status}
                        </Badge>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
              <div className="border-t border-zinc-200 dark:border-zinc-800 mt-3 pt-3 space-y-1 text-sm">
                <Row label="Subtotal" value={formatMoney(orderDetail.data.subtotal)} />
                {orderDetail.data.discountAmount > 0 && (
                  <Row
                    label="Discount"
                    value={`− ${formatMoney(orderDetail.data.discountAmount)}`}
                    tone="success"
                  />
                )}
                <Row label="Tax" value={formatMoney(orderDetail.data.taxAmount)} />
                <Row label="Total" value={formatMoney(orderDetail.data.totalAmount)} bold />
              </div>
            </motion.section>

            <section className="grid grid-cols-5 gap-2">
              <ActionButton
                icon={<Receipt size={18} />}
                label="Bill"
                onClick={downloadInvoice}
                tone="neutral"
              />
              <ActionButton
                icon={<Wallet size={18} />}
                label="Settle"
                onClick={() => setSettleOpen(true)}
                tone="brand"
              />
              <ActionButton
                icon={<Tag size={18} />}
                label="Discount"
                onClick={() => setDiscountOpen(true)}
                tone="neutral"
              />
              <ActionButton
                icon={<ArrowRightLeft size={18} />}
                label="Transfer"
                onClick={() => setTransferOpen(true)}
                tone="neutral"
              />
              <ActionButton
                icon={<Split size={18} />}
                label="Split"
                onClick={() => setSplitOpen(true)}
                tone="neutral"
              />
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-100 grid place-items-center text-zinc-400 mb-3 dark:bg-zinc-800">
              <Receipt size={20} />
            </div>
            <p className="text-sm text-zinc-500">No active order for this table.</p>
            <p className="text-xs text-zinc-400 mt-1">
              Tap <span className="font-medium text-zinc-700 dark:text-zinc-300">Start order</span> above.
            </p>
          </div>
        )}
      </main>

      {menuOpen && (
        <MenuDrawer
          mode={orderDetail.data ? 'add' : 'create'}
          submitting={createOrder.isPending || addItems.isPending}
          onClose={() => setMenuOpen(false)}
          onSubmit={(items) =>
            orderDetail.data ? addItems.mutate(items) : createOrder.mutate(items)
          }
        />
      )}
      {discountOpen && orderDetail.data && (
        <DiscountDialog
          orderId={orderDetail.data.id}
          onClose={() => setDiscountOpen(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['pos-order'] })}
        />
      )}
      {transferOpen && orderDetail.data && (
        <TransferDialog
          orderId={orderDetail.data.id}
          currentTableId={tableId}
          onClose={() => setTransferOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['pos-order'] });
            qc.invalidateQueries({ queryKey: ['pos-tables'] });
            qc.invalidateQueries({ queryKey: ['pos-active-orders'] });
            router.push('/');
          }}
        />
      )}
      {splitOpen && orderDetail.data && (
        <SplitDialog
          order={orderDetail.data}
          onClose={() => setSplitOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['pos-order'] });
            qc.invalidateQueries({ queryKey: ['pos-active-orders'] });
          }}
        />
      )}
      {settleOpen && orderDetail.data && (
        <SettleDialog
          order={orderDetail.data}
          onClose={() => setSettleOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['pos-order'] });
            qc.invalidateQueries({ queryKey: ['pos-active-orders'] });
            qc.invalidateQueries({ queryKey: ['pos-tables'] });
          }}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: 'success';
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}>
        {label}
      </span>
      <span
        className={
          'tabular-nums ' +
          (bold ? 'font-bold text-base' : '') +
          (tone === 'success' ? ' text-emerald-600 dark:text-emerald-400' : '')
        }
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'brand' | 'neutral';
}) {
  const isBrand = tone === 'brand';
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={
        'rounded-xl py-3 text-xs font-semibold flex flex-col items-center gap-1 transition disabled:opacity-40 ' +
        (isBrand
          ? 'text-white shadow-md bg-gradient-to-br from-brand-500 to-brand-600 hover:shadow-lg hover:from-brand-500 hover:to-brand-700 dark:glow-brand'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800')
      }
    >
      {icon}
      {label}
    </motion.button>
  );
}
