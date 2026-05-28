import { Router, type Router as ExpressRouter } from 'express';
import { Permission, OrderItemStatus } from '@qrder/shared';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, badRequest } from '../../lib/errors';
import * as service from '../orders/orders.service';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/queue',
  requirePerm(Permission.KITCHEN_OPERATE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const branchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    if (!branchId) throw badRequest('branchId is required');
    res.json({ items: await service.kitchenQueue(req.user.tenantId, branchId) });
  }),
);

const itemStatusInput = z.object({
  status: z.enum([
    OrderItemStatus.PENDING,
    OrderItemStatus.PREPARING,
    OrderItemStatus.READY,
    OrderItemStatus.SERVED,
  ]),
});

router.patch(
  '/items/:itemId',
  requirePerm(Permission.KITCHEN_OPERATE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const { status } = itemStatusInput.parse(req.body);
    await service.updateOrderItemStatus(req.user.tenantId, req.params.itemId!, status);
    res.status(204).end();
  }),
);

export const kitchenRouter = router;
