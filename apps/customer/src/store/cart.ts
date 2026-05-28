'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartModifier {
  id: string;
  name: string;
  priceDelta: number;
}

export interface CartLine {
  /** Stable id per cart line — same menuItemId + same modifier set = same line. */
  lineId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  isVeg: boolean;
  imageUrl: string | null;
  modifiers: CartModifier[];
  cookingNotes?: string;
}

function lineKeyFor(menuItemId: string, modifierIds: string[]): string {
  return `${menuItemId}::${[...modifierIds].sort().join(',')}`;
}

interface CartState {
  token: string | null;
  lines: CartLine[];
  setToken: (token: string) => void;
  add: (input: {
    menuItemId: string;
    name: string;
    unitPrice: number;
    isVeg: boolean;
    imageUrl: string | null;
    modifiers: CartModifier[];
  }) => void;
  inc: (lineId: string) => void;
  dec: (lineId: string) => void;
  setNotes: (lineId: string, notes: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      token: null,
      lines: [],
      setToken: (token) => {
        if (get().token !== token) set({ token, lines: [] });
      },
      add: (input) =>
        set((s) => {
          const modIds = input.modifiers.map((m) => m.id);
          const key = lineKeyFor(input.menuItemId, modIds);
          const existing = s.lines.find((l) => l.lineId === key);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.lineId === key ? { ...l, quantity: l.quantity + 1 } : l,
              ),
            };
          }
          return {
            lines: [
              ...s.lines,
              { ...input, lineId: key, quantity: 1 },
            ],
          };
        }),
      inc: (lineId) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        })),
      dec: (lineId) =>
        set((s) => ({
          lines: s.lines
            .map((l) =>
              l.lineId === lineId ? { ...l, quantity: l.quantity - 1 } : l,
            )
            .filter((l) => l.quantity > 0),
        })),
      setNotes: (lineId, notes) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.lineId === lineId ? { ...l, cookingNotes: notes } : l)),
        })),
      remove: (lineId) => set((s) => ({ lines: s.lines.filter((l) => l.lineId !== lineId) })),
      clear: () => set({ lines: [] }),
      subtotal: () =>
        get().lines.reduce(
          (s, l) =>
            s +
            (l.unitPrice + l.modifiers.reduce((mm, m) => mm + m.priceDelta, 0)) * l.quantity,
          0,
        ),
      itemCount: () => get().lines.reduce((s, l) => s + l.quantity, 0),
    }),
    {
      name: 'qrder-cart',
      partialize: (s) => ({ token: s.token, lines: s.lines }),
    },
  ),
);
