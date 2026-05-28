import { and, asc, eq, inArray } from 'drizzle-orm';
import { modifierGroups, modifiers, menuItemModifierGroups } from '@qrder/db';
import type {
  ModifierGroupInput,
  ModifierGroupUpdate,
  ModifierInput,
  ModifierUpdate,
} from '@qrder/shared';
import { db } from '../../lib/db';
import { notFound, badRequest } from '../../lib/errors';

export interface GroupWithModifiers {
  id: string;
  name: string;
  selectionType: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Array<{
    id: string;
    name: string;
    priceDelta: number;
    isDefault: boolean;
    displayOrder: number;
  }>;
}

export async function listGroupsWithModifiers(tenantId: string): Promise<GroupWithModifiers[]> {
  const groups = await db
    .select()
    .from(modifierGroups)
    .where(eq(modifierGroups.tenantId, tenantId))
    .orderBy(asc(modifierGroups.name));
  if (groups.length === 0) return [];
  const mods = await db
    .select()
    .from(modifiers)
    .where(
      inArray(
        modifiers.groupId,
        groups.map((g) => g.id),
      ),
    )
    .orderBy(asc(modifiers.displayOrder), asc(modifiers.name));
  const modsByGroup = new Map<string, typeof mods>();
  for (const m of mods) {
    const list = modsByGroup.get(m.groupId) ?? [];
    list.push(m);
    modsByGroup.set(m.groupId, list);
  }
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    selectionType: g.selectionType,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    modifiers: modsByGroup.get(g.id) ?? [],
  }));
}

export async function createGroup(tenantId: string, input: ModifierGroupInput) {
  if (input.maxSelect < input.minSelect) throw badRequest('maxSelect must be >= minSelect');
  const [row] = await db
    .insert(modifierGroups)
    .values({ tenantId, ...input })
    .returning();
  return row!;
}

export async function updateGroup(
  tenantId: string,
  id: string,
  input: ModifierGroupUpdate,
) {
  const [row] = await db
    .update(modifierGroups)
    .set(input)
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, tenantId)))
    .returning();
  if (!row) throw notFound('Modifier group not found');
  return row;
}

export async function deleteGroup(tenantId: string, id: string) {
  const [row] = await db
    .delete(modifierGroups)
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, tenantId)))
    .returning({ id: modifierGroups.id });
  if (!row) throw notFound('Modifier group not found');
}

async function loadGroupOrThrow(tenantId: string, groupId: string) {
  const group = await db.query.modifierGroups.findFirst({
    where: and(eq(modifierGroups.id, groupId), eq(modifierGroups.tenantId, tenantId)),
  });
  if (!group) throw notFound('Modifier group not found');
  return group;
}

export async function addModifier(
  tenantId: string,
  groupId: string,
  input: ModifierInput,
) {
  await loadGroupOrThrow(tenantId, groupId);
  const [row] = await db
    .insert(modifiers)
    .values({ groupId, ...input })
    .returning();
  return row!;
}

export async function updateModifier(tenantId: string, modifierId: string, input: ModifierUpdate) {
  const mod = await db.query.modifiers.findFirst({ where: eq(modifiers.id, modifierId) });
  if (!mod) throw notFound('Modifier not found');
  await loadGroupOrThrow(tenantId, mod.groupId);
  const [row] = await db
    .update(modifiers)
    .set(input)
    .where(eq(modifiers.id, modifierId))
    .returning();
  return row!;
}

export async function deleteModifier(tenantId: string, modifierId: string) {
  const mod = await db.query.modifiers.findFirst({ where: eq(modifiers.id, modifierId) });
  if (!mod) throw notFound('Modifier not found');
  await loadGroupOrThrow(tenantId, mod.groupId);
  await db.delete(modifiers).where(eq(modifiers.id, modifierId));
}

export async function setItemGroups(tenantId: string, menuItemId: string, groupIds: string[]) {
  // Validate all groups belong to this tenant
  if (groupIds.length > 0) {
    const owned = await db
      .select({ id: modifierGroups.id })
      .from(modifierGroups)
      .where(
        and(eq(modifierGroups.tenantId, tenantId), inArray(modifierGroups.id, groupIds)),
      );
    if (owned.length !== groupIds.length) throw badRequest('One or more groups not found');
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(menuItemModifierGroups)
      .where(eq(menuItemModifierGroups.menuItemId, menuItemId));
    if (groupIds.length > 0) {
      await tx
        .insert(menuItemModifierGroups)
        .values(groupIds.map((groupId) => ({ menuItemId, groupId })));
    }
  });
}

/**
 * Returns a `Map<menuItemId, GroupWithModifiers[]>` for all the requested items.
 * Used by menu list endpoints (admin + public) to expand groups inline.
 */
export async function getGroupsForItems(
  tenantId: string,
  menuItemIds: string[],
): Promise<Map<string, GroupWithModifiers[]>> {
  if (menuItemIds.length === 0) return new Map();
  const links = await db
    .select()
    .from(menuItemModifierGroups)
    .where(inArray(menuItemModifierGroups.menuItemId, menuItemIds));
  if (links.length === 0) return new Map();
  const allGroupIds = [...new Set(links.map((l) => l.groupId))];
  const groups = await db
    .select()
    .from(modifierGroups)
    .where(
      and(eq(modifierGroups.tenantId, tenantId), inArray(modifierGroups.id, allGroupIds)),
    );
  const mods = await db
    .select()
    .from(modifiers)
    .where(inArray(modifiers.groupId, allGroupIds))
    .orderBy(asc(modifiers.displayOrder), asc(modifiers.name));
  const modsByGroup = new Map<string, typeof mods>();
  for (const m of mods) {
    const list = modsByGroup.get(m.groupId) ?? [];
    list.push(m);
    modsByGroup.set(m.groupId, list);
  }
  const groupById = new Map(
    groups.map((g) => [
      g.id,
      {
        id: g.id,
        name: g.name,
        selectionType: g.selectionType,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        modifiers: modsByGroup.get(g.id) ?? [],
      } satisfies GroupWithModifiers,
    ]),
  );
  const out = new Map<string, GroupWithModifiers[]>();
  for (const link of links) {
    const g = groupById.get(link.groupId);
    if (!g) continue;
    const list = out.get(link.menuItemId) ?? [];
    list.push(g);
    out.set(link.menuItemId, list);
  }
  return out;
}

export async function getGroupsForItem(
  tenantId: string,
  menuItemId: string,
): Promise<GroupWithModifiers[]> {
  const m = await getGroupsForItems(tenantId, [menuItemId]);
  return m.get(menuItemId) ?? [];
}
