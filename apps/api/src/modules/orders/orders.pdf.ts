import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  orders,
  orderItems,
  orderItemModifiers,
  tenants,
  branches,
  tables,
  staff,
  payments,
  kitchenStations,
} from '@qrder/db';
import { db } from '../../lib/db';
import { notFound } from '../../lib/errors';
import { renderInvoice, renderKot, type InvoiceData, type KotData } from '../../integrations/pdf';

export async function renderInvoiceForOrder(
  tenantId: string,
  orderId: string,
): Promise<Buffer> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
  });
  if (!order) throw notFound('Order not found');

  const [tenant, branch] = await Promise.all([
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    db.query.branches.findFirst({ where: eq(branches.id, order.branchId) }),
  ]);
  if (!tenant || !branch) throw notFound('Restaurant context missing');

  const tableRow = order.tableId
    ? await db.query.tables.findFirst({ where: eq(tables.id, order.tableId) })
    : null;
  const server = order.servedByStaffId
    ? await db.query.staff.findFirst({ where: eq(staff.id, order.servedByStaffId) })
    : null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const mods =
    items.length > 0
      ? await db
          .select()
          .from(orderItemModifiers)
          .where(
            inArray(
              orderItemModifiers.orderItemId,
              items.map((i) => i.id),
            ),
          )
      : [];
  const modsByItem = new Map<string, typeof mods>();
  for (const m of mods) {
    const list = modsByItem.get(m.orderItemId) ?? [];
    list.push(m);
    modsByItem.set(m.orderItemId, list);
  }

  const paymentsList = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId));

  const addr = branch.address as { line1?: string; city?: string; state?: string };
  const branchAddress = [addr.line1, addr.city, addr.state].filter(Boolean).join(', ');

  const data: InvoiceData = {
    tenant: {
      name: tenant.name,
      address: branchAddress || branch.name,
      phone: branch.phone,
      gstin: null,
      logoUrl: tenant.logoUrl,
      currency: tenant.currency,
    },
    branch: { name: branch.name },
    order: {
      orderNumber: order.orderNumber,
      placedAt: order.placedAt.toISOString(),
      completedAt: order.completedAt?.toISOString() ?? null,
      tableNumber: tableRow?.number ?? null,
      servedByName: server?.name ?? null,
      notes: order.notes,
      couponCode: order.couponCode,
      discountReason: order.discountReason,
    },
    items: items.map((it) => ({
      name: it.nameSnapshot,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      modifiers: (modsByItem.get(it.id) ?? []).map((m) => ({
        name: m.nameSnapshot,
        priceDelta: m.priceDelta,
      })),
      lineTotal: it.lineTotal,
    })),
    totals: {
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
    },
    gstRate: Number(tenant.taxConfig.gst ?? 5),
    payments: paymentsList.map((p) => ({
      method: p.method,
      amount: p.amount,
      gatewayPaymentId: p.gatewayPaymentId,
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    footer: 'Thank you. Please come again.',
  };

  return renderInvoice(data);
}

export async function renderKotForOrder(tenantId: string, orderId: string): Promise<Buffer> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
  });
  if (!order) throw notFound('Order not found');

  const [branch, items, stationRows] = await Promise.all([
    db.query.branches.findFirst({ where: eq(branches.id, order.branchId) }),
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db
      .select()
      .from(kitchenStations)
      .where(
        and(
          eq(kitchenStations.tenantId, tenantId),
          eq(kitchenStations.branchId, order.branchId),
        ),
      )
      .orderBy(asc(kitchenStations.displayOrder)),
  ]);
  if (!branch) throw notFound('Branch missing');

  const stationsById = new Map(stationRows.map((s) => [s.id, s]));
  const grouped = new Map<string, KotData['stations'][number]>();
  for (const it of items) {
    const stKey = it.stationId ?? 'unassigned';
    const stName = it.stationId
      ? stationsById.get(it.stationId)?.name ?? 'Station'
      : 'Other';
    let g = grouped.get(stKey);
    if (!g) {
      g = { name: stName, items: [] };
      grouped.set(stKey, g);
    }
    g.items.push({
      quantity: it.quantity,
      name: it.nameSnapshot,
      modifiers: [],
      cookingNotes: it.cookingNotes,
    });
  }

  const tableRow = order.tableId
    ? await db.query.tables.findFirst({ where: eq(tables.id, order.tableId) })
    : null;

  const data: KotData = {
    branch: { name: branch.name },
    order: {
      orderNumber: order.orderNumber,
      placedAt: order.placedAt.toISOString(),
      tableNumber: tableRow?.number ?? null,
      notes: order.notes,
    },
    stations: Array.from(grouped.values()),
  };

  return renderKot(data);
}
