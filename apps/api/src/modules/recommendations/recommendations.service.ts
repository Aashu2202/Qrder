import { sql, and, eq, ne, inArray, gte } from 'drizzle-orm';
import { orderItems, orders, menuItems } from '@qrder/db';
import { db } from '../../lib/db';
import { OrderStatus } from '@qrder/shared';

/**
 * "Customers who ordered X also ordered Y" — co-occurrence in the same order.
 *
 * Joins order_items to itself on order_id, then ranks by frequency. Returns
 * basic menu_item info for the recommendation strip.
 */
export async function alsoOrderedWith(
  tenantId: string,
  menuItemId: string,
  limit = 5,
) {
  // Find the orders that contain the seed item
  const seedOrders = db
    .select({ orderId: orderItems.orderId })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orderItems.menuItemId, menuItemId),
        eq(orders.tenantId, tenantId),
        inArray(orders.status, [OrderStatus.COMPLETED, OrderStatus.SERVED]),
      ),
    );

  // Co-occurring items in those orders
  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      count: sql<string>`count(*)`,
    })
    .from(orderItems)
    .where(
      and(
        ne(orderItems.menuItemId, menuItemId),
        inArray(orderItems.orderId, seedOrders),
      ),
    )
    .groupBy(orderItems.menuItemId)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  if (rows.length === 0) return [];

  // Hydrate item info (only the fields the customer card needs)
  const items = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      basePrice: menuItems.basePrice,
      imageUrl: menuItems.imageUrl,
      isVeg: menuItems.isVeg,
      isAvailable: menuItems.isAvailable,
    })
    .from(menuItems)
    .where(
      and(
        eq(menuItems.tenantId, tenantId),
        inArray(
          menuItems.id,
          rows.map((r) => r.menuItemId),
        ),
        eq(menuItems.isAvailable, true),
      ),
    );

  const countById = new Map(rows.map((r) => [r.menuItemId, Number(r.count)]));
  return items
    .map((i) => ({ ...i, coCount: countById.get(i.id) ?? 0 }))
    .sort((a, b) => b.coCount - a.coCount);
}

/** Top sellers in the last 30 days — fallback "trending" recommendation. */
export async function trending(tenantId: string, limit = 8) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      qty: sql<string>`sum(${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        inArray(orders.status, [OrderStatus.COMPLETED, OrderStatus.SERVED]),
        gte(orders.placedAt, since),
      ),
    )
    .groupBy(orderItems.menuItemId)
    .orderBy(sql`sum(${orderItems.quantity}) desc`)
    .limit(limit);

  if (rows.length === 0) return [];

  const items = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      basePrice: menuItems.basePrice,
      imageUrl: menuItems.imageUrl,
      isVeg: menuItems.isVeg,
      isAvailable: menuItems.isAvailable,
    })
    .from(menuItems)
    .where(
      and(
        eq(menuItems.tenantId, tenantId),
        inArray(
          menuItems.id,
          rows.map((r) => r.menuItemId),
        ),
        eq(menuItems.isAvailable, true),
      ),
    );

  const qtyById = new Map(rows.map((r) => [r.menuItemId, Number(r.qty)]));
  return items
    .map((i) => ({ ...i, qty: qtyById.get(i.id) ?? 0 }))
    .sort((a, b) => b.qty - a.qty);
}
