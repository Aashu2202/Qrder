import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    address: jsonb('address').notNull().default({}).$type<{
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
    }>(),
    phone: varchar('phone', { length: 24 }),
    openHours: jsonb('open_hours').$type<Record<string, { open: string; close: string }>>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('branches_tenant_idx').on(t.tenantId),
  }),
);

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
