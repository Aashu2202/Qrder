import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';
import { kitchenStations } from './kitchen';

/** Per-locale overrides for menu items / categories. */
export type Translations = Record<string, { name?: string; description?: string }>;

export const menuCategories = pgTable(
  'menu_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 64 }).notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    imageUrl: varchar('image_url', { length: 512 }),
    translations: jsonb('translations').$type<Translations>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('menu_categories_tenant_idx').on(t.tenantId),
  }),
);

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    imageUrl: varchar('image_url', { length: 512 }),
    basePrice: integer('base_price').notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }),
    isVeg: boolean('is_veg').default(true).notNull(),
    spicyLevel: integer('spicy_level').default(0).notNull(),
    prepTimeMinutes: integer('prep_time_minutes'),
    stationId: uuid('station_id').references(() => kitchenStations.id, { onDelete: 'set null' }),
    tags: text('tags').array(),
    translations: jsonb('translations').$type<Translations>(),
    isAvailable: boolean('is_available').default(true).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('menu_items_tenant_idx').on(t.tenantId),
    categoryIdx: index('menu_items_category_idx').on(t.categoryId),
  }),
);

export const modifierGroups = pgTable('modifier_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),
  selectionType: varchar('selection_type', { length: 16 }).notNull(),
  minSelect: integer('min_select').default(0).notNull(),
  maxSelect: integer('max_select').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const modifiers = pgTable('modifiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),
  priceDelta: integer('price_delta').default(0).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
});

export const menuItemModifierGroups = pgTable(
  'menu_item_modifier_groups',
  {
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.groupId] }),
  }),
);

export type MenuCategory = typeof menuCategories.$inferSelect;
export type NewMenuCategory = typeof menuCategories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
