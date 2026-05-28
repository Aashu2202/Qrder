import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { createDb } from './client';
import { tenants, branches, staff } from './schema';
import { hashPassword } from '@qrder/auth';
import { Role } from '@qrder/shared';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../../.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const { db, client } = createDb({ url, max: 1 });

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: Role;
  /** If true, pin to the seeded branch. If false, set branchId=null (multi-branch access). */
  pinToBranch: boolean;
}

const USERS: TestUser[] = [
  {
    email: 'manager@mango.test',
    password: 'Manager@1',
    name: 'Test Manager',
    role: Role.MANAGER,
    // Manager spans all branches (mirrors super_admin's reach minus a few perms)
    pinToBranch: false,
  },
  {
    email: 'cashier@mango.test',
    password: 'Cashier@1',
    name: 'Test Cashier',
    role: Role.CASHIER,
    pinToBranch: true,
  },
  {
    email: 'waiter@mango.test',
    password: 'Waiter@1',
    name: 'Test Waiter',
    role: Role.WAITER,
    pinToBranch: true,
  },
  {
    email: 'cook@mango.test',
    password: 'Cook@1',
    name: 'Test Cook',
    role: Role.KITCHEN,
    pinToBranch: true,
  },
  {
    email: 'bar@mango.test',
    password: 'Bar@1',
    name: 'Test Bartender',
    role: Role.BAR,
    pinToBranch: true,
  },
];

try {
  console.log('Seeding test users…');

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, 'mango-tree'),
  });
  if (!tenant) {
    console.error(
      '  Tenant "mango-tree" not found. Run `pnpm --filter @qrder/db db:seed` first.',
    );
    process.exit(1);
  }

  const branch = await db.query.branches.findFirst({
    where: eq(branches.tenantId, tenant.id),
  });
  if (!branch) {
    console.error('  No branch found for the tenant. Re-run the base seed.');
    process.exit(1);
  }

  for (const u of USERS) {
    const existing = await db.query.staff.findFirst({
      where: and(eq(staff.tenantId, tenant.id), eq(staff.email, u.email)),
    });
    if (existing) {
      console.log(`  · ${u.email.padEnd(24)} (already exists, skipped)`);
      continue;
    }
    const passwordHash = await hashPassword(u.password);
    await db.insert(staff).values({
      tenantId: tenant.id,
      branchId: u.pinToBranch ? branch.id : null,
      email: u.email,
      passwordHash,
      name: u.name,
      role: u.role,
      isActive: true,
    });
    console.log(
      `  + ${u.email.padEnd(24)} role=${u.role.padEnd(8)} pw=${u.password}`,
    );
  }

  console.log('Done.');
} finally {
  await client.end();
}
