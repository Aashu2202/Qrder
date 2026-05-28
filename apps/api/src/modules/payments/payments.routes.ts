import { Router, type Router as ExpressRouter, raw as expressRaw } from 'express';
import { manualPaymentInput, refundInput, Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, badRequest } from '../../lib/errors';
import * as service from './payments.service';
import { recordAudit } from '../../lib/audit';

const router: ExpressRouter = Router();

router.use(requireAuth);

router.get(
  '/by-order/:orderId',
  requirePerm(Permission.PAYMENTS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json({
      items: await service.listPaymentsForOrder(req.user.tenantId, req.params.orderId!),
    });
  }),
);

router.post(
  '/',
  requirePerm(Permission.PAYMENTS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = manualPaymentInput.parse(req.body);
    res.status(201).json(await service.recordManualPayment(req.user.tenantId, body));
  }),
);

router.post(
  '/:id/refund',
  requirePerm(Permission.PAYMENTS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = refundInput.parse(req.body);
    const result = await service.refundPayment(req.user.tenantId, req.params.id!, body);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'refund',
      entity: 'payment',
      entityId: req.params.id!,
      diff: { amount: body.amount, reason: body.reason },
      ip: req.ip ?? null,
    });
    res.json(result);
  }),
);

export const paymentsRouter = router;

/**
 * Webhook router — mounted separately with a raw-body middleware so HMAC
 * signature verification can use the exact bytes Razorpay signed.
 */
export const paymentsWebhookRouter: ExpressRouter = Router();

paymentsWebhookRouter.post(
  '/razorpay',
  expressRaw({ type: '*/*' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string') throw badRequest('Missing signature');
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    res.json(await service.handleWebhook(raw, signature));
  }),
);
