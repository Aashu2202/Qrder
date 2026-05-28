import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';
import { tables } from './tables';
import { staff } from './staff';

/**
 * Persisted service requests from customers (call-waiter, request-bill, etc).
 * Replaces the fire-and-forget Socket.IO event with a queryable record.
 */
export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    /** 'service' | 'water' | 'cutlery' | 'bill' | 'other' */
    reason: varchar('reason', { length: 16 }).notNull(),
    /** 'open' | 'acknowledged' | 'resolved' */
    status: varchar('status', { length: 16 }).default('open').notNull(),
    acknowledgedByStaffId: uuid('acknowledged_by_staff_id').references(() => staff.id, {
      onDelete: 'set null',
    }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    branchStatusIdx: index('service_requests_branch_status_idx').on(t.branchId, t.status),
  }),
);

export type ServiceRequest = typeof serviceRequests.$inferSelect;
