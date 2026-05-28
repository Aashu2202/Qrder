'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '@/lib/api';
import type { Order } from '@/lib/types';
import { formatMoney } from '@/lib/money';

interface Props {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export function SplitDialog({ order, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'evenly' | 'by-item'>('evenly');
  const [splitCount, setSplitCount] = useState(2);
  /** Map of orderItemId → billIndex (1..N, parent stays = items not assigned) */
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  const submit = useMutation({
    mutationFn: () => {
      if (mode === 'evenly') {
        return apiFetch(`/v1/orders/${order.id}/split`, {
          method: 'POST',
          json: { mode: 'evenly', splitCount },
        });
      }
      const list = Object.entries(assignments)
        .filter(([, bi]) => bi > 0)
        .map(([orderItemId, billIndex]) => ({ orderItemId, billIndex }));
      return apiFetch(`/v1/orders/${order.id}/split`, {
        method: 'POST',
        json: { mode: 'by-item', assignments: list },
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const cycleBill = (id: string) => {
    setAssignments((m) => ({ ...m, [id]: ((m[id] ?? 0) + 1) % 4 }));
  };

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Split bill</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('evenly')}
            className={
              'rounded-md py-2 text-sm border ' +
              (mode === 'evenly' ? 'bg-brand-600 text-white border-brand-600' : '')
            }
            style={mode === 'evenly' ? undefined : { borderColor: 'rgb(var(--border))' }}
          >
            Evenly
          </button>
          <button
            onClick={() => setMode('by-item')}
            className={
              'rounded-md py-2 text-sm border ' +
              (mode === 'by-item' ? 'bg-brand-600 text-white border-brand-600' : '')
            }
            style={mode === 'by-item' ? undefined : { borderColor: 'rgb(var(--border))' }}
          >
            By item
          </button>
        </div>

        {mode === 'evenly' ? (
          <div className="space-y-2">
            <label className="text-sm">Split into</label>
            <input
              type="number"
              min={2}
              max={10}
              value={splitCount}
              onChange={(e) => setSplitCount(Number(e.target.value))}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              style={{ borderColor: 'rgb(var(--border))' }}
            />
            <p className="text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>
              Each share ≈ {formatMoney(Math.round(order.totalAmount / splitCount))}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>
              Tap an item to cycle: Parent → Bill 1 → Bill 2 → Bill 3
            </p>
            <ul className="space-y-1">
              {order.items.map((it) => {
                const bill = assignments[it.id] ?? 0;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => cycleBill(it.id)}
                      className="w-full rounded-md border px-3 py-2 text-sm flex justify-between items-center"
                      style={{ borderColor: 'rgb(var(--border))' }}
                    >
                      <span>
                        {it.quantity}× {it.nameSnapshot}
                      </span>
                      <span
                        className={
                          'text-xs font-medium rounded-full px-2 py-0.5 ' +
                          (bill === 0
                            ? 'bg-zinc-100 text-zinc-700'
                            : 'bg-brand-50 text-brand-700')
                        }
                      >
                        {bill === 0 ? 'Parent' : `Bill ${bill}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {submit.error && (
          <p className="text-sm text-red-600">
            {(submit.error as unknown as ApiError).detail ?? 'Split failed'}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            Cancel
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submit.isPending ? 'Splitting…' : 'Split'}
          </button>
        </div>
      </div>
    </div>
  );
}
