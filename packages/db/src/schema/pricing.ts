import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * Time-bounded price overrides ("happy hour", weekend specials, etc).
 * If multiple active rules apply, the lowest resulting price wins
 * (best deal for the customer).
 */
export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 64 }).notNull(),
    /** 'percent' (basis points off, e.g. 1500 = 15% off) | 'flat' (paise off) | 'fixed' (replace base price) */
    type: varchar('type', { length: 8 }).notNull(),
    value: integer('value').notNull(),
    /** Set of menu_item ids the rule applies to. Empty array = entire menu. */
    menuItemIds: uuid('menu_item_ids').array(),
    /** Set of category ids the rule applies to (alternative to menuItemIds). */
    categoryIds: uuid('category_ids').array(),
    /** Days of week as 0..6 (Sunday = 0). null = every day. */
    daysOfWeek: integer('days_of_week').array(),
    /** Local time window in "HH:mm" 24h. */
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
    /** Absolute window for one-off promos. */
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantActiveIdx: index('pricing_rules_tenant_active_idx').on(t.tenantId, t.isActive),
  }),
);

export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;
