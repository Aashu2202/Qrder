import { Router, type Router as ExpressRouter } from 'express';
import { Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized } from '../../lib/errors';
import * as service from './analytics.service';

const router: ExpressRouter = Router();
router.use(requireAuth);

function readRange(req: { query: { range?: unknown } }): service.RangeKey {
  const r = req.query.range;
  if (r === 'today' || r === '7d' || r === '30d' || r === '90d') return r;
  return '7d';
}

function readBranch(req: { query: { branchId?: unknown } }): string | undefined {
  return typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
}

router.get(
  '/summary',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const range = readRange(req);
    const branchId = readBranch(req);
    res.json(await service.summary({ tenantId: req.user.tenantId, branchId }, range));
  }),
);

router.get(
  '/top-items',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const range = readRange(req);
    const branchId = readBranch(req);
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    res.json({ items: await service.topItems({ tenantId: req.user.tenantId, branchId }, range, limit) });
  }),
);

router.get(
  '/peak-hours',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const range = readRange(req);
    const branchId = readBranch(req);
    res.json({ items: await service.peakHours({ tenantId: req.user.tenantId, branchId }, range) });
  }),
);

router.get(
  '/revenue-series',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const range = readRange(req);
    const branchId = readBranch(req);
    res.json({
      items: await service.revenueSeries({ tenantId: req.user.tenantId, branchId }, range),
    });
  }),
);

router.get(
  '/payment-methods',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const range = readRange(req);
    const branchId = readBranch(req);
    res.json({
      items: await service.paymentMethodsBreakdown(
        { tenantId: req.user.tenantId, branchId },
        range,
      ),
    });
  }),
);

router.get(
  '/export.csv',
  requirePerm(Permission.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const range = readRange(req);
    const branchId = readBranch(req);
    const rows = await service.ordersForExport(
      { tenantId: req.user.tenantId, branchId },
      range,
    );
    const header = [
      'orderNumber',
      'status',
      'source',
      'tableId',
      'subtotal',
      'taxAmount',
      'discountAmount',
      'totalAmount',
      'placedAt',
      'completedAt',
    ];
    const escape = (v: unknown): string => {
      if (v == null) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.orderNumber,
          r.status,
          r.source,
          r.tableId,
          r.subtotal,
          r.taxAmount,
          r.discountAmount,
          r.totalAmount,
          r.placedAt,
          r.completedAt,
        ]
          .map(escape)
          .join(','),
      );
    }
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="orders-${range}.csv"`);
    res.send(lines.join('\n'));
  }),
);

export const analyticsRouter = router;
