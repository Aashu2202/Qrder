'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocaleState {
  locale: string;
  setLocale: (l: string) => void;
}

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'qrder-locale' },
  ),
);

export const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  bn: 'বাংলা',
};
