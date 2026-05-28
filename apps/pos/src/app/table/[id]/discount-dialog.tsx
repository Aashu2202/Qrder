'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '@/lib/api';
import type { Order } from '@/lib/types';

interface Props {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DiscountDialog({ orderId, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'coupon' | 'manual'>('manual');
  const [coupon, setCoupon] = useState('');
  const [flatRupees, setFlatRupees] = useState<string>('');
  const [reason, setReason] = useState('');

  const submit = useMutation({
    mutationFn: () => {
      const payload =
        mode === 'coupon'
          ? { couponCode: coupon, reason: reason || undefined }
          : {
              flatAmount: Math.round(Number(flatRupees) * 100),
              reason: reason || undefined,
            };
      return apiFetch<Order>(`/v1/orders/${orderId}/discount`, {
        method: 'POST',
        json: payload,
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border p-5 space-y-4"
        style={{ background: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Apply discount</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('manual')}
            className={
              'rounded-md py-2 text-sm border ' +
              (mode === 'manual' ? 'bg-brand-600 text-white border-brand-600' : '')
            }
            style={mode === 'manual' ? undefined : { borderColor: 'rgb(var(--border))' }}
          >
            Manual ₹
          </button>
          <button
            onClick={() => setMode('coupon')}
            className={
              'rounded-md py-2 text-sm border ' +
              (mode === 'coupon' ? 'bg-brand-600 text-white border-brand-600' : '')
            }
            style={mode === 'coupon' ? undefined : { borderColor: 'rgb(var(--border))' }}
          >
            Coupon code
          </button>
        </div>

        {mode === 'manual' ? (
          <input
            value={flatRupees}
            onChange={(e) => setFlatRupees(e.target.value)}
            placeholder="Discount amount (₹)"
            type="number"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: 'rgb(var(--border))' }}
          />
        ) : (
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="COUPON-CODE"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm uppercase"
            style={{ borderColor: 'rgb(var(--border))' }}
          />
        )}

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: 'rgb(var(--border))' }}
        />

        {submit.error && (
          <p className="text-sm text-red-600">
            {(submit.error as unknown as ApiError).detail ?? 'Could not apply discount'}
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
            disabled={
              submit.isPending ||
              (mode === 'manual' ? !flatRupees : !coupon)
            }
            className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submit.isPending ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
