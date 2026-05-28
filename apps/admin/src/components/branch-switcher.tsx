'use client';

import { useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBranches, useActiveBranchId, useSetBranch } from '@/lib/branch';

export function BranchSwitcher() {
  const { data } = useBranches();
  const activeId = useActiveBranchId();
  const setBranch = useSetBranch();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const branches = data?.items ?? [];
  if (branches.length === 0) return null;

  const active = branches.find((b) => b.id === activeId) ?? branches[0];
  if (!active) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border px-3 py-1.5 text-sm flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <Building2 size={14} />
        <span className="font-medium">{active.name}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-56 rounded-md border shadow-lg z-30 overflow-hidden"
            style={{ background: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
          >
            <div
              className="px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500 border-b"
              style={{ borderColor: 'rgb(var(--border))' }}
            >
              Switch branch
            </div>
            {branches.map((b) => {
              const isActive = b.id === activeId;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setBranch(b.id);
                    // Invalidate everything branch-scoped so views refresh with the new branch's data
                    qc.invalidateQueries({ queryKey: ['tables'] });
                    qc.invalidateQueries({ queryKey: ['orders'] });
                    qc.invalidateQueries({ queryKey: ['kds-queue'] });
                    setOpen(false);
                  }}
                  className={
                    'w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-between ' +
                    (isActive ? 'font-medium' : '')
                  }
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="opacity-60" />
                    <span>{b.name}</span>
                    {!b.isActive && (
                      <span className="text-[10px] uppercase rounded-full bg-zinc-200 text-zinc-700 px-1.5 py-0.5">
                        Inactive
                      </span>
                    )}
                  </div>
                  {isActive && <Check size={14} className="text-brand-600" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
