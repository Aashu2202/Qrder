import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import {
  orders,
  orderItems,
  orderItemModifiers,
  menuItems,
  modifiers,
  customers,
  tables,
  tenants,
  coupons,
} from '@qrder/db';
import {
  OrderItemStatus,
  OrderSource,
  OrderStatus,
  TableStatus,
  type PlaceOrderInput,
  type AddItemsInput,
  type ApplyDiscountInput,
  type SplitOrderInput,
} from '@qrder/shared';
import { db } from '../../lib/db';
import { badRequest, notFound, conflict } from '../../lib/errors';
import { emit } from '../../realtime/emit';
import { effectivePrices } from '../pricing/pricing.service';

function shortOrderNumber(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 6).toUpperCase();
}

export interface PlaceOrderContext {
  tenantId: string;
  branchId: string;
  tableId: string | null;
  source: 'qr' | 'pos' | 'phone' | 'admin';
  staffId?: string | null;
}

export async function placeOrder(ctx: PlaceOrderContext, input: PlaceOrderInput) {
  // Refetch items + modifiers authoritatively — never trust client prices.
  const itemIds = input.items.map((i) => i.menuItemId);
  const allModifierIds = input.items.flatMap((i) => i.modifierIds);

  const dbItems = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.tenantId, ctx.tenantId), inArray(menuItems.id, itemIds)));
  const dbModifiers =
    allModifierIds.length > 0
      ? await db.select().from(modifiers).where(inArray(modifiers.id, allModifierIds))
      : [];
  const itemById = new Map(dbItems.map((i) => [i.id, i]));
  const modifierById = new Map(dbModifiers.map((m) => [m.id, m]));

  for (const it of input.items) {
    const dbItem = itemById.get(it.menuItemId);
    if (!dbItem) throw badRequest(`Item ${it.menuItemId} not found`);
    if (!dbItem.isAvailable) throw conflict(`"${dbItem.name}" is out of stock`);
    for (const mid of it.modifierIds) {
      if (!modifierById.has(mid)) throw badRequest(`Modifier ${mid} not found`);
    }
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, ctx.tenantId) });
  if (!tenant) throw notFound('Tenant missing');
  const gstRate = Number(tenant.taxConfig.gst ?? 0) / 100;

  // Compute effective unit prices honoring any active happy-hour rules.
  const effective = await effectivePrices(
    ctx.tenantId,
    dbItems.map((i) => ({ id: i.id, categoryId: i.categoryId, basePrice: i.basePrice })),
  );

  let subtotal = 0;
  const linePlans = input.items.map((it) => {
    const dbItem = itemById.get(it.menuItemId)!;
    const modList = it.modifierIds.map((id) => modifierById.get(id)!);
    const modifiersTotal = modList.reduce((s, m) => s + m.priceDelta, 0);
    const unitPrice = effective.get(dbItem.id) ?? dbItem.basePrice;
    const lineTotal = (unitPrice + modifiersTotal) * it.quantity;
    subtotal += lineTotal;
    return { dbItem, modList, unitPrice, modifiersTotal, lineTotal, it };
  });

  const taxAmount = Math.round(subtotal * gstRate);
  const totalAmount = subtotal + taxAmount;

  // Optional: link customer by phone if provided.
  let customerId: string | null = null;
  if (input.customerPhone) {
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.tenantId, ctx.tenantId), eq(customers.phone, input.customerPhone)),
    });
    if (existing) {
      customerId = existing.id;
      await db
        .update(customers)
        .set({ visitCount: existing.visitCount + 1 })
        .where(eq(customers.id, existing.id));
    } else {
      const [created] = await db
        .insert(customers)
        .values({
          tenantId: ctx.tenantId,
          phone: input.customerPhone,
          name: input.customerName ?? null,
          visitCount: 1,
        })
        .returning();
      customerId = created?.id ?? null;
    }
  }

  // Single transaction: insert order, items, modifiers; mark table occupied.
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        tenantId: ctx.tenantId,
        branchId: ctx.branchId,
        tableId: ctx.tableId,
        orderNumber: 'PENDING',
        customerId,
        source: ctx.source,
        status: OrderStatus.PLACED,
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        notes: input.notes ?? null,
      })
      .returning();
    if (!order) throw new Error('Failed to insert order');

    const orderNumber = shortOrderNumber(order.id);
    await tx.update(orders).set({ orderNumber }).where(eq(orders.id, order.id));

    for (const plan of linePlans) {
      const [oi] = await tx
        .insert(orderItems)
        .values({
          orderId: order.id,
          menuItemId: plan.dbItem.id,
          nameSnapshot: plan.dbItem.name,
          unitPrice: plan.unitPrice,
          quantity: plan.it.quantity,
          modifiersTotal: plan.modifiersTotal,
          lineTotal: plan.lineTotal,
          status: OrderItemStatus.PENDING,
          cookingNotes: plan.it.cookingNotes ?? null,
          stationId: plan.dbItem.stationId,
        })
        .returning();
      if (!oi) throw new Error('Failed to insert order item');

      if (plan.modList.length > 0) {
        await tx.insert(orderItemModifiers).values(
          plan.modList.map((m) => ({
            orderItemId: oi.id,
            modifierId: m.id,
            nameSnapshot: m.name,
            priceDelta: m.priceDelta,
          })),
        );
      }
    }

    if (ctx.tableId) {
      await tx
        .update(tables)
        .set({ status: TableStatus.OCCUPIED })
        .where(eq(tables.id, ctx.tableId));
    }

    return { ...order, orderNumber };
  });

  // Emit realtime events outside the transaction.
  const table = ctx.tableId
    ? await db.query.tables.findFirst({ where: eq(tables.id, ctx.tableId) })
    : null;

  emit.orderPlaced(ctx.tenantId, ctx.branchId, {
    orderId: result.id,
    orderNumber: result.orderNumber,
    tableId: ctx.tableId,
    tableNumber: table?.number ?? null,
    branchId: ctx.branchId,
    itemCount: input.items.reduce((s, i) => s + i.quantity, 0),
    total: totalAmount,
    placedAt: result.placedAt.toISOString(),
  });
  if (ctx.tableId) {
    emit.tableStatusChanged(ctx.tenantId, ctx.branchId, {
      tableId: ctx.tableId,
      status: TableStatus.OCCUPIED,
      changedAt: new Date().toISOString(),
    });
  }

  return getOrderById(ctx.tenantId, result.id);
}

export async function getOrderById(tenantId: string, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
  });
  if (!order) throw notFound('Order not found');

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const itemMods =
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

  const modsByItem = new Map<string, typeof itemMods>();
  for (const m of itemMods) {
    const list = modsByItem.get(m.orderItemId) ?? [];
    list.push(m);
    modsByItem.set(m.orderItemId, list);
  }

  return {
    ...order,
    items: items.map((i) => ({
      ...i,
      modifiers: modsByItem.get(i.id) ?? [],
    })),
  };
}

export interface ListOptions {
  branchId?: string;
  status?: string;
  activeOnly?: boolean;
  limit?: number;
}

const ACTIVE_STATUSES = [
  OrderStatus.PLACED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

export async function listOrders(tenantId: string, opts: ListOptions = {}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const conditions = [eq(orders.tenantId, tenantId)];
  if (opts.branchId) conditions.push(eq(orders.branchId, opts.branchId));
  if (opts.status) conditions.push(eq(orders.status, opts.status));
  else if (opts.activeOnly) conditions.push(inArray(orders.status, ACTIVE_STATUSES));

  return db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.placedAt))
    .limit(limit);
}

const STATUS_TIMESTAMP: Partial<Record<OrderStatus, keyof typeof orders.$inferSelect>> = {
  [OrderStatus.ACCEPTED]: 'acceptedAt',
  [OrderStatus.READY]: 'readyAt',
  [OrderStatus.SERVED]: 'servedAt',
  [OrderStatus.COMPLETED]: 'completedAt',
};

export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  next: OrderStatus,
  staffId?: string,
) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
  });
  if (!order) throw notFound('Order not found');

  const patch: Record<string, unknown> = { status: next };
  const tsField = STATUS_TIMESTAMP[next];
  if (tsField) patch[tsField] = new Date();
  if (next === OrderStatus.SERVED && staffId) patch.servedByStaffId = staffId;

  await db.update(orders).set(patch).where(eq(orders.id, orderId));

  // Loyalty: award 1 point per ₹10 spent when an order completes for a linked customer.
  if (
    next === OrderStatus.COMPLETED &&
    order.customerId &&
    order.status !== OrderStatus.COMPLETED // avoid double-credit
  ) {
    const pointsEarned = Math.floor(order.totalAmount / 1000);
    if (pointsEarned > 0) {
      const cust = await db.query.customers.findFirst({
        where: eq(customers.id, order.customerId),
      });
      if (cust) {
        await db
          .update(customers)
          .set({
            loyaltyPoints: cust.loyaltyPoints + pointsEarned,
            totalSpend: cust.totalSpend + order.totalAmount,
          })
          .where(eq(customers.id, order.customerId));
      }
    }
  }

  // When completed or canceled, free the table.
  if (
    order.tableId &&
    (next === OrderStatus.COMPLETED || next === OrderStatus.CANCELED || next === OrderStatus.REJECTED)
  ) {
    // Only free table if no other active orders remain.
    const otherActive = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.tableId, order.tableId),
          ne(orders.id, orderId),
          inArray(orders.status, ACTIVE_STATUSES),
        ),
      );
    if (otherActive.length === 0) {
      await db
        .update(tables)
        .set({ status: TableStatus.CLEANING })
        .where(eq(tables.id, order.tableId));
      emit.tableStatusChanged(tenantId, order.branchId, {
        tableId: order.tableId,
        status: TableStatus.CLEANING,
        changedAt: new Date().toISOString(),
      });
    }
  }

  emit.orderStatusChanged(tenantId, order.branchId, orderId, {
    orderId,
    status: next,
    changedAt: new Date().toISOString(),
  });

  return getOrderById(tenantId, orderId);
}

export async function updateOrderItemStatus(
  tenantId: string,
  orderItemId: string,
  next: OrderItemStatus,
) {
  const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, orderItemId) });
  if (!item) throw notFound('Order item not found');

  const parentOrder = await db.query.orders.findFirst({
    where: and(eq(orders.id, item.orderId), eq(orders.tenantId, tenantId)),
  });
  if (!parentOrder) throw notFound('Order not found');

  const patch: Record<string, unknown> = { status: next };
  if (next === OrderItemStatus.PREPARING) patch.startedAt = new Date();
  if (next === OrderItemStatus.READY) patch.readyAt = new Date();

  await db.update(orderItems).set(patch).where(eq(orderItems.id, orderItemId));

  // Cascade order-level status if appropriate.
  const siblings = await db.select().from(orderItems).where(eq(orderItems.orderId, item.orderId));
  const allReady = siblings.every((s) => (s.id === orderItemId ? next : s.status) === OrderItemStatus.READY);
  const anyPreparing = siblings.some(
    (s) => (s.id === orderItemId ? next : s.status) === OrderItemStatus.PREPARING,
  );

  if (allReady && parentOrder.status !== OrderStatus.READY) {
    await updateOrderStatus(tenantId, parentOrder.id, OrderStatus.READY);
  } else if (anyPreparing && parentOrder.status === OrderStatus.PLACED) {
    await updateOrderStatus(tenantId, parentOrder.id, OrderStatus.PREPARING);
  }

  emit.orderItemStatusChanged(tenantId, parentOrder.branchId, parentOrder.id, {
    orderId: parentOrder.id,
    itemId: orderItemId,
    status: next,
    changedAt: new Date().toISOString(),
  });
}

/** Active orders for a given branch's KDS, with items expanded. */
export async function kitchenQueue(tenantId: string, branchId: string) {
  const activeOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.branchId, branchId),
        inArray(orders.status, [OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING]),
      ),
    )
    .orderBy(orders.placedAt);

  if (activeOrders.length === 0) return [];

  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        activeOrders.map((o) => o.id),
      ),
    );

  const itemsByOrder = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push(it);
    itemsByOrder.set(it.orderId, list);
  }

  return activeOrders.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
}

// =========================================================================
// Phase 2.3 — manual orders + table actions
// =========================================================================

async function loadOrderOrThrow(tenantId: string, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
  });
  if (!order) throw notFound('Order not found');
  return order;
}

async function loadTenantTaxRate(tenantId: string): Promise<number> {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw notFound('Tenant missing');
  return Number(tenant.taxConfig.gst ?? 0) / 100;
}

/** Recompute order subtotal/tax/total from its current order_items. Persists. */
async function recalculateOrderTotals(
  tenantId: string,
  orderId: string,
  opts: { discountAmount?: number } = {},
) {
  const order = await loadOrderOrThrow(tenantId, orderId);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const taxRate = await loadTenantTaxRate(tenantId);
  const discountAmount = opts.discountAmount ?? order.discountAmount;
  const discountedBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(discountedBase * taxRate);
  const totalAmount = discountedBase + taxAmount;
  await db
    .update(orders)
    .set({ subtotal, discountAmount, taxAmount, totalAmount })
    .where(eq(orders.id, orderId));
  return { subtotal, discountAmount, taxAmount, totalAmount };
}

export async function addItemsToOrder(
  tenantId: string,
  orderId: string,
  input: AddItemsInput,
) {
  const order = await loadOrderOrThrow(tenantId, orderId);
  if (
    order.status === OrderStatus.COMPLETED ||
    order.status === OrderStatus.CANCELED ||
    order.status === OrderStatus.REJECTED
  ) {
    throw conflict('Cannot add items to a closed order');
  }

  const itemIds = input.items.map((i) => i.menuItemId);
  const allModifierIds = input.items.flatMap((i) => i.modifierIds);
  const dbItems = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, itemIds)));
  const dbModifiers =
    allModifierIds.length > 0
      ? await db.select().from(modifiers).where(inArray(modifiers.id, allModifierIds))
      : [];
  const itemById = new Map(dbItems.map((i) => [i.id, i]));
  const modifierById = new Map(dbModifiers.map((m) => [m.id, m]));

  for (const it of input.items) {
    const dbItem = itemById.get(it.menuItemId);
    if (!dbItem) throw badRequest(`Item ${it.menuItemId} not found`);
    if (!dbItem.isAvailable) throw conflict(`"${dbItem.name}" is out of stock`);
  }

  const effective = await effectivePrices(
    tenantId,
    dbItems.map((i) => ({ id: i.id, categoryId: i.categoryId, basePrice: i.basePrice })),
  );

  const newItemIds: string[] = [];
  await db.transaction(async (tx) => {
    for (const it of input.items) {
      const dbItem = itemById.get(it.menuItemId)!;
      const modList = it.modifierIds.map((id) => modifierById.get(id)!);
      const modifiersTotal = modList.reduce((s, m) => s + m.priceDelta, 0);
      const unitPrice = effective.get(dbItem.id) ?? dbItem.basePrice;
      const lineTotal = (unitPrice + modifiersTotal) * it.quantity;
      const [oi] = await tx
        .insert(orderItems)
        .values({
          orderId,
          menuItemId: dbItem.id,
          nameSnapshot: dbItem.name,
          unitPrice,
          quantity: it.quantity,
          modifiersTotal,
          lineTotal,
          status: OrderItemStatus.PENDING,
          cookingNotes: it.cookingNotes ?? null,
          stationId: dbItem.stationId,
        })
        .returning();
      if (!oi) throw new Error('Failed to insert order item');
      newItemIds.push(oi.id);
      if (modList.length > 0) {
        await tx.insert(orderItemModifiers).values(
          modList.map((m) => ({
            orderItemId: oi.id,
            modifierId: m.id,
            nameSnapshot: m.name,
            priceDelta: m.priceDelta,
          })),
        );
      }
    }
  });

  await recalculateOrderTotals(tenantId, orderId);

  // Emit so KDS picks up the new items
  emit.orderPlaced(tenantId, order.branchId, {
    orderId,
    orderNumber: order.orderNumber,
    tableId: order.tableId,
    tableNumber: null,
    branchId: order.branchId,
    itemCount: input.items.reduce((s, i) => s + i.quantity, 0),
    total: 0, // KDS doesn't care about the running total
    placedAt: new Date().toISOString(),
  });

  return getOrderById(tenantId, orderId);
}

export async function transferOrder(
  tenantId: string,
  orderId: string,
  targetTableId: string,
) {
  const order = await loadOrderOrThrow(tenantId, orderId);
  if (order.tableId === targetTableId) return getOrderById(tenantId, orderId);
  if (
    order.status === OrderStatus.COMPLETED ||
    order.status === OrderStatus.CANCELED ||
    order.status === OrderStatus.REJECTED
  ) {
    throw conflict('Cannot transfer a closed order');
  }

  const targetTable = await db.query.tables.findFirst({
    where: and(eq(tables.id, targetTableId), eq(tables.tenantId, tenantId)),
  });
  if (!targetTable) throw notFound('Target table not found');
  if (targetTable.branchId !== order.branchId) throw conflict('Target table is in a different branch');

  // Check target table doesn't already have an active order
  const existingOnTarget = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.tableId, targetTableId),
        inArray(orders.status, ACTIVE_STATUSES),
      ),
    );
  if (existingOnTarget.length > 0) {
    throw conflict('Target table already has an active order — use merge instead');
  }

  const previousTableId = order.tableId;
  await db.update(orders).set({ tableId: targetTableId }).where(eq(orders.id, orderId));
  await db
    .update(tables)
    .set({ status: TableStatus.OCCUPIED })
    .where(eq(tables.id, targetTableId));

  if (previousTableId) {
    // Free up old table if no other active orders there
    const otherActive = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.tableId, previousTableId),
          ne(orders.id, orderId),
          inArray(orders.status, ACTIVE_STATUSES),
        ),
      );
    if (otherActive.length === 0) {
      await db
        .update(tables)
        .set({ status: TableStatus.AVAILABLE })
        .where(eq(tables.id, previousTableId));
      emit.tableStatusChanged(tenantId, order.branchId, {
        tableId: previousTableId,
        status: TableStatus.AVAILABLE,
        changedAt: new Date().toISOString(),
      });
    }
  }

  emit.tableStatusChanged(tenantId, order.branchId, {
    tableId: targetTableId,
    status: TableStatus.OCCUPIED,
    changedAt: new Date().toISOString(),
  });
  emit.orderStatusChanged(tenantId, order.branchId, orderId, {
    orderId,
    status: order.status as OrderStatus,
    changedAt: new Date().toISOString(),
  });

  return getOrderById(tenantId, orderId);
}

export async function mergeOrders(
  tenantId: string,
  targetOrderId: string,
  sourceOrderId: string,
) {
  if (targetOrderId === sourceOrderId) throw badRequest('Cannot merge an order into itself');

  const [target, source] = await Promise.all([
    loadOrderOrThrow(tenantId, targetOrderId),
    loadOrderOrThrow(tenantId, sourceOrderId),
  ]);
  if (target.branchId !== source.branchId) throw conflict('Orders must be in the same branch');
  if (
    source.status === OrderStatus.COMPLETED ||
    source.status === OrderStatus.CANCELED ||
    source.status === OrderStatus.REJECTED
  ) {
    throw conflict('Source order is already closed');
  }

  const sourceTableId = source.tableId;

  await db.transaction(async (tx) => {
    // Move all items
    await tx
      .update(orderItems)
      .set({ orderId: targetOrderId })
      .where(eq(orderItems.orderId, sourceOrderId));
    // Close source
    await tx
      .update(orders)
      .set({ status: OrderStatus.CANCELED, completedAt: new Date(), notes: `merged → ${target.orderNumber}` })
      .where(eq(orders.id, sourceOrderId));
  });

  await recalculateOrderTotals(tenantId, targetOrderId);

  // Free source table if it has nothing active now
  if (sourceTableId) {
    const otherActive = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.tableId, sourceTableId),
          inArray(orders.status, ACTIVE_STATUSES),
        ),
      );
    if (otherActive.length === 0) {
      await db
        .update(tables)
        .set({ status: TableStatus.AVAILABLE })
        .where(eq(tables.id, sourceTableId));
      emit.tableStatusChanged(tenantId, target.branchId, {
        tableId: sourceTableId,
        status: TableStatus.AVAILABLE,
        changedAt: new Date().toISOString(),
      });
    }
  }

  emit.orderStatusChanged(tenantId, target.branchId, sourceOrderId, {
    orderId: sourceOrderId,
    status: OrderStatus.CANCELED,
    changedAt: new Date().toISOString(),
  });

  return getOrderById(tenantId, targetOrderId);
}

export async function splitOrderEvenly(
  tenantId: string,
  orderId: string,
  splitCount: number,
) {
  if (splitCount < 2) throw badRequest('splitCount must be >= 2');
  const order = await loadOrderOrThrow(tenantId, orderId);
  if (
    order.status === OrderStatus.COMPLETED ||
    order.status === OrderStatus.CANCELED ||
    order.status === OrderStatus.REJECTED
  ) {
    throw conflict('Cannot split a closed order');
  }

  // Even split: create N-1 child orders, each holding 1/N of the parent's total.
  // Keep all line items on the parent (audit-friendly); record the split amount on each child.
  const share = Math.round(order.totalAmount / splitCount);
  const children: Array<{ id: string; orderNumber: string }> = [];

  await db.transaction(async (tx) => {
    for (let i = 1; i < splitCount; i++) {
      const [child] = await tx
        .insert(orders)
        .values({
          tenantId,
          branchId: order.branchId,
          tableId: order.tableId,
          orderNumber: 'PENDING',
          source: OrderSource.POS,
          status: OrderStatus.SERVED,
          subtotal: share,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: share,
          parentOrderId: orderId,
          notes: `Even split (${i + 1}/${splitCount}) of #${order.orderNumber}`,
        })
        .returning();
      if (!child) throw new Error('Failed to create split child');
      const childNumber = shortOrderNumber(child.id);
      await tx.update(orders).set({ orderNumber: childNumber }).where(eq(orders.id, child.id));
      children.push({ id: child.id, orderNumber: childNumber });
    }
    // Parent keeps its share too
    const parentShare = order.totalAmount - share * (splitCount - 1);
    await tx
      .update(orders)
      .set({ totalAmount: parentShare, subtotal: parentShare, taxAmount: 0 })
      .where(eq(orders.id, orderId));
  });

  return { parent: await getOrderById(tenantId, orderId), children };
}

export async function splitOrderByItem(
  tenantId: string,
  orderId: string,
  assignments: Array<{ orderItemId: string; billIndex: number }>,
) {
  const order = await loadOrderOrThrow(tenantId, orderId);
  if (
    order.status === OrderStatus.COMPLETED ||
    order.status === OrderStatus.CANCELED ||
    order.status === OrderStatus.REJECTED
  ) {
    throw conflict('Cannot split a closed order');
  }
  const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  // Validate each assignment refers to an item on this order
  for (const a of assignments) {
    if (!itemMap.has(a.orderItemId)) throw badRequest(`Item ${a.orderItemId} is not on this order`);
  }
  const maxBill = Math.max(0, ...assignments.map((a) => a.billIndex));
  if (maxBill === 0) throw badRequest('Provide at least one item with billIndex >= 1');

  const childIds: string[] = [];
  await db.transaction(async (tx) => {
    for (let bill = 1; bill <= maxBill; bill++) {
      const assignedIds = assignments.filter((a) => a.billIndex === bill).map((a) => a.orderItemId);
      if (assignedIds.length === 0) continue;
      const [child] = await tx
        .insert(orders)
        .values({
          tenantId,
          branchId: order.branchId,
          tableId: order.tableId,
          orderNumber: 'PENDING',
          source: OrderSource.POS,
          status: OrderStatus.SERVED,
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: 0,
          parentOrderId: orderId,
          notes: `By-item split of #${order.orderNumber}`,
        })
        .returning();
      if (!child) throw new Error('Failed to create split child');
      const childNumber = shortOrderNumber(child.id);
      await tx.update(orders).set({ orderNumber: childNumber }).where(eq(orders.id, child.id));
      childIds.push(child.id);
      await tx
        .update(orderItems)
        .set({ orderId: child.id })
        .where(inArray(orderItems.id, assignedIds));
    }
  });

  // Recalculate everyone
  for (const id of [orderId, ...childIds]) {
    await recalculateOrderTotals(tenantId, id);
  }

  const children = await Promise.all(childIds.map((id) => getOrderById(tenantId, id)));
  return { parent: await getOrderById(tenantId, orderId), children };
}

export async function applyDiscount(
  tenantId: string,
  orderId: string,
  input: ApplyDiscountInput,
) {
  const order = await loadOrderOrThrow(tenantId, orderId);

  let discountAmount = 0;
  let couponCode: string | null = null;
  let reason: string | null = input.reason ?? null;

  if (input.couponCode) {
    const code = input.couponCode.toUpperCase();
    const coupon = await db.query.coupons.findFirst({
      where: and(eq(coupons.tenantId, tenantId), eq(coupons.code, code), eq(coupons.isActive, true)),
    });
    if (!coupon) throw notFound('Coupon not found or inactive');
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) throw conflict('Coupon not yet valid');
    if (coupon.validUntil && now > coupon.validUntil) throw conflict('Coupon expired');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
      throw conflict('Coupon usage limit reached');
    if (order.subtotal < coupon.minSubtotal)
      throw conflict(`Minimum subtotal ${coupon.minSubtotal} not met`);

    if (coupon.type === 'flat') {
      discountAmount = Math.min(coupon.value, order.subtotal);
    } else {
      // percent: value is basis points (10000 = 100%)
      discountAmount = Math.round((order.subtotal * coupon.value) / 10000);
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
    couponCode = code;
    reason = reason ?? `Coupon ${code}`;

    await db
      .update(coupons)
      .set({ usedCount: coupon.usedCount + 1 })
      .where(eq(coupons.id, coupon.id));
  } else if (typeof input.flatAmount === 'number') {
    discountAmount = Math.min(input.flatAmount, order.subtotal);
  } else {
    throw badRequest('Provide couponCode or flatAmount');
  }

  await db
    .update(orders)
    .set({ couponCode, discountReason: reason })
    .where(eq(orders.id, orderId));
  await recalculateOrderTotals(tenantId, orderId, { discountAmount });

  emit.orderStatusChanged(tenantId, order.branchId, orderId, {
    orderId,
    status: order.status as OrderStatus,
    changedAt: new Date().toISOString(),
  });

  return getOrderById(tenantId, orderId);
}

export async function setTableStatus(
  tenantId: string,
  tableId: string,
  status: TableStatus,
) {
  const table = await db.query.tables.findFirst({
    where: and(eq(tables.id, tableId), eq(tables.tenantId, tenantId)),
  });
  if (!table) throw notFound('Table not found');
  await db.update(tables).set({ status }).where(eq(tables.id, tableId));
  emit.tableStatusChanged(tenantId, table.branchId, {
    tableId,
    status,
    changedAt: new Date().toISOString(),
  });
  return { ...table, status };
}
