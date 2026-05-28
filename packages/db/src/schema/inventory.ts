import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';
import { orders } from './orders';

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    unit: varchar('unit', { length: 16 }).notNull(),
    stockQty: numeric('stock_qty', { precision: 12, scale: 3 }).notNull(),
    reorderLevel: numeric('reorder_level', { precision: 12, scale: 3 }),
    costPerUnit: integer('cost_per_unit'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantBranchIdx: index('inventory_items_tenant_branch_idx').on(t.tenantId, t.branchId),
  }),
);

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    changeQty: numeric('change_qty', { precision: 12, scale: 3 }).notNull(),
    reason: varchar('reason', { length: 32 }).notNull(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    itemIdx: index('stock_movements_item_idx').on(t.inventoryItemId),
  }),
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
