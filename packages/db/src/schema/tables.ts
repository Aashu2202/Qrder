import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';

export const tables = pgTable(
  'tables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    number: varchar('number', { length: 16 }).notNull(),
    capacity: integer('capacity').default(4).notNull(),
    status: varchar('status', { length: 16 }).default('available').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    branchNumberUq: uniqueIndex('tables_branch_number_uq').on(t.branchId, t.number),
    tenantIdx: index('tables_tenant_idx').on(t.tenantId),
  }),
);

export const qrCodes = pgTable(
  'qr_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 512 }).notNull().unique(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('qr_codes_tenant_idx').on(t.tenantId),
    tableIdx: index('qr_codes_table_idx').on(t.tableId),
  }),
);

export type TableRow = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
