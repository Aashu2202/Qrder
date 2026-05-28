import { Router, type Router as ExpressRouter } from 'express';
import {
  placeOrderInput,
  orderStatusUpdate,
  Permission,
  OrderItemStatus,
  addItemsInput,
  transferOrderInput,
  mergeOrdersInput,
  splitOrderInput,
  applyDiscountInput,
} from '@qrder/shared';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, badRequest } from '../../lib/errors';
import * as service from './orders.service';
import { renderInvoiceForOrder, renderKotForOrder } from './orders.pdf';
import { recordAudit } from '../../lib/audit';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.ORDERS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const branchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const activeOnly = req.query.activeOnly === 'true';
    const items = await service.listOrders(req.user.tenantId, {
      branchId: branchId ?? undefined,
      status,
      activeOnly,
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  requirePerm(Permission.ORDERS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await service.getOrderById(req.user.tenantId, req.params.id!));
  }),
);

router.post(
  '/',
  requirePerm(Permission.ORDERS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = placeOrderInput.parse(req.body);
    const branchId =
      typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    if (!branchId) throw badRequest('branchId required');
    const tableId = typeof req.query.tableId === 'string' ? req.query.tableId : null;
    const created = await service.placeOrder(
      {
        tenantId: req.user.tenantId,
        branchId,
        tableId,
        source: 'pos',
        staffId: req.user.id,
      },
      body,
    );
    res.status(201).json(created);
  }),
);

router.patch(
  '/:id/status',
  requirePerm(Permission.ORDERS_STATUS),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const { status } = orderStatusUpdate.parse(req.body);
    res.json(await service.updateOrderStatus(req.user.tenantId, req.params.id!, status, req.user.id));
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
  '/items/:itemId/status',
  requirePerm(Permission.ORDERS_STATUS),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const { status } = itemStatusInput.parse(req.body);
    await service.updateOrderItemStatus(req.user.tenantId, req.params.itemId!, status);
    res.status(204).end();
  }),
);

router.post(
  '/:id/items',
  requirePerm(Permission.ORDERS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = addItemsInput.parse(req.body);
    res.json(await service.addItemsToOrder(req.user.tenantId, req.params.id!, body));
  }),
);

router.post(
  '/:id/transfer',
  requirePerm(Permission.ORDERS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = transferOrderInput.parse(req.body);
    res.json(await service.transferOrder(req.user.tenantId, req.params.id!, body.targetTableId));
  }),
);

router.post(
  '/:id/merge',
  requirePerm(Permission.ORDERS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = mergeOrdersInput.parse(req.body);
    res.json(await service.mergeOrders(req.user.tenantId, req.params.id!, body.sourceOrderId));
  }),
);

router.post(
  '/:id/split',
  requirePerm(Permission.ORDERS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = splitOrderInput.parse(req.body);
    if (body.mode === 'evenly') {
      if (!body.splitCount) throw badRequest('splitCount required for evenly mode');
      res.json(await service.splitOrderEvenly(req.user.tenantId, req.params.id!, body.splitCount));
    } else {
      if (!body.assignments?.length) throw badRequest('assignments required for by-item mode');
      res.json(
        await service.splitOrderByItem(req.user.tenantId, req.params.id!, body.assignments),
      );
    }
  }),
);

router.get(
  '/:id/invoice.pdf',
  requirePerm(Permission.ORDERS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const buf = await renderInvoiceForOrder(req.user.tenantId, req.params.id!);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.send(buf);
  }),
);

router.get(
  '/:id/kot.pdf',
  requirePerm(Permission.ORDERS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const buf = await renderKotForOrder(req.user.tenantId, req.params.id!);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="kot-${req.params.id}.pdf"`);
    res.send(buf);
  }),
);

router.post(
  '/:id/discount',
  requirePerm(Permission.ORDERS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = applyDiscountInput.parse(req.body);
    const result = await service.applyDiscount(req.user.tenantId, req.params.id!, body);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'discount',
      entity: 'order',
      entityId: req.params.id!,
      diff: { ...body, newDiscountAmount: result.discountAmount, newTotal: result.totalAmount },
      ip: req.ip ?? null,
    });
    res.json(result);
  }),
);

export const ordersRouter = router;
