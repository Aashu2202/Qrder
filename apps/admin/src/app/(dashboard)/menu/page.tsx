'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, UtensilsCrossed, Sliders, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { CategoryDialog } from './category-dialog';
import { ItemDialog } from './item-dialog';

export default function MenuPage() {
  const qc = useQueryClient();
  const [editingCat, setEditingCat] = useState<MenuCategory | 'new' | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | 'new' | null>(null);
  const [activeCat, setActiveCat] = useState<string | 'all'>('all');

  const cats = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => apiFetch<{ items: MenuCategory[] }>('/v1/menu/categories'),
    staleTime: 30_000,
  });

  const items = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => apiFetch<{ items: MenuItem[] }>('/v1/menu/items'),
    staleTime: 30_000,
  });

  const toggleAvail = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      apiFetch(`/v1/menu/items/${id}/availability`, {
        method: 'PATCH',
        json: { isAvailable },
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success(vars.isAvailable ? 'Item back in stock' : 'Item marked out of stock');
    },
    onError: () => toast.error('Failed to update availability'),
  });

  const delItem = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/menu/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Item deleted');
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const delCat = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/menu/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-categories'] });
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Category deleted');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to delete category'),
  });

  const visibleItems = useMemo(() => {
    if (!items.data) return [];
    return activeCat === 'all'
      ? items.data.items
      : items.data.items.filter((i) => i.categoryId === activeCat);
  }, [items.data, activeCat]);

  const loading = cats.isLoading || items.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu"
        description="Categories, items, and live availability"
        actions={
          <>
            <a href="/menu/modifiers">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight size={12} />}>
                <Sliders size={12} className="mr-0.5" /> Modifier groups
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingCat('new')}
              leftIcon={<Plus size={14} />}
            >
              Category
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => setEditingItem('new')}
              leftIcon={<Plus size={14} />}
            >
              Item
            </Button>
          </>
        }
      />

      {/* Category chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterChip
          active={activeCat === 'all'}
          onClick={() => setActiveCat('all')}
          label="All"
          count={items.data?.items.length ?? 0}
        />
        {cats.data?.items.map((c) => {
          const count = (items.data?.items ?? []).filter((i) => i.categoryId === c.id).length;
          return (
            <div key={c.id} className="inline-flex shrink-0 items-stretch rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveCat(c.id)}
                className={
                  'px-3 py-1 text-xs font-medium transition ' +
                  (activeCat === c.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800')
                }
              >
                {c.name}
                <span className={activeCat === c.id ? 'ml-1.5 text-white/70 dark:text-zinc-700' : 'ml-1.5 text-zinc-400'}>
                  {count}
                </span>
              </button>
              <button
                onClick={() => setEditingCat(c)}
                title="Edit category"
                className="border-l border-zinc-200 px-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete category "${c.name}"? Items must be empty.`)) delCat.mutate(c.id);
                }}
                title="Delete category"
                className="border-l border-zinc-200 px-2 text-red-600 hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950/40"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>

      <Card>
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 last:border-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed size={20} />}
            title="No items yet"
            description="Add your first menu item to start serving."
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setEditingItem('new')}
                leftIcon={<Plus size={14} />}
              >
                Add item
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/70">
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium">Availability</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visibleItems.map((it, idx) => {
                    const cat = cats.data?.items.find((c) => c.id === it.categoryId);
                    return (
                      <motion.tr
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.18, delay: idx * 0.012 }}
                        className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={
                                'inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border ' +
                                (it.isVeg ? 'border-emerald-600' : 'border-red-600')
                              }
                              title={it.isVeg ? 'Vegetarian' : 'Non-veg'}
                            >
                              <span
                                className={
                                  'h-1.5 w-1.5 rounded-full ' +
                                  (it.isVeg ? 'bg-emerald-600' : 'bg-red-600')
                                }
                              />
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {it.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">
                          {cat?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatMoney(it.basePrice)}
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <span
                              className={
                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' +
                                (it.isAvailable
                                  ? 'bg-emerald-500'
                                  : 'bg-zinc-300 dark:bg-zinc-700')
                              }
                            >
                              <input
                                type="checkbox"
                                checked={it.isAvailable}
                                onChange={(e) =>
                                  toggleAvail.mutate({ id: it.id, isAvailable: e.target.checked })
                                }
                                className="sr-only"
                              />
                              <motion.span
                                layout
                                transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                                className={
                                  'inline-block h-4 w-4 rounded-full bg-white shadow ' +
                                  (it.isAvailable ? 'translate-x-[18px]' : 'translate-x-0.5')
                                }
                              />
                            </span>
                            <Badge tone={it.isAvailable ? 'success' : 'neutral'} className="text-[10px]">
                              {it.isAvailable ? 'In stock' : 'Out of stock'}
                            </Badge>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-0.5">
                            <button
                              onClick={() => setEditingItem(it)}
                              className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${it.name}"?`)) delItem.mutate(it.id);
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
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editingCat && (
        <CategoryDialog
          category={editingCat === 'new' ? null : editingCat}
          onClose={() => setEditingCat(null)}
        />
      )}
      {editingItem && (
        <ItemDialog
          item={editingItem === 'new' ? null : editingItem}
          categories={cats.data?.items ?? []}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

function FilterChip({
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
        'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition border ' +
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
