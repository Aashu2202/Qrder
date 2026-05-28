import { pgTable, uuid, varchar, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';

export const kitchenStations = pgTable(
  'kitchen_stations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 64 }).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantBranchIdx: index('kitchen_stations_tenant_branch_idx').on(t.tenantId, t.branchId),
  }),
);

export type KitchenStation = typeof kitchenStations.$inferSelect;
export type NewKitchenStation = typeof kitchenStations.$inferInsert;
