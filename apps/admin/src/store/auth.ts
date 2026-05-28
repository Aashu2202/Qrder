'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken } from '@/lib/api';

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
  /**
   * `false` until Zustand's persist middleware has finished reading from
   * localStorage. Pages must wait for this before deciding to redirect to
   * /login — otherwise a refresh races the rehydration and forces logout.
   */
  _hasHydrated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clear: () => void;
  setHasHydrated: (b: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      _hasHydrated: false,
      setSession: (accessToken, user) => {
        setAccessToken(accessToken);
        set({ accessToken, user });
      },
      clear: () => {
        setAccessToken(null);
        set({ accessToken: null, user: null });
      },
      setHasHydrated: (b) => set({ _hasHydrated: b }),
    }),
    {
      name: 'qrder-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
        state?.setHasHydrated(true);
      },
    },
  ),
);
