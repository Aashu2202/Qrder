'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Download, TrendingUp, BarChart3, Clock, CreditCard } from 'lucide-react';
import { apiFetch, apiBase } from '@/lib/api';
import { useActiveBranchId } from '@/lib/branch';
import { useAuthStore } from '@/store/auth';
import { formatMoney } from '@/lib/money';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';

const ChartLoader = () => (
  <div className="h-[280px] grid place-items-center">
    <Skeleton className="h-full w-full" />
  </div>
);

const RevenueChart = dynamic(() => import('./charts').then((m) => m.RevenueChart), {
  ssr: false,
  loading: ChartLoader,
});
const TopSellersChart = dynamic(() => import('./charts').then((m) => m.TopSellersChart), {
  ssr: false,
  loading: ChartLoader,
});
const PeakHoursChart = dynamic(() => import('./charts').then((m) => m.PeakHoursChart), {
  ssr: false,
  loading: ChartLoader,
});

type Range = 'today' | '7d' | '30d' | '90d';
const RANGES: Array<{ value: Range; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

interface RevenuePoint {
  day: string;
  revenue: number;
  orders: number;
}
interface HourPoint {
  hour: number;
  count: number;
}
interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}
interface PayMethod {
  method: string;
  total: number;
  count: number;
}

const METHOD_COLORS: Record<string, string> = {
  cash: 'from-emerald-400 to-emerald-600',
  card: 'from-violet-400 to-violet-600',
  upi: 'from-sky-400 to-sky-600',
  razorpay: 'from-brand-400 to-brand-600',
  online: 'from-brand-400 to-brand-600',
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('7d');
  const branchId = useActiveBranchId();
  const token = useAuthStore((s) => s.accessToken);
  const qs = `range=${range}${branchId ? `&branchId=${branchId}` : ''}`;

  const series = useQuery({
    queryKey: ['rev-series', range, branchId],
    queryFn: () => apiFetch<{ items: RevenuePoint[] }>(`/v1/analytics/revenue-series?${qs}`),
    staleTime: 60_000,
  });
  const top = useQuery({
    queryKey: ['top-items', range, branchId],
    queryFn: () => apiFetch<{ items: TopItem[] }>(`/v1/analytics/top-items?${qs}&limit=10`),
    staleTime: 60_000,
  });
  const peak = useQuery({
    queryKey: ['peak-hours', range, branchId],
    queryFn: () => apiFetch<{ items: HourPoint[] }>(`/v1/analytics/peak-hours?${qs}`),
    staleTime: 60_000,
  });
  const payments = useQuery({
    queryKey: ['pay-methods', range, branchId],
    queryFn: () => apiFetch<{ items: PayMethod[] }>(`/v1/analytics/payment-methods?${qs}`),
    staleTime: 60_000,
  });

  const exportCsv = async () => {
    if (!token) return;
    const res = await fetch(`${apiBase}/v1/analytics/export.csv?${qs}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast.error('Could not export');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  const chartSeries = (series.data?.items ?? []).map((p) => ({
    ...p,
    revenueMajor: p.revenue / 100,
  }));

  const totalPay = (payments.data?.items ?? []).reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Sales, peak hours, and top sellers"
        actions={
          <>
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={
                    'px-3 py-1 text-xs font-medium rounded-md transition ' +
                    (range === r.value
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800')
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} leftIcon={<Download size={14} />}>
              CSV
            </Button>
          </>
        }
      />

      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-300">
                <TrendingUp size={14} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Revenue</h2>
                <p className="text-xs text-zinc-500">{RANGES.find((r) => r.value === range)?.label}</p>
              </div>
            </div>
          </div>
          {series.isLoading ? (
            <ChartLoader />
          ) : chartSeries.length === 0 ? (
            <p className="text-sm text-zinc-500 py-16 text-center">No completed orders yet.</p>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <RevenueChart data={chartSeries} />
            </motion.div>
          )}
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-300">
                <BarChart3 size={14} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Top sellers</h2>
                <p className="text-xs text-zinc-500">By quantity</p>
              </div>
            </div>
            {top.isLoading ? (
              <ChartLoader />
            ) : (top.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500 py-12 text-center">No sales in this range.</p>
            ) : (
              <TopSellersChart data={top.data!.items} />
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300">
                <Clock size={14} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Peak hours</h2>
                <p className="text-xs text-zinc-500">Order count by hour</p>
              </div>
            </div>
            {peak.isLoading ? (
              <ChartLoader />
            ) : (peak.data?.items ?? []).every((p) => p.count === 0) ? (
              <p className="text-sm text-zinc-500 py-12 text-center">No data in this range.</p>
            ) : (
              <PeakHoursChart data={peak.data!.items} />
            )}
          </div>
        </Card>
      </section>

      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              <CreditCard size={14} />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Payments by method</h2>
              <p className="text-xs text-zinc-500">All completed transactions</p>
            </div>
          </div>
          {(payments.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {(payments.data?.items ?? []).map((p, i) => {
                const pct = totalPay > 0 ? (p.total / totalPay) * 100 : 0;
                const gradient = METHOD_COLORS[p.method.toLowerCase()] ?? 'from-zinc-400 to-zinc-600';
                return (
                  <motion.li
                    key={p.method}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium uppercase tracking-wide text-xs">{p.method}</span>
                      <span className="tabular-nums">
                        <span className="font-semibold">{formatMoney(p.total)}</span>
                        <span className="text-zinc-500 text-xs ml-2">{p.count} txns</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden dark:bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
                        className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                      />
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
