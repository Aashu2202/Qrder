import { Router, type Router as ExpressRouter } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { feedback, orders, customers } from '@qrder/db';
import { Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized } from '../../lib/errors';
import { db } from '../../lib/db';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const rows = await db
      .select({
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
        orderId: feedback.orderId,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        customerPhone: customers.phone,
      })
      .from(feedback)
      .leftJoin(orders, eq(orders.id, feedback.orderId))
      .leftJoin(customers, eq(customers.id, feedback.customerId))
      .where(eq(feedback.tenantId, req.user.tenantId))
      .orderBy(desc(feedback.createdAt))
      .limit(limit);

    res.json({ items: rows });
  }),
);

router.get(
  '/summary',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const days = Math.min(Number(req.query.days ?? 30), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const summary = await db
      .select({
        avgRating: sql<string>`avg(${feedback.rating})`,
        count: sql<string>`count(*)`,
        oneStar: sql<string>`sum(case when ${feedback.rating} = 1 then 1 else 0 end)`,
        twoStar: sql<string>`sum(case when ${feedback.rating} = 2 then 1 else 0 end)`,
        threeStar: sql<string>`sum(case when ${feedback.rating} = 3 then 1 else 0 end)`,
        fourStar: sql<string>`sum(case when ${feedback.rating} = 4 then 1 else 0 end)`,
        fiveStar: sql<string>`sum(case when ${feedback.rating} = 5 then 1 else 0 end)`,
      })
      .from(feedback)
      .where(and(eq(feedback.tenantId, req.user.tenantId), gte(feedback.createdAt, since)));

    const row = summary[0]!;
    res.json({
      days,
      count: Number(row.count),
      avgRating: row.avgRating ? Number(Number(row.avgRating).toFixed(2)) : null,
      distribution: {
        1: Number(row.oneStar ?? 0),
        2: Number(row.twoStar ?? 0),
        3: Number(row.threeStar ?? 0),
        4: Number(row.fourStar ?? 0),
        5: Number(row.fiveStar ?? 0),
      },
    });
  }),
);

export const feedbackRouter = router;
