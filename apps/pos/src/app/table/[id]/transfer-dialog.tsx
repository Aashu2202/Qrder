'use client';

import { X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '@/lib/api';
import { useActiveBranchId } from '@/lib/branch';
import type { TableRow, Order } from '@/lib/types';

interface Props {
  orderId: string;
  currentTableId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferDialog({ orderId, currentTableId, onClose, onSuccess }: Props) {
  const branchId = useActiveBranchId();
  const tables = useQuery({
    queryKey: ['pos-tables', branchId],
    queryFn: () => apiFetch<{ items: TableRow[] }>(`/v1/tables?branchId=${branchId}`),
    enabled: !!branchId,
  });

  const transfer = useMutation({
    mutationFn: (targetTableId: string) =>
      apiFetch<Order>(`/v1/orders/${orderId}/transfer`, {
        method: 'POST',
        json: { targetTableId },
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const available =
    (tables.data?.items ?? []).filter((t) => t.id !== currentTableId && t.status === 'available');

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border p-5 space-y-3 max-h-[80vh] overflow-y-auto"
        style={{ background: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Transfer to another table</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>
          Pick a free table to move this order to.
        </p>

        {available.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">No free tables right now.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {available.map((t) => (
              <button
                key={t.id}
                disabled={transfer.isPending}
                onClick={() => transfer.mutate(t.id)}
                className="rounded-lg border-2 p-3 text-lg font-bold hover:border-brand-500 disabled:opacity-50 aspect-square"
                style={{ borderColor: 'rgb(var(--border))' }}
              >
                {t.number}
              </button>
            ))}
          </div>
        )}

        {transfer.error && (
          <p className="text-sm text-red-600">
            {(transfer.error as unknown as ApiError).detail ?? 'Transfer failed'}
          </p>
        )}
      </div>
    </div>
  );
}
