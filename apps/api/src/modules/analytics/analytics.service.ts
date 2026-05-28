import { and, between, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { orders, orderItems, menuItems, payments } from '@qrder/db';
import { db } from '../../lib/db';
import { OrderStatus } from '@qrder/shared';

export type RangeKey = 'today' | '7d' | '30d' | '90d';

function rangeBounds(range: RangeKey): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  if (range === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (range === '7d') {
    from.setDate(from.getDate() - 7);
  } else if (range === '30d') {
    from.setDate(from.getDate() - 30);
  } else {
    from.setDate(from.getDate() - 90);
  }
  return { from, to };
}

const COMPLETED_STATUSES = [OrderStatus.COMPLETED, OrderStatus.SERVED];

interface Filter {
  tenantId: string;
  branchId?: string;
}

function whereCompleted({ tenantId, branchId }: Filter, from: Date) {
  const conds = [
    eq(orders.tenantId, tenantId),
    inArray(orders.status, COMPLETED_STATUSES),
    gte(orders.placedAt, from),
  ];
  if (branchId) conds.push(eq(orders.branchId, branchId));
  return and(...conds);
}

export async function summary(filter: Filter, range: RangeKey) {
  const { from, to } = rangeBounds(range);

  const completedRows = await db
    .select({
      revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(orders)
    .where(whereCompleted(filter, from));

  const allCondsBase = [eq(orders.tenantId, filter.tenantId), gte(orders.placedAt, from)];
  if (filter.branchId) allCondsBase.push(eq(orders.branchId, filter.branchId));

  const byStatusRows = await db
    .select({
      status: orders.status,
      count: sql<string>`count(*)`,
    })
    .from(orders)
    .where(and(...allCondsBase))
    .groupBy(orders.status);

  const byStatus: Record<string, number> = {};
  for (const r of byStatusRows) byStatus[r.status] = Number(r.count);

  const revenue = Number(completedRows[0]?.revenue ?? 0);
  const count = Number(completedRows[0]?.count ?? 0);
  const avgTicket = count > 0 ? Math.round(revenue / count) : 0;

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    revenue,
    completedOrders: count,
    avgTicket,
    byStatus,
  };
}

export async function topItems(filter: Filter, range: RangeKey, limit = 10) {
  const { from } = rangeBounds(range);
  const conds = [
    eq(orders.tenantId, filter.tenantId),
    inArray(orders.status, COMPLETED_STATUSES),
    gte(orders.placedAt, from),
  ];
  if (filter.branchId) conds.push(eq(orders.branchId, filter.branchId));

  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      name: orderItems.nameSnapshot,
      qty: sql<string>`sum(${orderItems.quantity})`,
      revenue: sql<string>`sum(${orderItems.lineTotal})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(...conds))
    .groupBy(orderItems.menuItemId, orderItems.nameSnapshot)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);

  return rows.map((r) => ({
    menuItemId: r.menuItemId,
    name: r.name,
    quantity: Number(r.qty),
    revenue: Number(r.revenue),
  }));
}

/** Orders per hour (0..23) over the range. */
export async function peakHours(filter: Filter, range: RangeKey) {
  const { from } = rangeBounds(range);
  const conds = [
    eq(orders.tenantId, filter.tenantId),
    inArray(orders.status, COMPLETED_STATUSES),
    gte(orders.placedAt, from),
  ];
  if (filter.branchId) conds.push(eq(orders.branchId, filter.branchId));

  const rows = await db
    .select({
      hour: sql<string>`extract(hour from ${orders.placedAt})`,
      count: sql<string>`count(*)`,
    })
    .from(orders)
    .where(and(...conds))
    .groupBy(sql`extract(hour from ${orders.placedAt})`);

  const result: Array<{ hour: number; count: number }> = [];
  const byHour = new Map<number, number>();
  for (const r of rows) byHour.set(Number(r.hour), Number(r.count));
  for (let h = 0; h < 24; h++) result.push({ hour: h, count: byHour.get(h) ?? 0 });
  return result;
}

/** Daily revenue + order count over the range. */
export async function revenueSeries(filter: Filter, range: RangeKey) {
  const { from } = rangeBounds(range);
  const conds = [
    eq(orders.tenantId, filter.tenantId),
    inArray(orders.status, COMPLETED_STATUSES),
    gte(orders.placedAt, from),
  ];
  if (filter.branchId) conds.push(eq(orders.branchId, filter.branchId));

  const rows = await db
    .select({
      day: sql<string>`to_char(${orders.placedAt}, 'YYYY-MM-DD')`,
      revenue: sql<string>`sum(${orders.totalAmount})`,
      orders: sql<string>`count(*)`,
    })
    .from(orders)
    .where(and(...conds))
    .groupBy(sql`to_char(${orders.placedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${orders.placedAt}, 'YYYY-MM-DD')`);

  return rows.map((r) => ({
    day: r.day,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}

/** Raw orders list for CSV export (no joins for simplicity — denormalize separately if needed). */
export async function ordersForExport(filter: Filter, range: RangeKey) {
  const { from } = rangeBounds(range);
  const conds = [eq(orders.tenantId, filter.tenantId), gte(orders.placedAt, from)];
  if (filter.branchId) conds.push(eq(orders.branchId, filter.branchId));

  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      source: orders.source,
      tableId: orders.tableId,
      subtotal: orders.subtotal,
      taxAmount: orders.taxAmount,
      discountAmount: orders.discountAmount,
      totalAmount: orders.totalAmount,
      placedAt: orders.placedAt,
      completedAt: orders.completedAt,
    })
    .from(orders)
    .where(and(...conds))
    .orderBy(desc(orders.placedAt));
}

export async function paymentMethodsBreakdown(filter: Filter, range: RangeKey) {
  const { from } = rangeBounds(range);
  const conds = [
    eq(payments.tenantId, filter.tenantId),
    eq(payments.status, 'paid'),
    gte(payments.createdAt, from),
  ];

  const rows = await db
    .select({
      method: payments.method,
      total: sql<string>`sum(${payments.amount})`,
      count: sql<string>`count(*)`,
    })
    .from(payments)
    .where(and(...conds))
    .groupBy(payments.method);

  return rows.map((r) => ({
    method: r.method,
    total: Number(r.total),
    count: Number(r.count),
  }));
}
