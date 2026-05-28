'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { MenuItem, ModifierGroup, ModifierOption } from '@/lib/types';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onConfirm: (selected: ModifierOption[]) => void;
}

export function PosModifierPicker({ item, onClose, onConfirm }: Props) {
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

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border max-h-[85vh] overflow-hidden flex flex-col"
        style={{ background: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
      >
        <header
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <h2 className="font-semibold">{item.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groups.map((g) => {
            const ids = selected.get(g.id) ?? new Set();
            const isSingle = g.selectionType === 'single';
            return (
              <section key={g.id}>
                <h3 className="text-sm font-medium">{g.name}</h3>
                <p className="text-xs mb-2" style={{ color: 'rgb(var(--muted-foreground))' }}>
                  {isSingle
                    ? 'Pick one'
                    : `Pick ${g.minSelect}${g.minSelect !== g.maxSelect ? `–${g.maxSelect}` : ''}`}
                </p>
                <ul className="space-y-1.5">
                  {g.modifiers.map((m) => {
                    const checked = ids.has(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          onClick={() => toggle(g, m.id)}
                          className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          style={{
                            borderColor: checked ? '#ea580c' : 'rgb(var(--border))',
                            borderWidth: checked ? 2 : 1,
                          }}
                        >
                          <span>{m.name}</span>
                          <span className="text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>
                            {m.priceDelta === 0
                              ? '—'
                              : `${m.priceDelta > 0 ? '+' : '−'}${formatMoney(Math.abs(m.priceDelta))}`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer
          className="p-3 border-t"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <button
            disabled={!valid}
            onClick={() => onConfirm(allSelected)}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Add · {formatMoney(finalPrice)}
          </button>
        </footer>
      </div>
    </div>
  );
}
