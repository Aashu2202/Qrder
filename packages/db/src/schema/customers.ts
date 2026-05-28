import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    phone: varchar('phone', { length: 24 }),
    email: varchar('email', { length: 255 }),
    name: varchar('name', { length: 128 }),
    loyaltyPoints: integer('loyalty_points').default(0).notNull(),
    totalSpend: integer('total_spend').default(0).notNull(),
    visitCount: integer('visit_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantPhoneIdx: index('customers_tenant_phone_idx').on(t.tenantId, t.phone),
  }),
);

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id'),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('feedback_tenant_idx').on(t.tenantId),
  }),
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
