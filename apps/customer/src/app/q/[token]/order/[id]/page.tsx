'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Bell, Star, Plus, Receipt, PartyPopper } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import type { OrderDetail, PublicResolve } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PayNowButton } from './pay-button';

const STEPS = [
  { key: 'placed', label: 'Placed', emoji: '📝' },
  { key: 'accepted', label: 'Accepted', emoji: '✅' },
  { key: 'preparing', label: 'Preparing', emoji: '👨‍🍳' },
  { key: 'ready', label: 'Ready', emoji: '🛎️' },
  { key: 'served', label: 'Served', emoji: '🍽️' },
] as const;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

interface Props {
  params: Promise<{ token: string; id: string }>;
}

export default function OrderTrackingPage({ params }: Props) {
  const { token, id } = use(params);
  const queryClient = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ['order', token, id],
    queryFn: () => apiFetch<OrderDetail>(`/q/${token}/orders/${id}`),
    refetchInterval: 10_000,
  });

  const { data: resolved } = useQuery({
    queryKey: ['resolve', token],
    queryFn: () => apiFetch<PublicResolve>(`/q/${token}`),
    staleTime: 5 * 60_000,
  });

  const callWaiter = useMutation({
    mutationFn: (reason: 'service' | 'bill' | 'water') =>
      apiFetch(`/q/${token}/waiter-call`, { method: 'POST', json: { reason } }),
    onSuccess: () => {
      toast.success('A waiter is on the way 👋');
    },
  });

  useEffect(() => {
    const socket = io(WS_URL, {
      auth: { qrToken: token },
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => {
      socket.emit('order:join', id);
    });
    socket.on('order:status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['order', token, id] });
    });
    socket.on('order:item_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['order', token, id] });
    });
    return () => {
      socket.disconnect();
    };
  }, [token, id, queryClient]);

  if (!order) {
    return (
      <div className="min-h-screen p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;
  const progressPct = ((activeIdx + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/85 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/85">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Link
            href={`/q/${token}`}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Order #{order.orderNumber}</h1>
            <div className="text-xs text-zinc-500">
              Placed {new Date(order.placedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-5">
        {/* Hero status card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-amber-50 p-5 shadow-[var(--shadow-soft)] dark:border-brand-900/40 dark:from-brand-950/40 dark:via-zinc-900 dark:to-zinc-900"
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-brand-300/30 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <motion.div
                key={order.status}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="text-4xl"
              >
                {STEPS[activeIdx]?.emoji}
              </motion.div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Status</p>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {STEPS[activeIdx]?.label}
                </h2>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
              />
            </div>
            <ol className="mt-4 grid grid-cols-5 gap-1 text-[10px] text-center">
              {STEPS.map((step, i) => {
                const done = i <= activeIdx;
                const current = i === activeIdx;
                return (
                  <li key={step.key} className="flex flex-col items-center gap-1">
                    <motion.span
                      animate={{ scale: current ? [1, 1.15, 1] : 1 }}
                      transition={{ repeat: current ? Infinity : 0, duration: 1.6 }}
                      className={
                        'grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ' +
                        (done
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500')
                      }
                    >
                      {done ? <Check size={11} /> : i + 1}
                    </motion.span>
                    <span
                      className={
                        done
                          ? 'font-medium text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-500'
                      }
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </motion.section>

        {/* Items + bill */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3 shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-zinc-500" />
            <h2 className="text-sm font-semibold tracking-tight">Your order</h2>
          </div>
          <ul className="space-y-1.5">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between text-sm">
                <span className="text-zinc-900 dark:text-zinc-100">
                  <span className="tabular-nums font-medium">{it.quantity}×</span> {it.nameSnapshot}
                </span>
                <span className="tabular-nums">{formatMoney(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="tabular-nums">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tax</span>
              <span className="tabular-nums">{formatMoney(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(order.totalAmount)}</span>
            </div>
          </div>
        </section>

        {order.status !== 'completed' &&
          order.status !== 'canceled' &&
          order.status !== 'rejected' && (
            <section className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => callWaiter.mutate('service')}
                disabled={callWaiter.isPending}
                leftIcon={<Bell size={14} />}
                className="rounded-xl"
              >
                Call waiter
              </Button>
              <Button
                variant="outline"
                onClick={() => callWaiter.mutate('bill')}
                disabled={callWaiter.isPending}
                leftIcon={<Receipt size={14} />}
                className="rounded-xl"
              >
                Request bill
              </Button>
            </section>
          )}

        {order.status === 'served' && <FeedbackSection token={token} orderId={order.id} />}

        {order.status !== 'completed' &&
          order.status !== 'canceled' &&
          order.status !== 'rejected' && (
            <section className="space-y-2">
              <PayNowButton
                token={token}
                orderId={order.id}
                tenantName={resolved?.tenant.name ?? 'Restaurant'}
              />
              <p className="text-[11px] text-center text-zinc-500">
                You can also pay at the counter — just ask the waiter.
              </p>
            </section>
          )}

        <AnimatePresence>
          {order.status === 'completed' && (
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 px-4 py-4 text-center text-emerald-900 border border-emerald-200 dark:from-emerald-950/40 dark:to-emerald-900/30 dark:text-emerald-200 dark:border-emerald-900/40"
            >
              <PartyPopper className="mx-auto mb-1" size={24} />
              <p className="text-sm font-semibold">Paid · Thank you!</p>
              <p className="text-xs mt-0.5 text-emerald-700 dark:text-emerald-300/80">
                Come back soon ✨
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="flex justify-center">
          <Link href={`/q/${token}`}>
            <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />}>
              Add more items
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function FeedbackSection({ token, orderId }: { token: string; orderId: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      apiFetch(`/q/${token}/orders/${orderId}/feedback`, {
        method: 'POST',
        json: { rating: rating!, comment: comment || undefined },
      }),
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Thanks for the feedback ❤️');
    },
  });

  if (submitted) {
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-center dark:border-zinc-800 dark:bg-zinc-900"
      >
        ❤️ Thanks for the feedback!
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold tracking-tight text-center">How was your meal?</h2>
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            whileTap={{ scale: 0.88 }}
            onClick={() => setRating(n)}
            aria-label={`${n} star`}
            className="p-2"
          >
            <Star
              size={32}
              className={
                'transition ' +
                (n <= (rating ?? 0) ? 'text-amber-500 drop-shadow-sm' : 'text-zinc-300 dark:text-zinc-600')
              }
              fill={n <= (rating ?? 0) ? 'currentColor' : 'none'}
              strokeWidth={1.5}
            />
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {rating !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Tell us more (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <Button
              variant="gradient"
              size="md"
              loading={submit.isPending}
              className="w-full rounded-xl"
              onClick={() => submit.mutate()}
            >
              Submit feedback
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
