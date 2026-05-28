'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actorStaffId: string | null;
  actorName: string | null;
  actorEmail: string | null;
}

const ACTION_TONE: Record<string, 'success' | 'info' | 'danger' | 'warning' | 'violet' | 'neutral'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  discount: 'warning',
  refund: 'warning',
  reset_password: 'violet',
};

export default function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => apiFetch<{ items: AuditEntry[] }>('/v1/audit-logs?limit=200'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Append-only record of staff actions · Last 200 entries"
      />

      <Card>
        {isLoading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<ScrollText size={20} />}
            title="No audit entries yet"
            description="Sensitive actions (staff changes, discounts, refunds, branch changes) will appear here as you take them."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/70 dark:border-zinc-800/70">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Actor</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Entity</th>
                  <th className="px-4 py-2.5 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((e, idx) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(idx * 0.008, 0.3) }}
                    className="border-b border-zinc-100 last:border-0 align-top hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {e.actorName ?? 'System'}
                      </div>
                      {e.actorEmail && (
                        <div className="text-[11px] text-zinc-500">{e.actorEmail}</div>
                      )}
                      {e.ip && (
                        <div className="text-[10px] text-zinc-500 font-mono">{e.ip}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ACTION_TONE[e.action] ?? 'neutral'} dot>
                        {e.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {e.entity}
                      </div>
                      {e.entityId && (
                        <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[200px]">
                          {e.entityId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.diff && (
                        <pre className="font-mono text-[10px] whitespace-pre-wrap max-w-md text-zinc-500">
                          {JSON.stringify(e.diff, null, 0).slice(0, 200)}
                        </pre>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
