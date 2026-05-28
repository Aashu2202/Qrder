import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 32 }).notNull(),
    type: varchar('type', { length: 8 }).notNull(), // 'flat' | 'percent'
    value: integer('value').notNull(),               // paise for flat, basis points for percent (e.g. 1000 = 10%)
    minSubtotal: integer('min_subtotal').default(0).notNull(),
    maxDiscount: integer('max_discount'),            // cap for percent discounts
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    maxUses: integer('max_uses'),                    // null = unlimited
    usedCount: integer('used_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantCodeUq: uniqueIndex('coupons_tenant_code_uq').on(t.tenantId, t.code),
    tenantActiveIdx: index('coupons_tenant_active_idx').on(t.tenantId, t.isActive),
  }),
);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
