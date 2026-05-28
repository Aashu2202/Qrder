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
import { branches } from './branches';
import { tables } from './tables';
import { customers } from './customers';
import { staff } from './staff';
import { menuItems, modifiers } from './menu';
import { kitchenStations } from './kitchen';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    orderNumber: varchar('order_number', { length: 16 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    source: varchar('source', { length: 16 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    subtotal: integer('subtotal').notNull(),
    taxAmount: integer('tax_amount').notNull(),
    discountAmount: integer('discount_amount').default(0).notNull(),
    discountReason: text('discount_reason'),
    couponCode: varchar('coupon_code', { length: 32 }),
    totalAmount: integer('total_amount').notNull(),
    /** Set when this order is a split-off from a parent (parent keeps its line items, child holds the split portion). */
    parentOrderId: uuid('parent_order_id'),
    notes: text('notes'),
    placedAt: timestamp('placed_at', { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    servedAt: timestamp('served_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    servedByStaffId: uuid('served_by_staff_id').references(() => staff.id, {
      onDelete: 'set null',
    }),
  },
  (t) => ({
    tenantBranchStatusIdx: index('orders_tenant_branch_status_idx').on(
      t.tenantId,
      t.branchId,
      t.status,
    ),
    tableActiveIdx: index('orders_table_active_idx').on(t.tableId, t.status),
    placedAtIdx: index('orders_placed_at_idx').on(t.placedAt),
  }),
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'restrict' }),
    nameSnapshot: varchar('name_snapshot', { length: 128 }).notNull(),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    modifiersTotal: integer('modifiers_total').default(0).notNull(),
    lineTotal: integer('line_total').notNull(),
    status: varchar('status', { length: 24 }).default('pending').notNull(),
    cookingNotes: text('cooking_notes'),
    stationId: uuid('station_id').references(() => kitchenStations.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
  },
  (t) => ({
    orderIdx: index('order_items_order_idx').on(t.orderId),
    stationStatusIdx: index('order_items_station_status_idx').on(t.stationId, t.status),
  }),
);

export const orderItemModifiers = pgTable(
  'order_item_modifiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    modifierId: uuid('modifier_id')
      .notNull()
      .references(() => modifiers.id, { onDelete: 'restrict' }),
    nameSnapshot: varchar('name_snapshot', { length: 64 }).notNull(),
    priceDelta: integer('price_delta').notNull(),
  },
  (t) => ({
    orderItemIdx: index('order_item_modifiers_item_idx').on(t.orderItemId),
  }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
