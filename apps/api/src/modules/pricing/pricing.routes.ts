import { Router, type Router as ExpressRouter } from 'express';
import { Permission, pricingRuleInput, pricingRuleUpdate } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized } from '../../lib/errors';
import * as service from './pricing.service';
import { recordAudit } from '../../lib/audit';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.MENU_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json({ items: await service.listRules(req.user.tenantId) });
  }),
);

router.post(
  '/',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = pricingRuleInput.parse(req.body);
    const row = await service.createRule(req.user.tenantId, body);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'create',
      entity: 'pricing_rule',
      entityId: row.id,
      diff: { name: row.name, type: row.type, value: row.value },
      ip: req.ip ?? null,
    });
    res.status(201).json(row);
  }),
);

router.patch(
  '/:id',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = pricingRuleUpdate.parse(req.body);
    const row = await service.updateRule(req.user.tenantId, req.params.id!, body);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'update',
      entity: 'pricing_rule',
      entityId: row.id,
      diff: body,
      ip: req.ip ?? null,
    });
    res.json(row);
  }),
);

router.delete(
  '/:id',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    await service.deleteRule(req.user.tenantId, req.params.id!);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'delete',
      entity: 'pricing_rule',
      entityId: req.params.id!,
      diff: null,
      ip: req.ip ?? null,
    });
    res.status(204).end();
  }),
);

export const pricingRouter = router;
