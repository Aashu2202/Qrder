'use client';

import { motion } from 'framer-motion';
import { User, Mail, Shield, Hash, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';

const ROADMAP = [
  'Restaurant name, logo, brand color',
  'Currency & timezone',
  'Tax configuration (GST, service charge)',
  'Receipt / invoice footer text',
  'Operating hours per branch',
  'Change password & security log',
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const initials = (user?.name ?? 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Tenant-wide configuration · Most fields land in Phase 3"
      />

      <Card>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-base font-semibold text-white shadow-md"
            >
              {initials}
            </motion.div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{user?.name ?? '—'}</h2>
              <p className="text-sm text-zinc-500">{user?.email ?? '—'}</p>
              {user?.role && (
                <div className="mt-1.5">
                  <Badge tone="brand">{user.role}</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoRow icon={<User size={14} />} label="Name" value={user?.name ?? '—'} />
            <InfoRow icon={<Mail size={14} />} label="Email" value={user?.email ?? '—'} />
            <InfoRow icon={<Shield size={14} />} label="Role" value={user?.role ?? '—'} />
            <InfoRow
              icon={<Hash size={14} />}
              label="Tenant ID"
              value={user?.tenantId ?? '—'}
              mono
            />
          </div>
        </div>
      </Card>

      <Card variant="gradient">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-300">
              <Sparkles size={14} />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">Coming in Phase 3</h2>
          </div>
          <ul className="space-y-1.5">
            {ROADMAP.map((label, i) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500/15 text-brand-600 text-[10px] font-bold dark:text-brand-300">
                  •
                </span>
                {label}
              </motion.li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-zinc-100 text-zinc-500 shrink-0 dark:bg-zinc-800 dark:text-zinc-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
        <div
          className={
            'text-sm text-zinc-900 dark:text-zinc-100 truncate ' + (mono ? 'font-mono text-xs' : '')
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}
