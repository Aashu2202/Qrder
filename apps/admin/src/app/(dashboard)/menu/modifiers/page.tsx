'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Sliders, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '@/lib/api';
import { formatMoney, parseMoney } from '@/lib/money';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

interface Modifier {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  displayOrder: number;
}
interface ModifierGroup {
  id: string;
  name: string;
  selectionType: 'single' | 'multiple';
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export default function ModifierGroupsPage() {
  const qc = useQueryClient();
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | 'new' | null>(null);
  const [editingModifier, setEditingModifier] = useState<
    { groupId: string; modifier: Modifier | null } | null
  >(null);

  const groups = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => apiFetch<{ items: ModifierGroup[] }>('/v1/menu/modifier-groups'),
    staleTime: 30_000,
  });

  const deleteGroup = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/v1/menu/modifier-groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success('Group deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const deleteModifier = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/menu/modifiers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success('Option deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier groups"
        description="Reusable option sets (size, add-ons, spice level) attached to menu items"
        actions={
          <>
            <Link href="/menu">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />}>
                Back to menu
              </Button>
            </Link>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => setEditingGroup('new')}
              leftIcon={<Plus size={14} />}
            >
              New group
            </Button>
          </>
        }
      />

      {groups.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full mt-3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : (groups.data?.items.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={<Sliders size={20} />}
            title="No modifier groups yet"
            description="Group options like size, add-ons, or spice level and attach them to items."
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setEditingGroup('new')}
                leftIcon={<Plus size={14} />}
              >
                Create group
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.data?.items.map((g, idx) => (
            <motion.section
              key={g.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.04 }}
              className="rounded-xl border border-zinc-200 bg-white shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <header className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/70 dark:border-zinc-800/70">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight">{g.name}</h2>
                    <Badge tone={g.selectionType === 'single' ? 'info' : 'violet'}>
                      {g.selectionType === 'single'
                        ? 'Pick one'
                        : `Pick ${g.minSelect}–${g.maxSelect}`}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{g.modifiers.length} options</p>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => setEditingGroup(g)}
                    className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete group "${g.name}"? Items using it will lose this option.`))
                        deleteGroup.mutate(g.id);
                    }}
                    className="p-1.5 rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </header>
              <div className="px-5 py-3">
                {g.modifiers.length === 0 ? (
                  <p className="text-sm py-2 text-zinc-500">No options yet. Add one →</p>
                ) : (
                  <ul>
                    {g.modifiers.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between py-2 text-sm border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{m.name}</span>
                          {m.isDefault && <Badge tone="brand">Default</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              'text-xs tabular-nums ' +
                              (m.priceDelta === 0
                                ? 'text-zinc-500'
                                : m.priceDelta > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400')
                            }
                          >
                            {m.priceDelta === 0
                              ? 'Same price'
                              : `${m.priceDelta > 0 ? '+' : '−'}${formatMoney(Math.abs(m.priceDelta))}`}
                          </span>
                          <button
                            onClick={() => setEditingModifier({ groupId: g.id, modifier: m })}
                            className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${m.name}"?`)) deleteModifier.mutate(m.id);
                            }}
                            className="p-1 rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => setEditingModifier({ groupId: g.id, modifier: null })}
                  className="mt-2 text-xs font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 inline-flex items-center gap-0.5"
                >
                  <Plus size={12} /> Add option
                </button>
              </div>
            </motion.section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editingGroup && (
          <GroupDialog
            group={editingGroup === 'new' ? null : editingGroup}
            onClose={() => setEditingGroup(null)}
          />
        )}
        {editingModifier && (
          <ModifierDialog
            groupId={editingModifier.groupId}
            modifier={editingModifier.modifier}
            onClose={() => setEditingModifier(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupDialog({ group, onClose }: { group: ModifierGroup | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(group?.name ?? '');
  const [selectionType, setSelectionType] = useState<'single' | 'multiple'>(
    group?.selectionType ?? 'single',
  );
  const [minSelect, setMinSelect] = useState(group?.minSelect ?? 0);
  const [maxSelect, setMaxSelect] = useState(group?.maxSelect ?? 1);

  const save = useMutation({
    mutationFn: () => {
      const payload = { name, selectionType, minSelect, maxSelect };
      if (group)
        return apiFetch(`/v1/menu/modifier-groups/${group.id}`, {
          method: 'PATCH',
          json: payload,
        });
      return apiFetch('/v1/menu/modifier-groups', { method: 'POST', json: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success(group ? 'Group updated' : 'Group created');
      onClose();
    },
  });

  return (
    <ModalShell title={group ? 'Edit group' : 'New group'} onClose={onClose}>
      <Field label="Name">
        <FormInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Size" />
      </Field>
      <Field label="Selection">
        <FormSelect
          value={selectionType}
          onChange={(e) => setSelectionType(e.target.value as 'single' | 'multiple')}
        >
          <option value="single">Single — exactly one option</option>
          <option value="multiple">Multiple — any number of options</option>
        </FormSelect>
      </Field>
      {selectionType === 'multiple' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min select">
            <FormInput
              type="number"
              min={0}
              value={minSelect}
              onChange={(e) => setMinSelect(Number(e.target.value))}
            />
          </Field>
          <Field label="Max select">
            <FormInput
              type="number"
              min={1}
              value={maxSelect}
              onChange={(e) => setMaxSelect(Number(e.target.value))}
            />
          </Field>
        </div>
      )}
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
          disabled={!name}
          onClick={() => save.mutate()}
        >
          {group ? 'Save changes' : 'Create group'}
        </Button>
      </div>
    </ModalShell>
  );
}

function ModifierDialog({
  groupId,
  modifier,
  onClose,
}: {
  groupId: string;
  modifier: Modifier | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(modifier?.name ?? '');
  const [priceDeltaRupees, setPriceDeltaRupees] = useState(
    modifier ? (modifier.priceDelta / 100).toString() : '0',
  );
  const [isDefault, setIsDefault] = useState(modifier?.isDefault ?? false);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        priceDelta: parseMoney(priceDeltaRupees),
        isDefault,
      };
      if (modifier)
        return apiFetch(`/v1/menu/modifiers/${modifier.id}`, {
          method: 'PATCH',
          json: payload,
        });
      return apiFetch(`/v1/menu/modifier-groups/${groupId}/modifiers`, {
        method: 'POST',
        json: payload,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success(modifier ? 'Option updated' : 'Option added');
      onClose();
    },
  });

  return (
    <ModalShell title={modifier ? 'Edit option' : 'New option'} onClose={onClose} maxWidth="max-w-sm">
      <Field label="Name">
        <FormInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Large" />
      </Field>
      <Field label="Price change (₹, can be negative)">
        <FormInput
          type="number"
          value={priceDeltaRupees}
          onChange={(e) => setPriceDeltaRupees(e.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-zinc-700 dark:text-zinc-300">Default selection</span>
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
          disabled={!name}
          onClick={() => save.mutate()}
        >
          {modifier ? 'Save' : 'Add option'}
        </Button>
      </div>
    </ModalShell>
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
        'w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 ' +
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
