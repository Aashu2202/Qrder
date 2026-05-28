import { and, asc, eq } from 'drizzle-orm';
import { menuCategories, menuItems } from '@qrder/db';
import type {
  MenuCategoryInput,
  MenuCategoryUpdate,
  MenuItemInput,
  MenuItemUpdate,
} from '@qrder/shared';
import { db } from '../../lib/db';
import { imageStorage } from '../../integrations/storage';
import { notFound } from '../../lib/errors';
import { getGroupsForItems } from './modifiers.service';

export async function listCategories(tenantId: string) {
  return db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.tenantId, tenantId))
    .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));
}

export async function createCategory(tenantId: string, input: MenuCategoryInput) {
  const [row] = await db
    .insert(menuCategories)
    .values({ ...input, tenantId })
    .returning();
  return row!;
}

export async function updateCategory(
  tenantId: string,
  id: string,
  input: MenuCategoryUpdate,
) {
  const [row] = await db
    .update(menuCategories)
    .set(input)
    .where(and(eq(menuCategories.id, id), eq(menuCategories.tenantId, tenantId)))
    .returning();
  if (!row) throw notFound('Category not found');
  return row;
}

export async function deleteCategory(tenantId: string, id: string) {
  const [row] = await db
    .delete(menuCategories)
    .where(and(eq(menuCategories.id, id), eq(menuCategories.tenantId, tenantId)))
    .returning({ id: menuCategories.id });
  if (!row) throw notFound('Category not found');
}

export async function listItems(tenantId: string, opts: { categoryId?: string } = {}) {
  const conditions = [eq(menuItems.tenantId, tenantId)];
  if (opts.categoryId) conditions.push(eq(menuItems.categoryId, opts.categoryId));
  const rows = await db
    .select()
    .from(menuItems)
    .where(and(...conditions))
    .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));
  const groupsByItem = await getGroupsForItems(
    tenantId,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, modifierGroups: groupsByItem.get(r.id) ?? [] }));
}

export async function getItem(tenantId: string, id: string) {
  const row = await db.query.menuItems.findFirst({
    where: and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)),
  });
  if (!row) throw notFound('Menu item not found');
  return row;
}

async function resolveImage(input: { imageUrl?: string | null; imageBase64?: string | null }) {
  if (input.imageBase64) {
    const { url } = await imageStorage.uploadFromBase64(input.imageBase64, {
      folder: 'qrder/menu',
    });
    return url;
  }
  return input.imageUrl ?? null;
}

export async function createItem(tenantId: string, input: MenuItemInput) {
  const imageUrl = await resolveImage(input);
  const [row] = await db
    .insert(menuItems)
    .values({
      tenantId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      basePrice: input.basePrice,
      taxRate: input.taxRate?.toString() ?? null,
      isVeg: input.isVeg,
      spicyLevel: input.spicyLevel,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      stationId: input.stationId ?? null,
      tags: input.tags,
      imageUrl,
      translations: input.translations ?? null,
      isAvailable: input.isAvailable,
      displayOrder: input.displayOrder,
    })
    .returning();
  return row!;
}

export async function updateItem(tenantId: string, id: string, input: MenuItemUpdate) {
  const patch: Record<string, unknown> = { ...input };
  if (input.imageBase64) {
    patch.imageUrl = await resolveImage(input);
    delete patch.imageBase64;
  }
  if (input.taxRate !== undefined && input.taxRate !== null) {
    patch.taxRate = input.taxRate.toString();
  }
  const [row] = await db
    .update(menuItems)
    .set(patch)
    .where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)))
    .returning();
  if (!row) throw notFound('Menu item not found');
  return row;
}

export async function setItemAvailability(
  tenantId: string,
  id: string,
  isAvailable: boolean,
) {
  const [row] = await db
    .update(menuItems)
    .set({ isAvailable })
    .where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)))
    .returning();
  if (!row) throw notFound('Menu item not found');
  return row;
}

export async function deleteItem(tenantId: string, id: string) {
  const [row] = await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)))
    .returning({ id: menuItems.id });
  if (!row) throw notFound('Menu item not found');
}
