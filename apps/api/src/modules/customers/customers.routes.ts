import { Router, type Router as ExpressRouter } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { customers, orders, feedback } from '@qrder/db';
import { Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, notFound } from '../../lib/errors';
import { db } from '../../lib/db';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.ORDERS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const conds = [eq(customers.tenantId, req.user.tenantId)];
    if (search) {
      conds.push(
        sql`(${customers.phone} ilike ${'%' + search + '%'} or ${customers.name} ilike ${'%' + search + '%'})`,
      );
    }

    const rows = await db
      .select()
      .from(customers)
      .where(and(...conds))
      .orderBy(desc(customers.totalSpend))
      .limit(limit);

    res.json({ items: rows });
  }),
);

router.get(
  '/:id',
  requirePerm(Permission.ORDERS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, req.params.id!), eq(customers.tenantId, req.user.tenantId)),
    });
    if (!customer) throw notFound('Customer not found');

    const orderList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        placedAt: orders.placedAt,
        completedAt: orders.completedAt,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, req.user.tenantId), eq(orders.customerId, customer.id)))
      .orderBy(desc(orders.placedAt))
      .limit(50);

    const fb = await db
      .select()
      .from(feedback)
      .where(and(eq(feedback.tenantId, req.user.tenantId), eq(feedback.customerId, customer.id)))
      .orderBy(desc(feedback.createdAt))
      .limit(20);

    res.json({ customer, orders: orderList, feedback: fb });
  }),
);

export const customersRouter = router;
