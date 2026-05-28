'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, type Theme } from './theme-provider';

const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = resolved === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Theme"
          className="relative h-9 w-9 grid place-items-center rounded-lg border border-zinc-200 bg-white/60 backdrop-blur transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-800"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={resolved}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex items-center justify-center"
            >
              <Icon size={16} className="text-zinc-700 dark:text-zinc-200" />
            </motion.span>
          </AnimatePresence>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[10rem] rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {options.map(({ value, label, icon: I }) => {
            const active = theme === value;
            return (
              <DropdownMenu.Item
                key={value}
                onSelect={() => setTheme(value)}
                className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm outline-none transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="flex items-center gap-2">
                  <I size={14} className="text-zinc-500" />
                  {label}
                </span>
                {active && <Check size={14} className="text-brand-600" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
