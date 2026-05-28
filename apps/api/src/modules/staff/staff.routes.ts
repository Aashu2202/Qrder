import { Router, type Router as ExpressRouter } from 'express';
import { staffInput, staffUpdate, resetPasswordInput, Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized } from '../../lib/errors';
import * as service from './staff.service';
import { recordAudit } from '../../lib/audit';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePerm(Permission.STAFF_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json({ items: await service.listStaff(req.user.tenantId) });
  }),
);

router.post(
  '/',
  requirePerm(Permission.STAFF_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = staffInput.parse(req.body);
    const created = await service.createStaff(req.user.tenantId, body);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'create',
      entity: 'staff',
      entityId: created.id,
      diff: { email: created.email, role: created.role, branchId: created.branchId },
      ip: req.ip ?? null,
    });
    res.status(201).json(created);
  }),
);

router.patch(
  '/:id',
  requirePerm(Permission.STAFF_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = staffUpdate.parse(req.body);
    const updated = await service.updateStaff(req.user.tenantId, req.params.id!, body);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'update',
      entity: 'staff',
      entityId: updated.id,
      diff: body,
      ip: req.ip ?? null,
    });
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  requirePerm(Permission.STAFF_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    await service.deleteStaff(req.user.tenantId, req.params.id!, req.user.id);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'delete',
      entity: 'staff',
      entityId: req.params.id!,
      diff: null,
      ip: req.ip ?? null,
    });
    res.status(204).end();
  }),
);

router.post(
  '/:id/reset-password',
  requirePerm(Permission.STAFF_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const { newPassword } = resetPasswordInput.parse(req.body);
    await service.resetPassword(req.user.tenantId, req.params.id!, newPassword);
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'reset_password',
      entity: 'staff',
      entityId: req.params.id!,
      diff: null,
      ip: req.ip ?? null,
    });
    res.status(204).end();
  }),
);

export const staffRouter = router;
