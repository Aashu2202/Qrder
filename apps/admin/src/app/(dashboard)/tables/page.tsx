'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, QrCode, RefreshCw, Trash2, FileDown, Armchair, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiBase } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useActiveBranchId } from '@/lib/branch';
import type { TableRow } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'violet' | 'neutral'> = {
  available: 'success',
  occupied: 'info',
  reserved: 'warning',
  cleaning: 'violet',
};
const STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
};

export default function TablesPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const branchId = useActiveBranchId();
  const [showNew, setShowNew] = useState(false);
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState(4);

  const { data, isLoading } = useQuery({
    queryKey: ['tables', branchId],
    queryFn: () => apiFetch<{ items: TableRow[] }>(`/v1/tables?branchId=${branchId}`),
    enabled: !!user && !!branchId,
    staleTime: 15_000,
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch(`/v1/tables?branchId=${branchId}`, {
        method: 'POST',
        json: { number, capacity: Number(capacity) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      setNumber('');
      setCapacity(4);
      setShowNew(false);
      toast.success('Table created');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to create'),
  });

  const rotateQr = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/tables/${id}/qr`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('QR token rotated');
    },
    onError: () => toast.error('Failed to rotate QR'),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/tables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table deleted');
    },
    onError: () => toast.error('Failed to delete table'),
  });

  const downloadQr = async (id: string, num: string) => {
    if (!accessToken) return;
    const res = await fetch(`${apiBase}/v1/tables/${id}/qr.png`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      toast.error('Could not load QR');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-${num}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSheet = async () => {
    if (!branchId || !accessToken) return;
    const res = await fetch(`${apiBase}/v1/branches/${branchId}/qr-sheet.pdf`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      toast.error('Could not generate QR sheet');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (!branchId) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500">Loading branch…</div>
    );
  }

  const tables = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables"
        description="Manage tables, QR tokens, and occupancy"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSheet}
              leftIcon={<FileDown size={14} />}
            >
              QR sheet
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => setShowNew(true)}
              leftIcon={<Plus size={14} />}
            >
              New table
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Skeleton className="h-6 w-20" />
              <Skeleton className="mt-2 h-4 w-16" />
              <Skeleton className="mt-3 h-6 w-24" />
              <div className="mt-4 flex gap-1.5">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : tables.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Armchair size={20} />}
            title="No tables yet"
            description="Create your first table to generate a scannable QR code."
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setShowNew(true)}
                leftIcon={<Plus size={14} />}
              >
                Create table
              </Button>
            }
          />
        </Card>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <AnimatePresence initial={false}>
            {tables.map((t, idx) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                whileHover={{ y: -2 }}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      Table {t.number}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">{t.capacity} seats</div>
                  </div>
                  <Badge tone={STATUS_TONE[t.status] ?? 'neutral'} dot>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => downloadQr(t.id, t.number)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <QrCode size={11} /> QR PNG
                  </button>
                  <button
                    onClick={() => rotateQr.mutate(t.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    title="Rotate QR token"
                  >
                    <RefreshCw size={11} /> Rotate
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete table ${t.number}?`)) del.mutate(t.id);
                    }}
                    className="ml-auto inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-red-600 transition hover:bg-red-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowNew(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">New table</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Assign a number and seat capacity.</p>
                </div>
                <button
                  onClick={() => setShowNew(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Number</label>
                  <input
                    placeholder="e.g. T13"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => create.mutate()}
                  loading={create.isPending}
                  disabled={!number}
                >
                  Create
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
