import { Router, type Router as ExpressRouter } from 'express';
import { and, desc, eq, lt } from 'drizzle-orm';
import { auditLogs, staff } from '@qrder/db';
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
    const before = typeof req.query.before === 'string' ? new Date(req.query.before) : null;
    const conds = [eq(auditLogs.tenantId, req.user.tenantId)];
    if (before && !Number.isNaN(before.getTime())) conds.push(lt(auditLogs.createdAt, before));

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        diff: auditLogs.diff,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
        actorStaffId: auditLogs.actorStaffId,
        actorName: staff.name,
        actorEmail: staff.email,
      })
      .from(auditLogs)
      .leftJoin(staff, eq(auditLogs.actorStaffId, staff.id))
      .where(and(...conds))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    res.json({ items: rows });
  }),
);

export const auditRouter = router;
