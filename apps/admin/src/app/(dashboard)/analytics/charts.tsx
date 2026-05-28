'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatMoney } from '@/lib/money';

interface RevenuePoint {
  day: string;
  revenue: number;
  orders: number;
  revenueMajor: number;
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

const tooltipStyle: React.CSSProperties = {
  background: 'rgb(var(--card))',
  border: '1px solid rgb(var(--border))',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ea580c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
          <XAxis
            dataKey="day"
            fontSize={11}
            stroke="rgb(var(--muted-fg))"
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--border))' }}
          />
          <YAxis
            fontSize={11}
            stroke="rgb(var(--muted-fg))"
            tickFormatter={(v) => `₹${v}`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v: number) => formatMoney(Math.round(v * 100))}
            contentStyle={tooltipStyle}
            cursor={{ stroke: '#ea580c', strokeOpacity: 0.2 }}
          />
          <Area
            type="monotone"
            dataKey="revenueMajor"
            stroke="#ea580c"
            strokeWidth={2}
            fill="url(#revGrad)"
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopSellersChart({ data }: { data: TopItem[] }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" horizontal={false} />
          <XAxis type="number" fontSize={11} stroke="rgb(var(--muted-fg))" tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            fontSize={11}
            width={100}
            stroke="rgb(var(--muted-fg))"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(234, 88, 12, 0.08)' }} />
          <Bar dataKey="quantity" fill="#ea580c" radius={[0, 4, 4, 0]} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PeakHoursChart({ data }: { data: HourPoint[] }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
          <XAxis
            dataKey="hour"
            fontSize={11}
            stroke="rgb(var(--muted-fg))"
            tickFormatter={(h) => `${h}h`}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--border))' }}
          />
          <YAxis fontSize={11} stroke="rgb(var(--muted-fg))" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(234, 88, 12, 0.08)' }} />
          <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

