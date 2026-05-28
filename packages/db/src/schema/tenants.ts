import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 64 }).notNull(),
  priceMonthly: integer('price_monthly').notNull(),
  maxBranches: integer('max_branches').notNull(),
  maxStaff: integer('max_staff').notNull(),
  maxOrdersPerMonth: integer('max_orders_per_month'),
  features: jsonb('features').notNull().$type<Record<string, boolean | number | string>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    ownerEmail: varchar('owner_email', { length: 255 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    timezone: varchar('timezone', { length: 64 }).default('Asia/Kolkata').notNull(),
    logoUrl: varchar('logo_url', { length: 512 }),
    brandColor: varchar('brand_color', { length: 7 }),
    taxConfig: jsonb('tax_config')
      .notNull()
      .default({ gst: 5, serviceCharge: 0 })
      .$type<{ gst: number; serviceCharge: number; [k: string]: number }>(),
    settings: jsonb('settings').notNull().default({}).$type<Record<string, unknown>>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index('tenants_slug_idx').on(t.slug),
  }),
);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  status: varchar('status', { length: 32 }).notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  externalSubscriptionId: varchar('external_subscription_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
