import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createDb } from './client';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../../.env') });
import { tenants, branches, staff, tables, kitchenStations } from './schema/index';
import { hashPassword } from '@qrder/auth';
import { Role } from '@qrder/shared';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const { db, client } = createDb({ url, max: 1 });

try {
  console.log('Seeding…');

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: 'Mango Tree',
      slug: 'mango-tree',
      ownerEmail: 'owner@mango.test',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      taxConfig: { gst: 5, serviceCharge: 0 },
    })
    .returning();

  if (!tenant) throw new Error('Failed to insert tenant');
  console.log('  tenant:', tenant.slug);

  const [branch] = await db
    .insert(branches)
    .values({
      tenantId: tenant.id,
      name: 'Indiranagar',
      address: { city: 'Bengaluru', state: 'Karnataka', country: 'IN' },
      phone: '+91 9999900000',
    })
    .returning();

  if (!branch) throw new Error('Failed to insert branch');
  console.log('  branch:', branch.name);

  const ownerPwd = await hashPassword('Owner@123');
  const [owner] = await db
    .insert(staff)
    .values({
      tenantId: tenant.id,
      branchId: null,
      email: 'owner@mango.test',
      passwordHash: ownerPwd,
      name: 'Aashish',
      role: Role.SUPER_ADMIN,
    })
    .returning();
  console.log('  staff:', owner?.email, '/ password: Owner@123');

  const stations = await db
    .insert(kitchenStations)
    .values([
      { tenantId: tenant.id, branchId: branch.id, name: 'Tandoor', displayOrder: 1 },
      { tenantId: tenant.id, branchId: branch.id, name: 'Grill', displayOrder: 2 },
      { tenantId: tenant.id, branchId: branch.id, name: 'Bar', displayOrder: 3 },
      { tenantId: tenant.id, branchId: branch.id, name: 'Dessert', displayOrder: 4 },
    ])
    .returning();
  console.log('  stations:', stations.length);

  const tableRows = await db
    .insert(tables)
    .values(
      Array.from({ length: 12 }, (_, i) => ({
        tenantId: tenant.id,
        branchId: branch.id,
        number: `T${String(i + 1).padStart(2, '0')}`,
        capacity: 4,
      })),
    )
    .returning();
  console.log('  tables:', tableRows.length);

  console.log('Seed complete.');
} finally {
  await client.end();
}
