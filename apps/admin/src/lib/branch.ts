'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export interface Branch {
  id: string;
  name: string;
  tenantId: string;
  isActive: boolean;
}

interface BranchState {
  selectedBranchId: string | null;
  setBranch: (id: string) => void;
}

const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      setBranch: (id) => set({ selectedBranchId: id }),
    }),
    { name: 'qrder-active-branch' },
  ),
);

/** List branches for the current tenant. Cached for the session. */
export function useBranches() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => apiFetch<{ items: Branch[] }>('/v1/branches'),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

/**
 * Resolves the active branch id. Priority:
 *  1. User's manual selection (persisted)
 *  2. The JWT's branchId (managers/cashiers/etc are pinned to one)
 *  3. First branch in the tenant (super-admin default)
 *
 * Returns `null` while branches are still loading.
 */
export function useActiveBranchId(): string | null {
  const user = useAuthStore((s) => s.user);
  const selected = useBranchStore((s) => s.selectedBranchId);
  const setBranch = useBranchStore((s) => s.setBranch);
  const { data } = useBranches();

  const fallback = user?.branchId ?? data?.items[0]?.id ?? null;

  // If a persisted selection no longer exists in this tenant, drop it.
  const validSelected =
    selected && data?.items.some((b) => b.id === selected) ? selected : null;

  const resolved = validSelected ?? fallback;

  useEffect(() => {
    if (resolved && resolved !== selected) {
      setBranch(resolved);
    }
  }, [resolved, selected, setBranch]);

  return resolved;
}

export function useSetBranch() {
  return useBranchStore((s) => s.setBranch);
}
