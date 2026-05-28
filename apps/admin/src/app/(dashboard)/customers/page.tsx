'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Phone, Star, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

interface Customer {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  loyaltyPoints: number;
  totalSpend: number;
  visitCount: number;
  createdAt: string;
}

interface CustomerDetail {
  customer: Customer;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    placedAt: string;
  }>;
  feedback: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      apiFetch<{ items: Customer[] }>(
        `/v1/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Diners linked at checkout · Loyalty: 1 point per ₹10 on completed orders"
        actions={
          <div className="relative" style={{ minWidth: 260 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone"
              className="w-full h-9 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
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
                <Skeleton className="h-4 w-28" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (list.data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title={search ? 'No matches' : 'No linked customers'}
            description={
              search
                ? 'Try a different name or phone number.'
                : 'Diners can link their phone at checkout to start earning loyalty points.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/70">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium text-right">Visits</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total spend</th>
                  <th className="px-4 py-2.5 font-medium text-right">Loyalty</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.items ?? []).map((c, idx) => {
                  const initials = (c.name ?? '?')
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('');
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.012 }}
                      className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                      onClick={() => setOpen(c.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-[11px] font-semibold text-white shrink-0">
                            {initials || '?'}
                          </div>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {c.name ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.visitCount}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatMoney(c.totalSpend)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone="brand">{c.loyaltyPoints} pts</Badge>
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
        {open && <CustomerDrawer id={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}

function CustomerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['customer', id],
    queryFn: () => apiFetch<CustomerDetail>(`/v1/customers/${id}`),
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
        className="w-full max-w-md h-full overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="sticky top-0 z-10 px-5 py-3.5 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center justify-between dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="font-semibold tracking-tight">Customer</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </header>

        <div className="p-5 space-y-5">
          {detail.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ) : detail.data ? (
            <>
              <section>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-sm font-semibold text-white">
                    {((detail.data.customer.name ?? '?')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? '')
                      .join('')) || '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {detail.data.customer.name ?? 'Unnamed'}
                    </h3>
                    {detail.data.customer.phone && (
                      <p className="text-xs flex items-center gap-1.5 text-zinc-500 mt-0.5">
                        <Phone size={11} /> {detail.data.customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Stat label="Visits" value={String(detail.data.customer.visitCount)} />
                  <Stat label="Spend" value={formatMoney(detail.data.customer.totalSpend)} />
                  <Stat label="Points" value={String(detail.data.customer.loyaltyPoints)} tone="brand" />
                </div>
              </section>

              <section>
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                  Order history
                </h4>
                {detail.data.orders.length === 0 ? (
                  <p className="text-sm text-zinc-500">No orders.</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.data.orders.map((o) => (
                      <li
                        key={o.id}
                        className="flex justify-between border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
                      >
                        <div>
                          <div className="font-medium text-sm tabular-nums">#{o.orderNumber}</div>
                          <div className="text-[11px] text-zinc-500">
                            {new Date(o.placedAt).toLocaleString()} · {o.status}
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium tabular-nums">
                          {formatMoney(o.totalAmount)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {detail.data.feedback.length > 0 && (
                <section>
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                    Feedback
                  </h4>
                  <ul className="space-y-3">
                    {detail.data.feedback.map((f) => (
                      <li key={f.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i < f.rating ? 'currentColor' : 'none'}
                            />
                          ))}
                        </div>
                        {f.comment && <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5">{f.comment}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : null}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'brand';
}) {
  return (
    <div
      className={
        'rounded-lg border p-2.5 text-center ' +
        (tone === 'brand'
          ? 'border-brand-200 bg-brand-50/50 dark:border-brand-900/40 dark:bg-brand-900/10'
          : 'border-zinc-200 dark:border-zinc-800')
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div
        className={
          'text-sm font-semibold mt-1 tabular-nums ' +
          (tone === 'brand' ? 'text-brand-700 dark:text-brand-300' : '')
        }
      >
        {value}
      </div>
    </div>
  );
}
