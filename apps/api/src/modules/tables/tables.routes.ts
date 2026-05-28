import { Router, type Router as ExpressRouter } from 'express';
import QRCode from 'qrcode';
import { tableInput, tableUpdate, tableStatusInput, Permission, TableStatus } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, badRequest } from '../../lib/errors';
import * as service from './tables.service';
import * as orderService from '../orders/orders.service';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.TABLES_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    if (!branchId) throw badRequest('branchId is required');
    const rows = await service.listTables(req.user.tenantId, branchId);

    // Attach active QR token for each (for quick admin print/preview).
    const withQr = await Promise.all(
      rows.map(async (t) => ({
        ...t,
        qr: await service.getActiveQrForTable(req.user!.tenantId, t.id),
      })),
    );
    res.json({ items: withQr });
  }),
);

router.post(
  '/',
  requirePerm(Permission.TABLES_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    if (!branchId) throw badRequest('branchId is required');
    const body = tableInput.parse(req.body);
    res.status(201).json(await service.createTable(req.user.tenantId, branchId, body));
  }),
);

router.patch(
  '/:id',
  requirePerm(Permission.TABLES_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = tableUpdate.parse(req.body);
    res.json(await service.updateTable(req.user.tenantId, req.params.id!, body));
  }),
);

router.delete(
  '/:id',
  requirePerm(Permission.TABLES_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    await service.deleteTable(req.user.tenantId, req.params.id!);
    res.status(204).end();
  }),
);

router.patch(
  '/:id/status',
  requirePerm(Permission.TABLES_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = tableStatusInput.parse(req.body);
    res.json(
      await orderService.setTableStatus(req.user.tenantId, req.params.id!, body.status as TableStatus),
    );
  }),
);

router.post(
  '/:id/qr',
  requirePerm(Permission.TABLES_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const qr = await service.generateOrRotateQr(req.user.tenantId, req.params.id!);
    res.status(201).json(qr);
  }),
);

router.get(
  '/:id/qr.png',
  requirePerm(Permission.TABLES_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    let qr = await service.getActiveQrForTable(req.user.tenantId, req.params.id!);
    if (!qr) qr = await service.generateOrRotateQr(req.user.tenantId, req.params.id!);

    const customerBase = process.env.CUSTOMER_APP_URL ?? 'http://localhost:3000';
    const url = `${customerBase}/q/${qr.token}`;

    const png = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 600,
    });

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `inline; filename="table-${req.params.id}.png"`);
    res.send(png);
  }),
);

export const tablesRouter = router;
