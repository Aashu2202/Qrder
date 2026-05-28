'use client';

import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Receipt, Sparkles, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/store/cart';
import { formatMoney } from '@/lib/money';
import { apiFetch, type ApiError } from '@/lib/api';
import type { OrderDetail } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ token: string }>;
}

export default function CartPage({ params }: Props) {
  const { token } = use(params);
  const router = useRouter();
  const cart = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const subtotal = cart.subtotal();
  const taxEstimate = Math.round(subtotal * 0.05);
  const total = subtotal + taxEstimate;

  if (cart.lines.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-sm"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-zinc-100 grid place-items-center text-zinc-400 dark:bg-zinc-800">
            <ShoppingBag size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">Your cart is empty</h1>
            <p className="text-sm text-zinc-500">Add a few delicious items to get started.</p>
          </div>
          <Link href={`/q/${token}`}>
            <Button variant="gradient" size="md" className="w-full">
              Browse menu
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const phoneTrimmed = customerPhone.replace(/\s+/g, '');
  const phoneValid = phoneTrimmed === '' || /^[+\d][\d\s\-()]{6,}$/.test(customerPhone);

  const place = async () => {
    if (!phoneValid) {
      toast.error('Please enter a valid phone number, or leave it blank');
      return;
    }
    setSubmitting(true);
    try {
      const order = await apiFetch<OrderDetail>(`/q/${token}/orders`, {
        method: 'POST',
        json: {
          items: cart.lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            cookingNotes: l.cookingNotes,
            modifierIds: l.modifiers.map((m) => m.id),
          })),
          notes: notes || undefined,
          customerName: customerName.trim() || undefined,
          customerPhone: phoneTrimmed || undefined,
        },
      });
      cart.clear();
      toast.success(
        phoneTrimmed ? 'Order placed! Loyalty points incoming 🎁' : 'Order placed!',
      );
      router.replace(`/q/${token}/order/${order.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.detail ?? apiErr.title ?? 'Could not place order');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/85 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/85">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Link
            href={`/q/${token}`}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Your cart</h1>
            <p className="text-xs text-zinc-500">{cart.itemCount()} items</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-3">
        <motion.div layout className="space-y-3">
          <AnimatePresence>
            {cart.lines.map((line) => {
              const modTotal = line.modifiers.reduce((s, m) => s + m.priceDelta, 0);
              const unitWithMods = line.unitPrice + modTotal;
              return (
                <motion.div
                  key={line.lineId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.22 }}
                  className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            'inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border-2 shrink-0 ' +
                            (line.isVeg ? 'border-emerald-600' : 'border-red-600')
                          }
                        >
                          <span
                            className={
                              'h-1.5 w-1.5 rounded-full ' +
                              (line.isVeg ? 'bg-emerald-600' : 'bg-red-600')
                            }
                          />
                        </span>
                        <h3 className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                          {line.name}
                        </h3>
                      </div>
                      {line.modifiers.length > 0 && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {line.modifiers.map((m) => m.name).join(' · ')}
                        </p>
                      )}
                      <div className="mt-1 text-xs text-zinc-500 tabular-nums">
                        {formatMoney(unitWithMods)} each
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">
                        {formatMoney(unitWithMods * line.quantity)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      <button
                        className="grid h-8 w-8 place-items-center rounded-l-full hover:bg-brand-100 dark:hover:bg-brand-900/50 transition"
                        onClick={() => cart.dec(line.lineId)}
                      >
                        <Minus size={14} />
                      </button>
                      <motion.span
                        key={line.quantity}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                        className="px-2 text-sm font-semibold min-w-[24px] text-center tabular-nums"
                      >
                        {line.quantity}
                      </motion.span>
                      <button
                        className="grid h-8 w-8 place-items-center rounded-r-full hover:bg-brand-100 dark:hover:bg-brand-900/50 transition"
                        onClick={() => cart.inc(line.lineId)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="text-xs font-medium text-red-600 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      onClick={() => cart.remove(line.lineId)}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Cooking notes (optional)"
                    value={line.cookingNotes ?? ''}
                    onChange={(e) => cart.setNotes(line.lineId, e.target.value)}
                    className="mt-3 w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        <textarea
          rows={2}
          maxLength={280}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note for the kitchen / waiter (optional)"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-900"
        />

        <motion.section
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-amber-50 p-4 shadow-[var(--shadow-soft)] dark:border-brand-900/40 dark:from-brand-950/30 dark:via-zinc-900 dark:to-zinc-900"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-500/15 text-brand-600 dark:text-brand-300">
              <Sparkles size={12} />
            </span>
            <h2 className="text-sm font-semibold tracking-tight">Earn loyalty points</h2>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
              Optional
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
            Add your name and phone to earn{' '}
            <span className="font-semibold text-brand-700 dark:text-brand-300">
              1 point per ₹10
            </span>{' '}
            on this order. Use them on future visits.
          </p>
          <div className="space-y-2">
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                inputMode="text"
                autoComplete="name"
                maxLength={64}
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-10 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={24}
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={
                  'w-full h-10 rounded-lg border bg-white pl-9 pr-3 text-sm outline-none transition focus:ring-2 dark:bg-zinc-950 ' +
                  (phoneValid
                    ? 'border-zinc-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-zinc-800'
                    : 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900/60')
                }
              />
            </div>
            {!phoneValid && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Enter a valid phone number, or leave it blank to skip.
              </p>
            )}
          </div>
        </motion.section>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2 text-sm shadow-[var(--shadow-soft)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={14} className="text-zinc-500" />
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Bill</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Subtotal</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Tax (est.)</span>
            <span className="tabular-nums">{formatMoney(taxEstimate)}</span>
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between font-semibold text-base">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
          </div>
        </div>
      </main>

      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-200/70 bg-white/95 backdrop-blur-md p-3 z-20 dark:border-zinc-800/70 dark:bg-zinc-950/95"
      >
        <div className="mx-auto max-w-2xl">
          <Button
            variant="gradient"
            size="lg"
            loading={submitting}
            disabled={submitting}
            onClick={place}
            className="w-full rounded-xl"
          >
            {submitting ? 'Placing order…' : `Place order · ${formatMoney(total)}`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
