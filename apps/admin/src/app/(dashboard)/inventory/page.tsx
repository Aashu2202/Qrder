'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, AlertTriangle, History, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '@/lib/api';
import { useActiveBranchId } from '@/lib/branch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  stockQty: string;
  reorderLevel: string | null;
  costPerUnit: number | null;
}

interface StockMovement {
  id: string;
  changeQty: string;
  reason: string;
  createdAt: string;
}

export default function InventoryPage() {
  const branchId = useActiveBranchId();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [historyOf, setHistoryOf] = useState<InventoryItem | null>(null);

  const list = useQuery({
    queryKey: ['inventory', branchId],
    queryFn: () =>
      apiFetch<{ items: InventoryItem[] }>(`/v1/inventory/items?branchId=${branchId}`),
    enabled: !!branchId,
    staleTime: 30_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/inventory/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item removed');
    },
    onError: () => toast.error('Delete failed'),
  });

  if (!branchId) {
    return <div className="py-16 text-center text-sm text-zinc-500">Loading branch…</div>;
  }

  const items = list.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track raw ingredients per branch · Auto-deduction lands in a later phase"
        actions={
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setEditing('new')}
            leftIcon={<Plus size={14} />}
          >
            New item
          </Button>
        }
      />

      <Card>
        {list.isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800"
              >
                <Skeleton className="h-4 w-32" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Boxes size={20} />}
            title="No inventory items yet"
            description="Add raw ingredients you want to track stock for."
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setEditing('new')}
                leftIcon={<Plus size={14} />}
              >
                Add item
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/70">
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium text-right">Stock</th>
                  <th className="px-4 py-2.5 font-medium text-right">Reorder at</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cost</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const stock = Number(it.stockQty);
                  const reorder = it.reorderLevel ? Number(it.reorderLevel) : null;
                  const low = reorder !== null && stock <= reorder;
                  return (
                    <motion.tr
                      key={it.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.012 }}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{it.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {low ? (
                          <Badge tone="warning" dot>
                            <AlertTriangle size={10} />
                            {stock} {it.unit}
                          </Badge>
                        ) : (
                          <span className="tabular-nums">
                            {stock} {it.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500 text-xs tabular-nums">
                        {reorder !== null ? `${reorder} ${it.unit}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500 text-xs tabular-nums">
                        {it.costPerUnit !== null
                          ? `₹${(it.costPerUnit / 100).toFixed(2)}/${it.unit}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAdjusting(it)}
                            className="h-7 px-2 text-[11px]"
                          >
                            Adjust
                          </Button>
                          <button
                            onClick={() => setHistoryOf(it)}
                            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="History"
                          >
                            <History size={14} />
                          </button>
                          <button
                            onClick={() => setEditing(it)}
                            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${it.name}? This will also remove its history.`))
                                del.mutate(it.id);
                            }}
                            className="p-1.5 rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {editing && (
          <ItemDialog
            item={editing === 'new' ? null : editing}
            branchId={branchId}
            onClose={() => setEditing(null)}
          />
        )}
        {adjusting && <AdjustDialog item={adjusting} onClose={() => setAdjusting(null)} />}
        {historyOf && <HistoryDrawer item={historyOf} onClose={() => setHistoryOf(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ItemDialog({
  item,
  branchId,
  onClose,
}: {
  item: InventoryItem | null;
  branchId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: item?.name ?? '',
    unit: item?.unit ?? 'kg',
    stockQty: item?.stockQty ?? '0',
    reorderLevel: item?.reorderLevel ?? '',
    costPerUnitRupees: item?.costPerUnit != null ? String(item.costPerUnit / 100) : '',
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        unit: form.unit,
        stockQty: Number(form.stockQty),
        reorderLevel: form.reorderLevel === '' ? null : Number(form.reorderLevel),
        costPerUnit:
          form.costPerUnitRupees === '' ? null : Math.round(Number(form.costPerUnitRupees) * 100),
      };
      return item
        ? apiFetch(`/v1/inventory/items/${item.id}`, { method: 'PATCH', json: payload })
        : apiFetch(`/v1/inventory/items?branchId=${branchId}`, {
            method: 'POST',
            json: payload,
          });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(item ? 'Item updated' : 'Item created');
      onClose();
    },
  });

  return (
    <ModalShell title={item ? 'Edit item' : 'New item'} onClose={onClose}>
      <Field label="Name">
        <FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit">
          <FormSelect value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">l</option>
            <option value="ml">ml</option>
            <option value="pcs">pcs</option>
          </FormSelect>
        </Field>
        <Field label="Stock">
          <FormInput
            type="number"
            step="0.001"
            value={form.stockQty}
            onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
            disabled={!!item}
            title={item ? 'Use Adjust to change stock' : ''}
          />
        </Field>
      </div>
      <Field label="Reorder level (optional)">
        <FormInput
          type="number"
          step="0.001"
          value={form.reorderLevel}
          onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
        />
      </Field>
      <Field label="Cost per unit (₹)">
        <FormInput
          type="number"
          step="0.01"
          value={form.costPerUnitRupees}
          onChange={(e) => setForm({ ...form, costPerUnitRupees: e.target.value })}
        />
      </Field>
      {save.error && (
        <p className="text-xs text-red-600">
          {(save.error as unknown as ApiError).detail ?? 'Save failed'}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="gradient"
          size="sm"
          loading={save.isPending}
          disabled={!form.name}
          onClick={() => save.mutate()}
        >
          {item ? 'Save changes' : 'Create'}
        </Button>
      </div>
    </ModalShell>
  );
}

function AdjustDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState<'purchase' | 'consumption' | 'wastage' | 'adjustment'>(
    'purchase',
  );
  const [delta, setDelta] = useState('0');
  const signedDelta =
    reason === 'consumption' || reason === 'wastage'
      ? -Math.abs(Number(delta))
      : Number(delta);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/v1/inventory/items/${item.id}/movements`, {
        method: 'POST',
        json: { changeQty: signedDelta, reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock adjusted');
      onClose();
    },
  });

  return (
    <ModalShell title="Adjust stock" onClose={onClose} maxWidth="max-w-sm">
      <p className="text-sm text-zinc-500">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</span> · current:{' '}
        {Number(item.stockQty)} {item.unit}
      </p>
      <Field label="Reason">
        <FormSelect value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
          <option value="purchase">Purchase (+)</option>
          <option value="consumption">Consumption (−)</option>
          <option value="wastage">Wastage (−)</option>
          <option value="adjustment">Manual adjustment (±)</option>
        </FormSelect>
      </Field>
      <Field label={`Quantity (${item.unit})`}>
        <FormInput
          type="number"
          step="0.001"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
        />
      </Field>
      <p className="text-xs text-zinc-500">
        New stock will be{' '}
        <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
          {(Number(item.stockQty) + signedDelta).toFixed(3)} {item.unit}
        </span>
      </p>
      {save.error && (
        <p className="text-xs text-red-600">
          {(save.error as unknown as ApiError).detail ?? 'Adjust failed'}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="gradient"
          size="sm"
          loading={save.isPending}
          disabled={Number(delta) === 0}
          onClick={() => save.mutate()}
        >
          Apply
        </Button>
      </div>
    </ModalShell>
  );
}

function HistoryDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const history = useQuery({
    queryKey: ['inventory-history', item.id],
    queryFn: () => apiFetch<{ items: StockMovement[] }>(`/v1/inventory/items/${item.id}/movements`),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex"
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-sm h-full overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="sticky top-0 z-10 px-5 py-3.5 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center justify-between dark:border-zinc-800 dark:bg-zinc-900/80">
          <div>
            <h2 className="font-semibold tracking-tight text-sm">History</h2>
            <p className="text-xs text-zinc-500">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </header>
        <div className="p-5">
          {history.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (history.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">No movements yet.</p>
          ) : (
            <ul className="space-y-1">
              {(history.data?.items ?? []).map((m) => {
                const qty = Number(m.changeQty);
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
                  >
                    <div>
                      <div className="capitalize text-sm font-medium">{m.reason}</div>
                      <div className="text-[11px] text-zinc-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div
                      className={
                        'font-medium tabular-nums text-sm ' +
                        (qty < 0 ? 'text-red-600' : 'text-emerald-600')
                      }
                    >
                      {qty > 0 ? '+' : ''}
                      {qty} {item.unit}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-3`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
    </div>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      {...rest}
      className={
        'w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 ' +
        className
      }
    />
  );
}

function FormSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return (
    <select
      {...rest}
      className={
        'w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 ' +
        className
      }
    />
  );
}
