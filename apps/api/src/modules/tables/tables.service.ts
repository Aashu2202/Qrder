import { and, asc, eq } from 'drizzle-orm';
import { tables, qrCodes } from '@qrder/db';
import { db } from '../../lib/db';
import { qrToken } from '../../lib/jwt';
import { notFound } from '../../lib/errors';
import { randomUUID } from 'node:crypto';
import type { TableInput, TableUpdate } from '@qrder/shared';

export async function listTables(tenantId: string, branchId: string) {
  return db
    .select()
    .from(tables)
    .where(and(eq(tables.tenantId, tenantId), eq(tables.branchId, branchId)))
    .orderBy(asc(tables.number));
}

export async function createTable(tenantId: string, branchId: string, input: TableInput) {
  const [row] = await db
    .insert(tables)
    .values({ tenantId, branchId, number: input.number, capacity: input.capacity })
    .returning();
  return row!;
}

export async function updateTable(tenantId: string, id: string, input: TableUpdate) {
  const [row] = await db
    .update(tables)
    .set(input)
    .where(and(eq(tables.id, id), eq(tables.tenantId, tenantId)))
    .returning();
  if (!row) throw notFound('Table not found');
  return row;
}

export async function deleteTable(tenantId: string, id: string) {
  const [row] = await db
    .delete(tables)
    .where(and(eq(tables.id, id), eq(tables.tenantId, tenantId)))
    .returning({ id: tables.id });
  if (!row) throw notFound('Table not found');
}

export async function generateOrRotateQr(tenantId: string, tableId: string) {
  const table = await db.query.tables.findFirst({
    where: and(eq(tables.id, tableId), eq(tables.tenantId, tenantId)),
  });
  if (!table) throw notFound('Table not found');

  // Deactivate any existing QR for this table.
  await db
    .update(qrCodes)
    .set({ isActive: false })
    .where(and(eq(qrCodes.tableId, tableId), eq(qrCodes.tenantId, tenantId)));

  const jti = randomUUID();
  const token = await qrToken.sign({
    tenantId,
    branchId: table.branchId,
    tableId: table.id,
    jti,
  });

  const [row] = await db
    .insert(qrCodes)
    .values({
      tenantId,
      branchId: table.branchId,
      tableId: table.id,
      token,
      isActive: true,
    })
    .returning();

  return row!;
}

export async function getActiveQrForTable(tenantId: string, tableId: string) {
  const row = await db.query.qrCodes.findFirst({
    where: and(
      eq(qrCodes.tableId, tableId),
      eq(qrCodes.tenantId, tenantId),
      eq(qrCodes.isActive, true),
    ),
  });
  return row ?? null;
}
