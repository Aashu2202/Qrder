'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

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
      name: 'qrder-pos-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
        state?.setHasHydrated(true);
      },
    },
  ),
);
