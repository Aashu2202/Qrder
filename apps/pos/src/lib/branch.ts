'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { Branch } from '@/lib/types';

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
    { name: 'qrder-pos-branch' },
  ),
);

export function useBranches() {
  const user = useAuth((s) => s.user);
  return useQuery({
    queryKey: ['pos-branches'],
    queryFn: () => apiFetch<{ items: Branch[] }>('/v1/branches'),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useActiveBranchId(): string | null {
  const user = useAuth((s) => s.user);
  const selected = useBranchStore((s) => s.selectedBranchId);
  const setBranch = useBranchStore((s) => s.setBranch);
  const { data } = useBranches();

  const fallback = user?.branchId ?? data?.items[0]?.id ?? null;
  const validSelected =
    selected && data?.items.some((b) => b.id === selected) ? selected : null;
  const resolved = validSelected ?? fallback;

  useEffect(() => {
    if (resolved && resolved !== selected) setBranch(resolved);
  }, [resolved, selected, setBranch]);

  return resolved;
}

export function useSetBranch() {
  return useBranchStore((s) => s.setBranch);
}
