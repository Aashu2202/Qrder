import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { orders } from './orders';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    method: varchar('method', { length: 16 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    gateway: varchar('gateway', { length: 16 }),
    gatewayPaymentId: varchar('gateway_payment_id', { length: 128 }),
    gatewayMeta: jsonb('gateway_meta').$type<Record<string, unknown>>(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdx: index('payments_order_idx').on(t.orderId),
    tenantStatusIdx: index('payments_tenant_status_idx').on(t.tenantId, t.status),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
