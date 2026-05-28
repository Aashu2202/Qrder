import { Router, type Router as ExpressRouter } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { serviceRequests } from '@qrder/db';
import { Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, badRequest, notFound } from '../../lib/errors';
import { db } from '../../lib/db';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.ORDERS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    if (!branchId) throw badRequest('branchId is required');
    const openOnly = req.query.openOnly !== 'false';
    const conds = [eq(serviceRequests.tenantId, req.user.tenantId), eq(serviceRequests.branchId, branchId)];
    if (openOnly) conds.push(inArray(serviceRequests.status, ['open', 'acknowledged']));
    const rows = await db
      .select()
      .from(serviceRequests)
      .where(and(...conds))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(100);
    res.json({ items: rows });
  }),
);

router.post(
  '/:id/acknowledge',
  requirePerm(Permission.ORDERS_STATUS),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const [row] = await db
      .update(serviceRequests)
      .set({ status: 'acknowledged', acknowledgedByStaffId: req.user.id, acknowledgedAt: new Date() })
      .where(
        and(
          eq(serviceRequests.id, req.params.id!),
          eq(serviceRequests.tenantId, req.user.tenantId),
        ),
      )
      .returning();
    if (!row) throw notFound('Service request not found');
    res.json(row);
  }),
);

router.post(
  '/:id/resolve',
  requirePerm(Permission.ORDERS_STATUS),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const [row] = await db
      .update(serviceRequests)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(
        and(
          eq(serviceRequests.id, req.params.id!),
          eq(serviceRequests.tenantId, req.user.tenantId),
        ),
      )
      .returning();
    if (!row) throw notFound('Service request not found');
    res.json(row);
  }),
);

export const serviceRequestsRouter = router;
