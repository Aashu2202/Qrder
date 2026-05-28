'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBranches, useActiveBranchId, useSetBranch, type Branch } from '@/lib/branch';
import { apiFetch, type ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

interface BranchFormState {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isActive: boolean;
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useBranches();
  const activeId = useActiveBranchId();
  const setBranch = useSetBranch();
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/branches/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch deleted');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Delete failed'),
  });

  const branches = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Locations of your business · Click a card to make it active"
        actions={
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setEditing('new')}
            leftIcon={<Plus size={14} />}
          >
            New branch
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 w-32 mt-3" />
              <Skeleton className="h-3 w-20 mt-2" />
              <div className="mt-4 flex gap-1.5">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState
            icon={<Building2 size={20} />}
            title="No branches yet"
            description="Create your first location to start taking orders."
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setEditing('new')}
                leftIcon={<Plus size={14} />}
              >
                Create branch
              </Button>
            }
          />
        </div>
      ) : (
        <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {branches.map((b, idx) => {
              const active = b.id === activeId;
              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.22, delay: idx * 0.04 }}
                  whileHover={{ y: -2 }}
                  className={
                    'rounded-xl border bg-white p-4 shadow-[var(--shadow-soft)] transition-all dark:bg-zinc-900 ' +
                    (active
                      ? 'border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-400'
                      : 'border-zinc-200 dark:border-zinc-800')
                  }
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => setBranch(b.id)}
                      className="flex-1 text-left"
                    >
                      <div
                        className={
                          'h-9 w-9 rounded-lg grid place-items-center mb-3 ' +
                          (active
                            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')
                        }
                      >
                        <Building2 size={16} />
                      </div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{b.name}</div>
                      <div className="mt-1">
                        <Badge tone={b.isActive ? 'success' : 'neutral'} dot>
                          {b.isActive ? 'Open' : 'Inactive'}
                        </Badge>
                      </div>
                    </button>
                    {active && (
                      <Badge tone="brand" dot>
                        <Check size={10} /> Active
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setEditing(b)}
                      leftIcon={<Pencil size={11} />}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete branch "${b.name}"?`)) del.mutate(b.id);
                      }}
                      className="ml-auto inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-red-600 transition hover:bg-red-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {editing && (
          <BranchDialog
            branch={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BranchDialog({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const qc = useQueryClient();
  const branchExtra = branch as unknown as {
    phone?: string | null;
    address?: Record<string, string | undefined>;
  } | null;

  const [form, setForm] = useState<BranchFormState>({
    name: branch?.name ?? '',
    phone: branchExtra?.phone ?? '',
    line1: branchExtra?.address?.line1 ?? '',
    city: branchExtra?.address?.city ?? '',
    state: branchExtra?.address?.state ?? '',
    pincode: branchExtra?.address?.pincode ?? '',
    isActive: branch?.isActive ?? true,
  });
  const set = <K extends keyof BranchFormState>(k: K, v: BranchFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        isActive: form.isActive,
        address: {
          line1: form.line1 || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          pincode: form.pincode || undefined,
        },
      };
      return branch
        ? apiFetch(`/v1/branches/${branch.id}`, { method: 'PATCH', json: payload })
        : apiFetch('/v1/branches', { method: 'POST', json: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success(branch ? 'Branch updated' : 'Branch created');
      onClose();
    },
  });

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
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {branch ? 'Edit branch' : 'New branch'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>
        <Field label="Name">
          <FormInput value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Phone">
          <FormInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Address line">
          <FormInput value={form.line1} onChange={(e) => set('line1', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="City">
            <FormInput value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="State">
            <FormInput value={form.state} onChange={(e) => set('state', e.target.value)} />
          </Field>
          <Field label="Pincode">
            <FormInput value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-zinc-700 dark:text-zinc-300">Active (open for orders)</span>
        </label>
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
            {branch ? 'Save changes' : 'Create branch'}
          </Button>
        </div>
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
        'w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 ' +
        className
      }
    />
  );
}
