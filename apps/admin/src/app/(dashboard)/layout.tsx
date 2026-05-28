'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { setOnAuthFailed } from '@/lib/api';
import { cn } from '@qrder/ui';
import { BranchSwitcher } from '@/components/branch-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  ListOrdered,
  UtensilsCrossed,
  Armchair,
  Users,
  UserRound,
  Boxes,
  BarChart3,
  Building2,
  Settings,
  ScrollText,
  Star,
  TicketPercent,
  LogOut,
  ChevronDown,
  Menu as MenuIcon,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/overview', label: 'Overview', icon: LayoutDashboard },
      { href: '/orders', label: 'Orders', icon: ListOrdered },
      { href: '/tables', label: 'Tables', icon: Armchair },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
      { href: '/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/customers', label: 'Customers', icon: UserRound },
      { href: '/feedback', label: 'Feedback', icon: Star },
    ],
  },
  {
    label: 'Marketing',
    items: [{ href: '/coupons', label: 'Coupons', icon: TicketPercent }],
  },
  {
    label: 'Admin',
    items: [
      { href: '/staff', label: 'Staff', icon: Users },
      { href: '/branches', label: 'Branches', icon: Building2 },
      { href: '/audit-log', label: 'Audit log', icon: ScrollText },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  useEffect(() => {
    setOnAuthFailed(() => {
      clear();
      router.replace('/login');
    });
    return () => setOnAuthFailed(null);
  }, [clear, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-sm text-zinc-500"
        >
          <span className="h-2 w-2 rounded-full bg-brand-500 pulse-soft" />
          Loading…
        </motion.div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} />

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
            >
              <SidebarInner pathname={pathname} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/70 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/60">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Open menu"
            >
              <MenuIcon size={18} />
            </button>
            <div className="hidden md:block min-w-0">
              <p className="text-xs text-zinc-500">
                Signed in as <span className="font-medium text-zinc-700 dark:text-zinc-300">{user.name}</span>
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <BranchSwitcher />
              <ThemeToggle />
              <UserMenu
                name={user.name}
                role={user.role}
                onSignOut={() => {
                  clear();
                  router.replace('/login');
                }}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 md:py-8">
          <motion.div
            key={pathname ?? '__root'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mx-auto w-full max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string | null }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-zinc-200/70 bg-white/40 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/40">
      <SidebarInner pathname={pathname} />
    </aside>
  );
}

function SidebarInner({ pathname }: { pathname: string | null }) {
  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-zinc-950 md:bg-transparent md:dark:bg-transparent">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm">
          <Sparkles size={14} />
        </div>
        <span className="font-semibold tracking-tight">Qrder</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all relative',
                        active
                          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-medium'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-nav-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-brand-500"
                        />
                      )}
                      <Icon
                        size={15}
                        className={cn(
                          active
                            ? 'text-brand-500'
                            : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300',
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-zinc-200/70 dark:border-zinc-800/70 p-3">
        <div className="rounded-lg bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/30 dark:to-amber-900/20 p-3 text-xs">
          <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Sparkles size={12} className="text-brand-500" />
            Pilot mode
          </div>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Single-restaurant pilot. SaaS billing in Phase 6.
          </p>
        </div>
      </div>
    </div>
  );
}

function UserMenu({
  name,
  role,
  onSignOut,
}: {
  name: string;
  role: string;
  onSignOut: () => void;
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/60 backdrop-blur px-2 py-1.5 text-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-800">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[10px] font-semibold text-white">
            {initials || '?'}
          </div>
          <span className="hidden sm:inline text-zinc-700 dark:text-zinc-200 font-medium">
            {name.split(' ')[0]}
          </span>
          <ChevronDown size={12} className="text-zinc-400" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[12rem] rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="px-2 py-2">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</div>
            <div className="text-xs text-zinc-500 capitalize">{role.replace('_', ' ')}</div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <DropdownMenu.Item
            onSelect={onSignOut}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
          >
            <LogOut size={14} />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
