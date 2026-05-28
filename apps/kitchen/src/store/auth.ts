'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  branchId: string | null;
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  _hasHydrated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clear: () => void;
  setHasHydrated: (b: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      _hasHydrated: false,
      setSession: (accessToken, user) => {
        setToken(accessToken);
        set({ accessToken, user });
      },
      clear: () => {
        setToken(null);
        set({ accessToken: null, user: null });
      },
      setHasHydrated: (b) => set({ _hasHydrated: b }),
    }),
    {
      name: 'qrder-kds-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setToken(state.accessToken);
        state?.setHasHydrated(true);
      },
    },
  ),
);
