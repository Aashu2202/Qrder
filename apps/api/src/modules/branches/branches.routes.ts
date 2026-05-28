import { Router, type Router as ExpressRouter } from 'express';
import QRCode from 'qrcode';
import { asc, eq, and } from 'drizzle-orm';
import { branches, tables, tenants } from '@qrder/db';
import { Permission, branchInput, branchUpdate } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, notFound, conflict } from '../../lib/errors';
import { db } from '../../lib/db';
import { renderQrSheet } from '../../integrations/pdf';
import * as tablesService from '../tables/tables.service';
import { recordAudit } from '../../lib/audit';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const items = await db
      .select()
      .from(branches)
      .where(eq(branches.tenantId, req.user.tenantId))
      .orderBy(asc(branches.name));
    res.json({ items });
  }),
);

router.post(
  '/',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = branchInput.parse(req.body);
    const [row] = await db
      .insert(branches)
      .values({
        tenantId: req.user.tenantId,
        name: body.name,
        address: body.address ?? {},
        phone: body.phone ?? null,
        isActive: body.isActive,
      })
      .returning();
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'create',
      entity: 'branch',
      entityId: row!.id,
      diff: { name: row!.name },
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
    const body = branchUpdate.parse(req.body);
    const [row] = await db
      .update(branches)
      .set(body)
      .where(and(eq(branches.id, req.params.id!), eq(branches.tenantId, req.user.tenantId)))
      .returning();
    if (!row) throw notFound('Branch not found');
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'update',
      entity: 'branch',
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
    const tableCount = await db
      .select({ id: tables.id })
      .from(tables)
      .where(and(eq(tables.tenantId, req.user.tenantId), eq(tables.branchId, req.params.id!)));
    if (tableCount.length > 0) {
      throw conflict(`Branch has ${tableCount.length} table(s) — deactivate instead, or delete tables first`);
    }
    const [row] = await db
      .delete(branches)
      .where(and(eq(branches.id, req.params.id!), eq(branches.tenantId, req.user.tenantId)))
      .returning({ id: branches.id });
    if (!row) throw notFound('Branch not found');
    await recordAudit({
      tenantId: req.user.tenantId,
      actorStaffId: req.user.id,
      action: 'delete',
      entity: 'branch',
      entityId: req.params.id!,
      diff: null,
      ip: req.ip ?? null,
    });
    res.status(204).end();
  }),
);

router.get(
  '/:id/qr-sheet.pdf',
  requirePerm(Permission.TABLES_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const branch = await db.query.branches.findFirst({
      where: and(eq(branches.id, req.params.id!), eq(branches.tenantId, req.user.tenantId)),
    });
    if (!branch) throw notFound('Branch not found');
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, req.user.tenantId) });
    if (!tenant) throw notFound('Tenant missing');

    const branchTables = await db
      .select()
      .from(tables)
      .where(and(eq(tables.tenantId, req.user.tenantId), eq(tables.branchId, branch.id)))
      .orderBy(asc(tables.number));

    const customerBase = process.env.CUSTOMER_APP_URL ?? 'http://localhost:3000';
    const tableEntries: Array<{ number: string; pngDataUrl: string; url: string }> = [];

    for (const t of branchTables) {
      let qr = await tablesService.getActiveQrForTable(req.user.tenantId, t.id);
      if (!qr) qr = await tablesService.generateOrRotateQr(req.user.tenantId, t.id);
      const url = `${customerBase}/q/${qr.token}`;
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 320,
      });
      tableEntries.push({ number: t.number, pngDataUrl: dataUrl, url });
    }

    const buf = await renderQrSheet({
      tenant: { name: tenant.name, logoUrl: tenant.logoUrl },
      branch: { name: branch.name },
      tables: tableEntries,
    });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="qr-sheet-${branch.name}.pdf"`);
    res.send(buf);
  }),
);

export const branchesRouter = router;
