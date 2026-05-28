'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, TicketPercent, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '@/lib/api';
import { formatMoney, parseMoney } from '@/lib/money';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

interface Coupon {
  id: string;
  code: string;
  type: 'flat' | 'percent';
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

function describeValue(c: Pick<Coupon, 'type' | 'value'>) {
  return c.type === 'percent' ? `${c.value / 100}%` : formatMoney(c.value);
}

function validityLabel(c: Coupon) {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString();
  if (c.validFrom && c.validUntil) return `${fmt(c.validFrom)} – ${fmt(c.validUntil)}`;
  if (c.validUntil) return `Until ${fmt(c.validUntil)}`;
  if (c.validFrom) return `From ${fmt(c.validFrom)}`;
  return 'Always';
}

function isExpired(c: Coupon) {
  return c.validUntil != null && new Date(c.validUntil).getTime() < Date.now();
}
function isUsedUp(c: Coupon) {
  return c.maxUses != null && c.usedCount >= c.maxUses;
}

export default function CouponsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);

  const list = useQuery({
    queryKey: ['coupons'],
    queryFn: () => apiFetch<{ items: Coupon[] }>('/v1/coupons'),
    staleTime: 30_000,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/v1/coupons/${id}`, { method: 'PATCH', json: { isActive } }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(vars.isActive ? 'Coupon activated' : 'Coupon paused');
    },
    onError: () => toast.error('Failed to update coupon'),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const items = list.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Discount codes diners and staff can apply at checkout"
        actions={
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setEditing('new')}
            leftIcon={<Plus size={14} />}
          >
            New coupon
          </Button>
        }
      />

      <Card>
        {list.isLoading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<TicketPercent size={20} />}
            title="No coupons yet"
            description="Create a discount code to run a promo or reward loyal diners."
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setEditing('new')}
                leftIcon={<Plus size={14} />}
              >
                Create coupon
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/70">
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Discount</th>
                  <th className="px-4 py-2.5 font-medium text-right">Min order</th>
                  <th className="px-4 py-2.5 font-medium text-right">Used</th>
                  <th className="px-4 py-2.5 font-medium">Validity</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c, idx) => {
                  const expired = isExpired(c);
                  const usedUp = isUsedUp(c);
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.015 }}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <CodeCell code={c.code} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={c.type === 'percent' ? 'violet' : 'info'}>
                          {describeValue(c)}
                          {c.type === 'percent' && c.maxDiscount != null && (
                            <span className="opacity-70"> · max {formatMoney(c.maxDiscount)}</span>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500 text-xs tabular-nums">
                        {c.minSubtotal > 0 ? formatMoney(c.minSubtotal) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">
                        {c.usedCount}
                        <span className="text-zinc-400"> / {c.maxUses ?? '∞'}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {validityLabel(c)}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <Badge tone="danger" dot>
                            Expired
                          </Badge>
                        ) : usedUp ? (
                          <Badge tone="warning" dot>
                            Used up
                          </Badge>
                        ) : (
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <span
                              className={
                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' +
                                (c.isActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700')
                              }
                            >
                              <input
                                type="checkbox"
                                checked={c.isActive}
                                onChange={(e) =>
                                  toggleActive.mutate({ id: c.id, isActive: e.target.checked })
                                }
                                className="sr-only"
                              />
                              <span
                                className={
                                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ' +
                                  (c.isActive ? 'translate-x-[18px]' : 'translate-x-0.5')
                                }
                              />
                            </span>
                            <span className="text-xs text-zinc-500">
                              {c.isActive ? 'Active' : 'Paused'}
                            </span>
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => setEditing(c)}
                            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete coupon "${c.code}"?`)) del.mutate(c.id);
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
          <CouponDialog
            coupon={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CodeCell({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          toast.success(`Copied “${code}”`);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="group inline-flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-xs font-semibold tracking-wide text-zinc-900 transition hover:border-brand-400 hover:bg-brand-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:border-brand-500 dark:hover:bg-brand-950/30"
      title="Copy code"
    >
      {code}
      {copied ? (
        <Check size={11} className="text-emerald-500" />
      ) : (
        <Copy size={11} className="text-zinc-400 group-hover:text-brand-500" />
      )}
    </button>
  );
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function CouponDialog({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!coupon;
  const [form, setForm] = useState({
    code: coupon?.code ?? '',
    type: coupon?.type ?? ('percent' as 'flat' | 'percent'),
    valueInput: coupon ? String(coupon.value / 100) : '',
    minSubtotalRupees: coupon && coupon.minSubtotal > 0 ? String(coupon.minSubtotal / 100) : '',
    maxDiscountRupees: coupon?.maxDiscount != null ? String(coupon.maxDiscount / 100) : '',
    validFrom: toLocalInput(coupon?.validFrom),
    validUntil: toLocalInput(coupon?.validUntil),
    maxUses: coupon?.maxUses != null ? String(coupon.maxUses) : '',
    isActive: coupon?.isActive ?? true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const codeValid = /^[A-Za-z0-9_-]{2,32}$/.test(form.code);
  const valueNum = Number(form.valueInput);
  const valueValid = form.valueInput !== '' && valueNum > 0 && (form.type !== 'percent' || valueNum <= 100);

  const save = useMutation({
    mutationFn: () => {
      const value =
        form.type === 'percent'
          ? Math.round(valueNum * 100) // 20 -> 2000 basis points
          : parseMoney(form.valueInput); // rupees -> paise
      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value,
        minSubtotal: form.minSubtotalRupees ? parseMoney(form.minSubtotalRupees) : 0,
        maxDiscount:
          form.type === 'percent' && form.maxDiscountRupees
            ? parseMoney(form.maxDiscountRupees)
            : null,
        validFrom: fromLocalInput(form.validFrom),
        validUntil: fromLocalInput(form.validUntil),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        isActive: form.isActive,
      };
      return coupon
        ? apiFetch(`/v1/coupons/${coupon.id}`, { method: 'PATCH', json: payload })
        : apiFetch('/v1/coupons', { method: 'POST', json: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(isEdit ? 'Coupon updated' : 'Coupon created');
      onClose();
    },
    onError: (e: unknown) => {
      const detail = (e as ApiError)?.detail;
      toast.error(detail ?? 'Save failed — code may already exist');
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
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {isEdit ? 'Edit coupon' : 'New coupon'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        <Field label="Code">
          <FormInput
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            placeholder="e.g. WELCOME20"
            className="font-mono uppercase"
            maxLength={32}
          />
          {form.code !== '' && !codeValid && (
            <p className="text-xs text-red-600">Letters, digits, _ and - only (2–32 chars).</p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <FormSelect
              value={form.type}
              onChange={(e) => set('type', e.target.value as 'flat' | 'percent')}
            >
              <option value="percent">Percent off</option>
              <option value="flat">Flat amount off</option>
            </FormSelect>
          </Field>
          <Field label={form.type === 'percent' ? 'Percent (%)' : 'Amount (₹)'}>
            <FormInput
              type="number"
              min={form.type === 'percent' ? 1 : 0}
              max={form.type === 'percent' ? 100 : undefined}
              step={form.type === 'percent' ? 1 : 0.01}
              value={form.valueInput}
              onChange={(e) => set('valueInput', e.target.value)}
              placeholder={form.type === 'percent' ? '20' : '100'}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Min order (₹, optional)">
            <FormInput
              type="number"
              step="0.01"
              min={0}
              value={form.minSubtotalRupees}
              onChange={(e) => set('minSubtotalRupees', e.target.value)}
              placeholder="0"
            />
          </Field>
          {form.type === 'percent' && (
            <Field label="Max discount (₹, optional)">
              <FormInput
                type="number"
                step="0.01"
                min={0}
                value={form.maxDiscountRupees}
                onChange={(e) => set('maxDiscountRupees', e.target.value)}
                placeholder="No cap"
              />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Valid from (optional)">
            <FormInput
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => set('validFrom', e.target.value)}
            />
          </Field>
          <Field label="Valid until (optional)">
            <FormInput
              type="datetime-local"
              value={form.validUntil}
              onChange={(e) => set('validUntil', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Max total uses (optional)">
          <FormInput
            type="number"
            min={1}
            value={form.maxUses}
            onChange={(e) => set('maxUses', e.target.value)}
            placeholder="Unlimited"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-zinc-700 dark:text-zinc-300">Active</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="sm"
            loading={save.isPending}
            disabled={!codeValid || !valueValid}
            onClick={() => save.mutate()}
          >
            {isEdit ? 'Save changes' : 'Create coupon'}
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
