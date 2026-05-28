'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Plus, Minus, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { MenuCategory, MenuItem, ModifierOption } from '@/lib/types';
import { PosModifierPicker } from './modifier-picker';

export interface DraftItem {
  menuItemId: string;
  quantity: number;
  modifierIds: string[];
}

interface CartLine {
  lineId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  modifiers: ModifierOption[];
  quantity: number;
}

interface Props {
  mode: 'create' | 'add';
  submitting: boolean;
  onClose: () => void;
  onSubmit: (items: DraftItem[]) => void;
}

function lineKey(menuItemId: string, modifierIds: string[]): string {
  return `${menuItemId}::${[...modifierIds].sort().join(',')}`;
}

export function MenuDrawer({ mode, submitting, onClose, onSubmit }: Props) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCat, setActiveCat] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');
  const [pickerFor, setPickerFor] = useState<MenuItem | null>(null);

  const cats = useQuery({
    queryKey: ['pos-menu-categories'],
    queryFn: () => apiFetch<{ items: MenuCategory[] }>('/v1/menu/categories'),
  });
  const items = useQuery({
    queryKey: ['pos-menu-items'],
    queryFn: () => apiFetch<{ items: MenuItem[] }>('/v1/menu/items'),
  });

  const visibleItems = useMemo(() => {
    let rows = (items.data?.items ?? []).filter((i) => i.isAvailable);
    if (activeCat !== 'all') rows = rows.filter((i) => i.categoryId === activeCat);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((i) => i.name.toLowerCase().includes(q));
    }
    return rows;
  }, [items.data?.items, activeCat, query]);

  const totalCount = cart.reduce((s, l) => s + l.quantity, 0);
  const totalAmount = cart.reduce(
    (s, l) =>
      s + (l.unitPrice + l.modifiers.reduce((mm, m) => mm + m.priceDelta, 0)) * l.quantity,
    0,
  );

  const addToCart = (item: MenuItem, modifiers: ModifierOption[]) => {
    const modifierIds = modifiers.map((m) => m.id);
    const key = lineKey(item.id, modifierIds);
    setCart((c) => {
      const ex = c.find((l) => l.lineId === key);
      if (ex) return c.map((l) => (l.lineId === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...c,
        {
          lineId: key,
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.basePrice,
          modifiers,
          quantity: 1,
        },
      ];
    });
  };

  const incAdd = (item: MenuItem) => {
    if ((item.modifierGroups?.length ?? 0) > 0) {
      setPickerFor(item);
      return;
    }
    addToCart(item, []);
  };

  const dec = (lineId: string) =>
    setCart((c) =>
      c
        .map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );

  return (
    <div className="fixed inset-0 z-30 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside
        className="w-full max-w-xl h-full flex flex-col border-l"
        style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--card))' }}
      >
        <header
          className="px-4 py-3 border-b flex items-center gap-3"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <h2 className="font-semibold flex-1">
            {mode === 'create' ? 'Start order' : 'Add items'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </header>

        <div
          className="px-4 py-2 border-b flex items-center gap-2"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <Search size={14} className="text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
            className="flex-1 bg-transparent text-sm outline-none py-1"
          />
        </div>

        <div
          className="px-4 py-2 border-b overflow-x-auto"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <div className="flex gap-2 whitespace-nowrap">
            <Chip active={activeCat === 'all'} onClick={() => setActiveCat('all')} label="All" />
            {cats.data?.items.map((c) => (
              <Chip
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                label={c.name}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {visibleItems.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">No items match.</div>
          ) : (
            visibleItems.map((item) => {
              const hasMods = (item.modifierGroups?.length ?? 0) > 0;
              const line = !hasMods
                ? cart.find((l) => l.menuItemId === item.id && l.modifiers.length === 0)
                : undefined;
              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-3 flex items-center gap-3"
                  style={{ borderColor: 'rgb(var(--border))' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          'inline-flex h-3 w-3 items-center justify-center rounded-sm border ' +
                          (item.isVeg ? 'border-green-600' : 'border-red-600')
                        }
                      >
                        <span
                          className={
                            'h-1.5 w-1.5 rounded-full ' +
                            (item.isVeg ? 'bg-green-600' : 'bg-red-600')
                          }
                        />
                      </span>
                      <div className="font-medium truncate">{item.name}</div>
                      {hasMods && (
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-brand-50 text-brand-700 px-1.5 py-0.5">
                          options
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {formatMoney(item.basePrice)}
                    </div>
                  </div>
                  {line ? (
                    <div
                      className="inline-flex items-center rounded-full border"
                      style={{ borderColor: 'rgb(var(--border))' }}
                    >
                      <button className="px-3 py-1.5" onClick={() => dec(line.lineId)}>
                        <Minus size={14} />
                      </button>
                      <span className="px-1 text-sm font-medium w-6 text-center">
                        {line.quantity}
                      </span>
                      <button className="px-3 py-1.5" onClick={() => incAdd(item)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => incAdd(item)}
                      className="rounded-full bg-brand-600 text-white px-4 py-1.5 text-xs font-medium hover:bg-brand-700"
                    >
                      {hasMods ? 'Customize' : '+ Add'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div
            className="px-3 py-2 border-t max-h-40 overflow-y-auto"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            {cart.map((l) => (
              <div key={l.lineId} className="flex items-center justify-between text-xs py-1">
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {l.quantity}× {l.name}
                  </div>
                  {l.modifiers.length > 0 && (
                    <div className="text-[10px] text-zinc-500 truncate">
                      {l.modifiers.map((m) => m.name).join(', ')}
                    </div>
                  )}
                </div>
                <button onClick={() => dec(l.lineId)} className="p-0.5 text-red-600">
                  <Minus size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <footer
          className="border-t p-3 space-y-2"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: 'rgb(var(--muted-foreground))' }}>
              {totalCount} item{totalCount === 1 ? '' : 's'}
            </span>
            <span className="font-medium">{formatMoney(totalAmount)}</span>
          </div>
          <button
            disabled={submitting || cart.length === 0}
            onClick={() =>
              onSubmit(
                cart.map((l) => ({
                  menuItemId: l.menuItemId,
                  quantity: l.quantity,
                  modifierIds: l.modifiers.map((m) => m.id),
                })),
              )
            }
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting
              ? mode === 'create'
                ? 'Placing order…'
                : 'Adding…'
              : mode === 'create'
                ? `Place order · ${formatMoney(totalAmount)}`
                : `Add ${totalCount} item${totalCount === 1 ? '' : 's'}`}
          </button>
        </footer>
      </aside>

      {pickerFor && (
        <PosModifierPicker
          item={pickerFor}
          onClose={() => setPickerFor(null)}
          onConfirm={(selected) => {
            addToCart(pickerFor, selected);
            setPickerFor(null);
          }}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-full px-3 py-1 text-sm border ' +
        (active ? 'bg-brand-600 border-brand-600 text-white' : '')
      }
      style={active ? undefined : { borderColor: 'rgb(var(--border))' }}
    >
      {label}
    </button>
  );
}
