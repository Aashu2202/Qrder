'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, Minus, ShoppingCart, Languages, Sparkles, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/store/cart';
import { useLocale, LOCALE_LABELS } from '@/store/locale';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { PublicMenu, PublicResolve, MenuItem } from '@/lib/types';
import { ModifierPicker } from './modifier-picker';
import { Badge } from '@/components/ui/badge';

interface Props {
  token: string;
  resolved: PublicResolve;
  initialMenu: PublicMenu;
}

function nameOf(item: { name: string; localizedName?: string }) {
  return item.localizedName || item.name;
}
function descOf(item: { description: string | null; localizedDescription?: string | null }) {
  return item.localizedDescription ?? item.description;
}

export function MenuView({ token, resolved, initialMenu }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const cart = useCart();
  const setToken = useCart((s) => s.setToken);
  const locale = useLocale((s) => s.locale);

  useEffect(() => {
    setToken(token);
  }, [token, setToken]);

  const { data: localizedMenu } = useQuery({
    queryKey: ['menu', token, locale],
    queryFn: () => apiFetch<PublicMenu>(`/q/${token}/menu?locale=${locale}`),
    initialData: locale === 'en' ? initialMenu : undefined,
    staleTime: 60_000,
  });

  const menu = localizedMenu ?? initialMenu;

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return menu.items;
    return menu.items.filter((i) => i.categoryId === activeCategory);
  }, [activeCategory, menu.items]);

  const itemsByCategory = useMemo(() => {
    const m = new Map<string, MenuItem[]>();
    for (const item of menu.items) {
      const list = m.get(item.categoryId) ?? [];
      list.push(item);
      m.set(item.categoryId, list);
    }
    return m;
  }, [menu.items]);

  const cartTotal = cart.subtotal();
  const cartCount = cart.itemCount();

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-white/85 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/85">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          {resolved.tenant.logoUrl ? (
            <Image
              src={resolved.tenant.logoUrl}
              alt={resolved.tenant.name}
              width={40}
              height={40}
              className="rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-800"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white grid place-items-center font-semibold shadow-md">
              {resolved.tenant.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold tracking-tight truncate text-zinc-900 dark:text-zinc-50">
              {resolved.tenant.name}
            </div>
            <div className="text-xs text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-px text-[10px] font-medium dark:bg-zinc-800">
                Table {resolved.table.number}
              </span>
              <span className="truncate">{resolved.branch.name}</span>
            </div>
          </div>
          <LocaleSwitcher available={resolved.tenant.supportedLocales} />
        </div>

        <div className="mx-auto max-w-2xl px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 whitespace-nowrap">
            <Chip
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              label="All"
              count={menu.items.length}
            />
            {menu.categories.map((c) => {
              const count = itemsByCategory.get(c.id)?.length ?? 0;
              if (count === 0) return null;
              return (
                <Chip
                  key={c.id}
                  active={activeCategory === c.id}
                  onClick={() => setActiveCategory(c.id)}
                  label={nameOf(c)}
                  count={count}
                />
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-3">
        {activeCategory === 'all' && (
          <TrendingStrip token={token} currency={resolved.tenant.currency} menu={menu} />
        )}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center text-sm text-zinc-500">No items in this category yet.</div>
        ) : (
          <motion.div
            layout
            className="space-y-3"
            transition={{ layout: { duration: 0.18 } }}
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.2) }}
                >
                  <ItemCard item={item} currency={resolved.tenant.currency} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(100%-1.5rem,42rem)] z-30"
          >
            <Link
              href={`/q/${token}/cart`}
              className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3.5 text-white shadow-2xl shadow-brand-600/40 active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative">
                  <ShoppingCart size={20} />
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                    className="absolute -top-1.5 -right-2 grid h-4 w-4 place-items-center rounded-full bg-white text-brand-600 text-[10px] font-bold"
                  >
                    {cartCount}
                  </motion.span>
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">
                    {cartCount} item{cartCount > 1 ? 's' : ''} in cart
                  </span>
                  <span className="text-[11px] text-white/80 tabular-nums">
                    {formatMoney(cartTotal, resolved.tenant.currency)}
                  </span>
                </div>
              </div>
              <span className="text-sm font-semibold inline-flex items-center gap-1">
                View cart
                <span aria-hidden>→</span>
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium border transition ' +
        (active
          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white'
          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800')
      }
    >
      {label}
      <span className={active ? 'text-white/70 dark:text-zinc-700' : 'text-zinc-400'}>{count}</span>
    </button>
  );
}

function ItemCard({ item, currency }: { item: MenuItem; currency: string }) {
  const cart = useCart();
  const line = cart.lines.find((l) => l.menuItemId === item.id);
  const hasModifiers = (item.modifierGroups?.length ?? 0) > 0;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const displayName = nameOf(item);
  const displayDesc = descOf(item);
  const openOrAdd = () => {
    if (hasModifiers) {
      setPickerOpen(true);
    } else {
      cart.add({
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.basePrice,
        isVeg: item.isVeg,
        imageUrl: item.imageUrl,
        modifiers: [],
      });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 600);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 flex gap-3 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] transition-shadow dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={
              'inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 shrink-0 ' +
              (item.isVeg ? 'border-emerald-600' : 'border-red-600')
            }
            aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
          >
            <span
              className={
                'h-1.5 w-1.5 rounded-full ' + (item.isVeg ? 'bg-emerald-600' : 'bg-red-600')
              }
            />
          </span>
          <h3 className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50 truncate">
            {displayName}
          </h3>
          {item.spicyLevel > 0 && (
            <span className="text-red-500 flex items-center shrink-0">
              {Array.from({ length: item.spicyLevel }).map((_, i) => (
                <Flame key={i} size={11} />
              ))}
            </span>
          )}
        </div>
        {displayDesc && (
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">{displayDesc}</p>
        )}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {item.isOnSale && item.effectivePrice !== undefined ? (
            <>
              <span className="text-base font-semibold text-brand-700 dark:text-brand-300 tabular-nums">
                {formatMoney(item.effectivePrice, currency)}
              </span>
              <span className="text-xs text-zinc-500 line-through tabular-nums">
                {formatMoney(item.basePrice, currency)}
              </span>
              <Badge tone="brand">Sale</Badge>
            </>
          ) : (
            <span className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatMoney(item.basePrice, currency)}
            </span>
          )}
          {item.prepTimeMinutes && (
            <span className="text-xs text-zinc-500">· {item.prepTimeMinutes} min</span>
          )}
          {hasModifiers && (
            <span className="text-[10px] uppercase tracking-wide text-brand-700 dark:text-brand-300 font-medium">
              Customizable
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center">
          {item.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl">🍴</span>
          )}
          <AnimatePresence>
            {justAdded && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 grid place-items-center bg-emerald-500/90 text-white"
              >
                <Check size={28} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {line && !hasModifiers ? (
          <motion.div
            layout
            className="inline-flex items-center rounded-full bg-brand-600 text-white shadow-md"
          >
            <button
              className="grid h-8 w-8 place-items-center active:scale-95 transition"
              onClick={() => cart.dec(line.lineId)}
              aria-label="Decrease"
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
              className="grid h-8 w-8 place-items-center active:scale-95 transition"
              onClick={() => cart.inc(line.lineId)}
              aria-label="Increase"
            >
              <Plus size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openOrAdd}
            className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
          >
            {hasModifiers ? 'Customize' : '+ Add'}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <ModifierPicker
            item={item}
            currency={currency}
            onClose={() => setPickerOpen(false)}
            onConfirm={(selected) => {
              cart.add({
                menuItemId: item.id,
                name: item.name,
                unitPrice: item.basePrice,
                isVeg: item.isVeg,
                imageUrl: item.imageUrl,
                modifiers: selected.map((m) => ({
                  id: m.id,
                  name: m.name,
                  priceDelta: m.priceDelta,
                })),
              });
              setPickerOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface TrendingItem {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  isVeg: boolean;
  qty?: number;
}

function TrendingStrip({
  token,
  currency,
  menu,
}: {
  token: string;
  currency: string;
  menu: PublicMenu;
}) {
  const cart = useCart();
  const { data } = useQuery({
    queryKey: ['trending', token],
    queryFn: () => apiFetch<{ items: TrendingItem[] }>(`/q/${token}/recommendations`),
    staleTime: 5 * 60_000,
  });

  const items = (data?.items ?? []).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-amber-50 p-3 shadow-[var(--shadow-soft)] dark:border-brand-900/40 dark:from-brand-950/30 dark:via-zinc-900 dark:to-zinc-900"
    >
      <h3 className="text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 text-brand-700 dark:text-brand-300 mb-3 px-1">
        <Sparkles size={12} /> Trending this month
      </h3>
      <div className="flex gap-2 overflow-x-auto -mx-3 px-3 pb-1">
        {items.map((it) => {
          const full = menu.items.find((m) => m.id === it.id);
          return (
            <motion.button
              key={it.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (!full) return;
                if ((full.modifierGroups?.length ?? 0) > 0) return;
                cart.add({
                  menuItemId: full.id,
                  name: full.name,
                  unitPrice: full.effectivePrice ?? full.basePrice,
                  isVeg: full.isVeg,
                  imageUrl: full.imageUrl,
                  modifiers: [],
                });
              }}
              className="flex-shrink-0 w-32 text-left rounded-xl border border-zinc-200 bg-white p-2 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-2 grid place-items-center">
                {it.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-2xl">🍴</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={
                    'inline-flex h-2.5 w-2.5 items-center justify-center rounded-sm border ' +
                    (it.isVeg ? 'border-emerald-600' : 'border-red-600')
                  }
                >
                  <span
                    className={'h-1 w-1 rounded-full ' + (it.isVeg ? 'bg-emerald-600' : 'bg-red-600')}
                  />
                </span>
                <span className="text-xs font-medium truncate">{it.name}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                {formatMoney(it.basePrice, currency)}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

function LocaleSwitcher({ available }: { available: string[] }) {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const list = available.length > 1 ? available : [];
  if (list.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="Change language"
      >
        <Languages size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-200 bg-white shadow-xl z-30 overflow-hidden p-1 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {list.map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={
                    'w-full text-left px-2.5 py-1.5 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ' +
                    (code === locale
                      ? 'font-semibold text-brand-700 dark:text-brand-300'
                      : 'text-zinc-700 dark:text-zinc-300')
                  }
                >
                  {LOCALE_LABELS[code] ?? code}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
