'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, KeyRound, X, Eye, EyeOff, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '@/lib/api';
import { useBranches } from '@/lib/branch';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

const ROLES = [
  { value: 'super_admin', label: 'Super admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
] as const;

const ROLE_TONE: Record<string, 'brand' | 'violet' | 'info' | 'warning' | 'success' | 'neutral'> = {
  super_admin: 'brand',
  manager: 'violet',
  cashier: 'info',
  waiter: 'warning',
  kitchen: 'success',
  bar: 'neutral',
};

interface Staff {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  branchId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

export default function StaffPage() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState<Staff | 'new' | null>(null);
  const [resetting, setResetting] = useState<Staff | null>(null);

  const list = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiFetch<{ items: Staff[] }>('/v1/staff'),
    staleTime: 30_000,
  });
  const branches = useBranches();

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member removed');
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage team members, roles, and branch assignments"
        actions={
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setEditing('new')}
            leftIcon={<Plus size={14} />}
          >
            New staff
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
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (list.data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No staff yet"
            description="Invite your first teammate to start collaborating."
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setEditing('new')}
                leftIcon={<Plus size={14} />}
              >
                Invite staff
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/70">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Branch</th>
                  <th className="px-4 py-2.5 font-medium">Last login</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.items ?? []).map((s, idx) => {
                  const branchName = s.branchId
                    ? branches.data?.items.find((b) => b.id === s.branchId)?.name ?? '—'
                    : 'All branches';
                  const isSelf = me?.id === s.id;
                  const initials = s.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('');
                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.015 }}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-semibold text-white shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {s.name}
                              </span>
                              {isSelf && <Badge tone="brand">You</Badge>}
                              {!s.isActive && <Badge tone="neutral">Inactive</Badge>}
                            </div>
                            {s.phone && (
                              <div className="text-[11px] text-zinc-500">{s.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{s.email}</td>
                      <td className="px-4 py-3">
                        <Badge tone={ROLE_TONE[s.role] ?? 'neutral'}>
                          {ROLES.find((r) => r.value === s.role)?.label ?? s.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{branchName}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => setEditing(s)}
                            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setResetting(s)}
                            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="Reset password"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (isSelf) {
                                toast.error("You can't delete your own account");
                                return;
                              }
                              if (confirm(`Delete ${s.name}? They will lose access immediately.`))
                                del.mutate(s.id);
                            }}
                            className="p-1.5 rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40"
                            disabled={isSelf}
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
          <StaffDialog
            staff={editing === 'new' ? null : editing}
            branches={branches.data?.items ?? []}
            onClose={() => setEditing(null)}
          />
        )}
        {resetting && (
          <ResetPasswordDialog staff={resetting} onClose={() => setResetting(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StaffDialog({
  staff,
  branches,
  onClose,
}: {
  staff: Staff | null;
  branches: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!staff;
  const [showPassword, setShowPassword] = useState(true);
  const [form, setForm] = useState({
    email: staff?.email ?? '',
    name: staff?.name ?? '',
    phone: staff?.phone ?? '',
    role: staff?.role ?? 'waiter',
    branchId: staff?.branchId ?? '',
    password: '',
    isActive: staff?.isActive ?? true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      if (isEdit && staff) {
        return apiFetch(`/v1/staff/${staff.id}`, {
          method: 'PATCH',
          json: {
            name: form.name,
            phone: form.phone || null,
            role: form.role,
            branchId: form.branchId || null,
            isActive: form.isActive,
          },
        });
      }
      return apiFetch('/v1/staff', {
        method: 'POST',
        json: {
          email: form.email,
          name: form.name,
          phone: form.phone || null,
          role: form.role,
          branchId: form.branchId || null,
          password: form.password,
          isActive: form.isActive,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success(isEdit ? 'Staff updated' : 'Staff created');
      onClose();
    },
  });

  return (
    <ModalShell onClose={onClose} title={isEdit ? 'Edit staff' : 'New staff'}>
      <Field label="Name">
        <FormInput value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Email">
        <FormInput
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          disabled={isEdit}
        />
      </Field>
      <Field label="Phone">
        <FormInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <FormSelect value={form.role} onChange={(e) => set('role', e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </FormSelect>
        </Field>
        <Field label="Branch">
          <FormSelect value={form.branchId} onChange={(e) => set('branchId', e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </FormSelect>
        </Field>
      </div>
      {!isEdit && (
        <Field label="Initial password (8+ chars)">
          <div className="relative">
            <FormInput
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="pr-10 font-mono"
              placeholder="Share with them — they should change it later"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-2 my-auto h-7 w-7 grid place-items-center rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-zinc-700 dark:text-zinc-300">Active</span>
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
          disabled={!form.name || !form.email || (!isEdit && form.password.length < 8)}
          onClick={() => save.mutate()}
        >
          {isEdit ? 'Save changes' : 'Create staff'}
        </Button>
      </div>
    </ModalShell>
  );
}

function ResetPasswordDialog({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const reset = useMutation({
    mutationFn: () =>
      apiFetch(`/v1/staff/${staff.id}/reset-password`, {
        method: 'POST',
        json: { newPassword: pw },
      }),
    onSuccess: () => {
      setDone(true);
      toast.success('Password updated');
    },
  });

  return (
    <ModalShell onClose={onClose} title="Reset password" maxWidth="max-w-sm">
      {done ? (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Password updated for <span className="font-medium text-zinc-900 dark:text-zinc-100">{staff.name}</span>.
            Share the new password with them directly — Qrder doesn&apos;t email it.
          </p>
          <Button variant="gradient" size="md" className="w-full" onClick={onClose}>
            Done
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Set a new password for {staff.name}. They will lose access on existing sessions when their tokens expire.
          </p>
          <div className="relative">
            <FormInput
              type={showPassword ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password (8+ chars)"
              className="pr-10 font-mono"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-2 my-auto h-7 w-7 grid place-items-center rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {reset.error && (
            <p className="text-xs text-red-600">
              {(reset.error as unknown as ApiError).detail ?? 'Reset failed'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              size="sm"
              loading={reset.isPending}
              disabled={pw.length < 8}
              onClick={() => reset.mutate()}
            >
              Reset
            </Button>
          </div>
        </>
      )}
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
