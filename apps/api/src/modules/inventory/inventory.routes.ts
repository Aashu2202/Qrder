import { Router, type Router as ExpressRouter } from 'express';
import { and, asc, desc, eq } from 'drizzle-orm';
import { inventoryItems, stockMovements } from '@qrder/db';
import { Permission, inventoryItemInput, inventoryItemUpdate, stockMovementInput } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, notFound, badRequest } from '../../lib/errors';
import { db } from '../../lib/db';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/items',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    if (!branchId) throw badRequest('branchId is required');
    const items = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, req.user.tenantId), eq(inventoryItems.branchId, branchId)))
      .orderBy(asc(inventoryItems.name));
    res.json({ items });
  }),
);

router.post(
  '/items',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = inventoryItemInput.parse(req.body);
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : req.user.branchId;
    if (!branchId) throw badRequest('branchId is required');
    const [row] = await db
      .insert(inventoryItems)
      .values({
        tenantId: req.user.tenantId,
        branchId,
        name: body.name,
        unit: body.unit,
        stockQty: body.stockQty.toString(),
        reorderLevel: body.reorderLevel?.toString() ?? null,
        costPerUnit: body.costPerUnit ?? null,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.patch(
  '/items/:id',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = inventoryItemUpdate.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.unit !== undefined) patch.unit = body.unit;
    if (body.stockQty !== undefined) patch.stockQty = body.stockQty.toString();
    if (body.reorderLevel !== undefined)
      patch.reorderLevel = body.reorderLevel === null ? null : body.reorderLevel.toString();
    if (body.costPerUnit !== undefined) patch.costPerUnit = body.costPerUnit;
    const [row] = await db
      .update(inventoryItems)
      .set(patch)
      .where(
        and(eq(inventoryItems.id, req.params.id!), eq(inventoryItems.tenantId, req.user.tenantId)),
      )
      .returning();
    if (!row) throw notFound('Inventory item not found');
    res.json(row);
  }),
);

router.delete(
  '/items/:id',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const [row] = await db
      .delete(inventoryItems)
      .where(
        and(eq(inventoryItems.id, req.params.id!), eq(inventoryItems.tenantId, req.user.tenantId)),
      )
      .returning({ id: inventoryItems.id });
    if (!row) throw notFound('Inventory item not found');
    res.status(204).end();
  }),
);

router.post(
  '/items/:id/movements',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = stockMovementInput.parse(req.body);
    const item = await db.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.id, req.params.id!),
        eq(inventoryItems.tenantId, req.user.tenantId),
      ),
    });
    if (!item) throw notFound('Inventory item not found');

    // Apply atomically
    await db.transaction(async (tx) => {
      const newQty = Number(item.stockQty) + body.changeQty;
      if (newQty < 0) throw badRequest('Resulting stock cannot be negative');
      await tx
        .update(inventoryItems)
        .set({ stockQty: newQty.toString() })
        .where(eq(inventoryItems.id, item.id));
      await tx.insert(stockMovements).values({
        tenantId: req.user!.tenantId,
        inventoryItemId: item.id,
        changeQty: body.changeQty.toString(),
        reason: body.reason,
      });
    });

    const updated = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, item.id),
    });
    res.json(updated);
  }),
);

router.get(
  '/items/:id/movements',
  requirePerm(Permission.SETTINGS_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const item = await db.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.id, req.params.id!),
        eq(inventoryItems.tenantId, req.user.tenantId),
      ),
    });
    if (!item) throw notFound('Inventory item not found');
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.inventoryItemId, item.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(50);
    res.json({ items: movements });
  }),
);

export const inventoryRouter = router;
