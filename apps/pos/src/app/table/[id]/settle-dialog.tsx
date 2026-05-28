'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Order } from '@/lib/types';

interface Props {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'card', label: '💳 Card' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'wallet', label: '🪙 Wallet' },
] as const;

export function SettleDialog({ order, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('cash');
  const [amountRupees, setAmountRupees] = useState((order.totalAmount / 100).toString());
  const [note, setNote] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      apiFetch('/v1/payments', {
        method: 'POST',
        json: {
          orderId: order.id,
          method,
          amount: Math.round(Number(amountRupees) * 100),
          note: note || undefined,
        },
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const due = order.totalAmount;

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border p-5 space-y-4"
        style={{ background: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Settle bill</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        <div
          className="rounded-lg border p-3 text-sm"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <div className="flex justify-between">
            <span style={{ color: 'rgb(var(--muted-foreground))' }}>Due</span>
            <span className="font-semibold">{formatMoney(due)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={
                'rounded-md py-2 text-sm border ' +
                (method === m.value ? 'bg-brand-600 text-white border-brand-600' : '')
              }
              style={method === m.value ? undefined : { borderColor: 'rgb(var(--border))' }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <input
          type="number"
          value={amountRupees}
          onChange={(e) => setAmountRupees(e.target.value)}
          className="w-full rounded-md border bg-transparent px-3 py-2 text-base"
          style={{ borderColor: 'rgb(var(--border))' }}
        />

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: 'rgb(var(--border))' }}
        />

        {submit.error && (
          <p className="text-sm text-red-600">
            {(submit.error as unknown as ApiError).detail ?? 'Could not record payment'}
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
            disabled={submit.isPending || !amountRupees}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submit.isPending ? 'Recording…' : `Record ${method.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
