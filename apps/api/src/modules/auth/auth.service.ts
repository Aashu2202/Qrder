import { eq, and } from 'drizzle-orm';
import { staff, tenants } from '@qrder/db';
import { verifyPassword, type AccessTokenClaims } from '@qrder/auth';
import { RolePermissions, type Role } from '@qrder/shared';
import { db } from '../../lib/db.js';
import { jwt } from '../../lib/jwt.js';
import { unauthorized } from '../../lib/errors.js';
import { randomUUID } from 'node:crypto';

export interface LoginParams {
  email: string;
  password: string;
  tenantSlug?: string;
}

export async function login({ email, password, tenantSlug }: LoginParams) {
  // If tenantSlug is supplied, scope the lookup; otherwise the pilot's
  // single-tenant case can resolve by email alone.
  const tenantRow = tenantSlug
    ? await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) })
    : await db.query.tenants.findFirst();

  if (!tenantRow) throw unauthorized('Invalid credentials');

  const staffRow = await db.query.staff.findFirst({
    where: and(eq(staff.tenantId, tenantRow.id), eq(staff.email, email)),
  });

  if (!staffRow || !staffRow.isActive) throw unauthorized('Invalid credentials');

  const ok = await verifyPassword(staffRow.passwordHash, password);
  if (!ok) throw unauthorized('Invalid credentials');

  const role = staffRow.role as Role;
  const permissions = RolePermissions[role] ?? [];

  const accessToken = await jwt.signAccess({
    sub: staffRow.id,
    tenantId: tenantRow.id,
    branchId: staffRow.branchId,
    role,
    perms: permissions,
  } satisfies Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss' | 'aud'>);

  const refreshToken = await jwt.signRefresh({
    sub: staffRow.id,
    tenantId: tenantRow.id,
    jti: randomUUID(),
  });

  await db
    .update(staff)
    .set({ lastLoginAt: new Date() })
    .where(eq(staff.id, staffRow.id));

  return {
    accessToken,
    refreshToken,
    user: {
      id: staffRow.id,
      email: staffRow.email,
      name: staffRow.name,
      role,
      tenantId: tenantRow.id,
      branchId: staffRow.branchId,
      permissions,
    },
  };
}

export async function refresh(refreshToken: string) {
  const claims = await jwt.verifyRefresh(refreshToken);
  const staffRow = await db.query.staff.findFirst({ where: eq(staff.id, claims.sub) });
  if (!staffRow || !staffRow.isActive) throw unauthorized('Invalid refresh token');

  const role = staffRow.role as Role;
  const permissions = RolePermissions[role] ?? [];

  const accessToken = await jwt.signAccess({
    sub: staffRow.id,
    tenantId: staffRow.tenantId,
    branchId: staffRow.branchId,
    role,
    perms: permissions,
  });

  const newRefresh = await jwt.signRefresh({
    sub: staffRow.id,
    tenantId: staffRow.tenantId,
    jti: randomUUID(),
  });

  return { accessToken, refreshToken: newRefresh };
}
