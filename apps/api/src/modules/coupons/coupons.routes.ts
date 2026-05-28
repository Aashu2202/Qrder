import { Router, type Router as ExpressRouter } from 'express';
import { and, eq, asc } from 'drizzle-orm';
import { coupons } from '@qrder/db';
import { couponInput, couponUpdate, Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, notFound } from '../../lib/errors';
import { db } from '../../lib/db';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const items = await db
      .select()
      .from(coupons)
      .where(eq(coupons.tenantId, req.user.tenantId))
      .orderBy(asc(coupons.code));
    res.json({ items });
  }),
);

router.post(
  '/',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = couponInput.parse(req.body);
    const [row] = await db
      .insert(coupons)
      .values({
        tenantId: req.user.tenantId,
        code: body.code.toUpperCase(),
        type: body.type,
        value: body.value,
        minSubtotal: body.minSubtotal,
        maxDiscount: body.maxDiscount ?? null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        maxUses: body.maxUses ?? null,
        isActive: body.isActive,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.patch(
  '/:id',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = couponUpdate.parse(req.body);
    const patch: Record<string, unknown> = { ...body };
    if (body.code) patch.code = body.code.toUpperCase();
    if (body.validFrom !== undefined) patch.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    if (body.validUntil !== undefined) patch.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    const [row] = await db
      .update(coupons)
      .set(patch)
      .where(and(eq(coupons.id, req.params.id!), eq(coupons.tenantId, req.user.tenantId)))
      .returning();
    if (!row) throw notFound('Coupon not found');
    res.json(row);
  }),
);

router.delete(
  '/:id',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const [row] = await db
      .delete(coupons)
      .where(and(eq(coupons.id, req.params.id!), eq(coupons.tenantId, req.user.tenantId)))
      .returning({ id: coupons.id });
    if (!row) throw notFound('Coupon not found');
    res.status(204).end();
  }),
);

export const couponsRouter = router;
