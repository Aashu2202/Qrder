import { Router, type Router as ExpressRouter } from 'express';
import {
  placeOrderInput,
  paymentVerifyInput,
  waiterCallInput,
  feedbackInput,
} from '@qrder/shared';
import { feedback as feedbackTable, serviceRequests } from '@qrder/db';
import { asyncHandler } from '../../lib/asyncHandler';
import { customerLimiter } from '../../middleware/rateLimit';
import { db } from '../../lib/db';
import * as service from './qr.service';
import * as orderService from '../orders/orders.service';
import * as paymentService from '../payments/payments.service';
import * as recommendationsService from '../recommendations/recommendations.service';
import { emit } from '../../realtime/emit';

/**
 * Public, no-auth routes scoped to a QR token.
 * URL shape: /q/:token/...
 */
const router: ExpressRouter = Router({ mergeParams: true });

router.use(customerLimiter);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await service.publicResolve(req.params.token!));
  }),
);

router.get(
  '/menu',
  asyncHandler(async (req, res) => {
    const locale = typeof req.query.locale === 'string' ? req.query.locale : undefined;
    res.json(await service.publicMenu(req.params.token!, locale));
  }),
);

router.post(
  '/orders',
  asyncHandler(async (req, res) => {
    const ctx = await service.resolveQrToken(req.params.token!);
    const body = placeOrderInput.parse(req.body);
    const created = await orderService.placeOrder(
      {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId,
        tableId: ctx.tableId,
        source: 'qr',
      },
      body,
    );
    res.status(201).json(created);
  }),
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const ctx = await service.resolveQrToken(req.params.token!);
    const order = await orderService.getOrderById(ctx.tenantId, req.params.id!);
    res.json(order);
  }),
);

router.post(
  '/orders/:id/payment/initiate',
  asyncHandler(async (req, res) => {
    const ctx = await service.resolveQrToken(req.params.token!);
    res.json(
      await paymentService.initiateOnlinePayment({
        tenantId: ctx.tenantId,
        orderId: req.params.id!,
      }),
    );
  }),
);

router.post(
  '/orders/:id/payment/verify',
  asyncHandler(async (req, res) => {
    const ctx = await service.resolveQrToken(req.params.token!);
    const body = paymentVerifyInput.parse(req.body);
    res.json(await paymentService.verifyPaymentSignature(ctx.tenantId, body));
  }),
);

router.post(
  '/waiter-call',
  asyncHandler(async (req, res) => {
    const ctx = await service.resolveQrToken(req.params.token!);
    const body = waiterCallInput.parse(req.body);
    // Persist so the POS can see open requests after refresh, not just live.
    await db.insert(serviceRequests).values({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      tableId: ctx.tableId,
      reason: body.reason,
    });
    emit.tableWaiterCalled(ctx.tenantId, ctx.branchId, {
      tableId: ctx.tableId,
      reason: body.reason,
    });
    res.status(204).end();
  }),
);

router.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const ctx = await service.resolveQrToken(req.params.token!);
    const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : null;
    if (itemId) {
      res.json({ items: await recommendationsService.alsoOrderedWith(ctx.tenantId, itemId, 5) });
      return;
    }
    res.json({ items: await recommendationsService.trending(ctx.tenantId, 8) });
  }),
);

router.post(
  '/orders/:id/feedback',
  asyncHandler(async (req, res) => {
    const ctx = await service.resolveQrToken(req.params.token!);
    const body = feedbackInput.parse(req.body);
    await db.insert(feedbackTable).values({
      tenantId: ctx.tenantId,
      orderId: req.params.id!,
      rating: body.rating,
      comment: body.comment ?? null,
    });
    res.status(204).end();
  }),
);

export const qrRouter = router;
