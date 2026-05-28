import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    phone: varchar('phone', { length: 24 }),
    role: varchar('role', { length: 32 }).notNull(),
    stationIds: uuid('station_ids').array(),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantEmailUq: uniqueIndex('staff_tenant_email_uq').on(t.tenantId, t.email),
    tenantIdx: index('staff_tenant_idx').on(t.tenantId),
  }),
);

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
