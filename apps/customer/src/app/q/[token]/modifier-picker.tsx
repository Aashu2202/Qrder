'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { MenuItem, ModifierGroup, ModifierOption } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface Props {
  item: MenuItem;
  currency: string;
  onClose: () => void;
  onConfirm: (selected: ModifierOption[]) => void;
}

export function ModifierPicker({ item, currency, onClose, onConfirm }: Props) {
  const groups = item.modifierGroups ?? [];
  const [selected, setSelected] = useState<Map<string, Set<string>>>(() => {
    const m = new Map<string, Set<string>>();
    for (const g of groups) {
      const def = new Set(g.modifiers.filter((m) => m.isDefault).map((m) => m.id));
      if (g.selectionType === 'single' && def.size === 0 && g.minSelect > 0 && g.modifiers[0]) {
        def.add(g.modifiers[0].id);
      }
      m.set(g.id, def);
    }
    return m;
  });

  useEffect(() => {
    if (groups.length === 0) {
      onConfirm([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (group: ModifierGroup, modId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(group.id));
      if (group.selectionType === 'single') {
        set.clear();
        set.add(modId);
      } else {
        if (set.has(modId)) set.delete(modId);
        else if (set.size < group.maxSelect) set.add(modId);
      }
      next.set(group.id, set);
      return next;
    });
  };

  const allSelected = useMemo(() => {
    const out: ModifierOption[] = [];
    for (const g of groups) {
      const ids = selected.get(g.id) ?? new Set();
      for (const m of g.modifiers) if (ids.has(m.id)) out.push(m);
    }
    return out;
  }, [selected, groups]);

  const deltaSum = allSelected.reduce((s, m) => s + m.priceDelta, 0);
  const finalPrice = item.basePrice + deltaSum;

  const valid = useMemo(() => {
    for (const g of groups) {
      const count = (selected.get(g.id) ?? new Set()).size;
      if (count < g.minSelect) return false;
      if (count > g.maxSelect) return false;
    }
    return true;
  }, [selected, groups]);

  if (groups.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-200 bg-white max-h-[85vh] overflow-hidden flex flex-col shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="flex items-start justify-between p-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="font-semibold text-base tracking-tight truncate text-zinc-900 dark:text-zinc-50">
              {item.name}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Customize before adding</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {groups.map((g) => {
            const ids = selected.get(g.id) ?? new Set();
            const isSingle = g.selectionType === 'single';
            return (
              <section key={g.id}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {g.name}
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                    {isSingle
                      ? 'Pick one'
                      : `Pick ${g.minSelect}${g.minSelect !== g.maxSelect ? `–${g.maxSelect}` : ''}`}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {g.modifiers.map((m) => {
                    const checked = ids.has(m.id);
                    return (
                      <li key={m.id}>
                        <motion.button
                          whileTap={{ scale: 0.99 }}
                          onClick={() => toggle(g, m.id)}
                          className={
                            'w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition border ' +
                            (checked
                              ? 'border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100 dark:border-brand-500'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800')
                          }
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={
                                'grid place-items-center h-4 w-4 ' +
                                (isSingle ? 'rounded-full' : 'rounded-sm') +
                                ' border-2 ' +
                                (checked
                                  ? 'border-brand-500 bg-brand-500'
                                  : 'border-zinc-300 dark:border-zinc-600')
                              }
                            >
                              {checked && (
                                isSingle ? (
                                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                ) : (
                                  <Check size={10} className="text-white" strokeWidth={4} />
                                )
                              )}
                            </span>
                            <span className="font-medium">{m.name}</span>
                          </div>
                          <span
                            className={
                              'text-xs tabular-nums ' +
                              (m.priceDelta === 0
                                ? 'text-zinc-500'
                                : m.priceDelta > 0
                                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                  : 'text-red-600 dark:text-red-400 font-medium')
                            }
                          >
                            {m.priceDelta === 0
                              ? '—'
                              : `${m.priceDelta > 0 ? '+' : '−'}${formatMoney(Math.abs(m.priceDelta), currency)}`}
                          </span>
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            variant="gradient"
            size="lg"
            disabled={!valid}
            onClick={() => onConfirm(allSelected)}
            className="w-full rounded-xl"
          >
            Add · {formatMoney(finalPrice, currency)}
          </Button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
