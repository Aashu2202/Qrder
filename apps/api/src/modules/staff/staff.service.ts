import { and, asc, eq, ne } from 'drizzle-orm';
import { staff } from '@qrder/db';
import { hashPassword } from '@qrder/auth';
import type { StaffInput, StaffUpdate } from '@qrder/shared';
import { db } from '../../lib/db';
import { notFound, conflict, badRequest } from '../../lib/errors';

export interface StaffPublic {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  branchId: string | null;
  stationIds: string[] | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

function toPublic(row: typeof staff.$inferSelect): StaffPublic {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    branchId: row.branchId,
    stationIds: row.stationIds,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

export async function listStaff(tenantId: string): Promise<StaffPublic[]> {
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.tenantId, tenantId))
    .orderBy(asc(staff.name));
  return rows.map(toPublic);
}

export async function createStaff(tenantId: string, input: StaffInput): Promise<StaffPublic> {
  const existing = await db.query.staff.findFirst({
    where: and(eq(staff.tenantId, tenantId), eq(staff.email, input.email)),
  });
  if (existing) throw conflict('A staff member with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(staff)
    .values({
      tenantId,
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      role: input.role,
      branchId: input.branchId,
      stationIds: input.stationIds ?? null,
      passwordHash,
      isActive: input.isActive,
    })
    .returning();
  return toPublic(row!);
}

export async function updateStaff(
  tenantId: string,
  id: string,
  input: StaffUpdate,
): Promise<StaffPublic> {
  const target = await db.query.staff.findFirst({
    where: and(eq(staff.id, id), eq(staff.tenantId, tenantId)),
  });
  if (!target) throw notFound('Staff not found');

  // Prevent the last super_admin from being demoted or deactivated
  if (
    target.role === 'super_admin' &&
    ((input.role !== undefined && input.role !== 'super_admin') ||
      input.isActive === false)
  ) {
    const otherSupers = await db
      .select({ id: staff.id })
      .from(staff)
      .where(
        and(
          eq(staff.tenantId, tenantId),
          eq(staff.role, 'super_admin'),
          eq(staff.isActive, true),
          ne(staff.id, id),
        ),
      );
    if (otherSupers.length === 0) {
      throw conflict('Cannot demote/deactivate the last active super_admin');
    }
  }

  const [row] = await db
    .update(staff)
    .set(input)
    .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)))
    .returning();
  return toPublic(row!);
}

export async function deleteStaff(tenantId: string, id: string, callerId: string) {
  if (id === callerId) throw badRequest('You cannot delete your own account');
  const target = await db.query.staff.findFirst({
    where: and(eq(staff.id, id), eq(staff.tenantId, tenantId)),
  });
  if (!target) throw notFound('Staff not found');

  if (target.role === 'super_admin') {
    const otherSupers = await db
      .select({ id: staff.id })
      .from(staff)
      .where(
        and(
          eq(staff.tenantId, tenantId),
          eq(staff.role, 'super_admin'),
          eq(staff.isActive, true),
          ne(staff.id, id),
        ),
      );
    if (otherSupers.length === 0) {
      throw conflict('Cannot delete the last active super_admin');
    }
  }

  await db
    .delete(staff)
    .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)));
}

export async function resetPassword(tenantId: string, id: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  const [row] = await db
    .update(staff)
    .set({ passwordHash })
    .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)))
    .returning({ id: staff.id });
  if (!row) throw notFound('Staff not found');
}
