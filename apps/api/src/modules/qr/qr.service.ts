import { and, asc, eq } from 'drizzle-orm';
import {
  qrCodes,
  tables,
  branches,
  tenants,
  menuCategories,
  menuItems,
} from '@qrder/db';
import { db } from '../../lib/db';
import { qrToken } from '../../lib/jwt';
import { notFound, badRequest } from '../../lib/errors';
import { getGroupsForItems } from '../menu/modifiers.service';
import { effectivePrices } from '../pricing/pricing.service';

export interface QrContext {
  tenantId: string;
  branchId: string;
  tableId: string;
  qrId: string;
}

export async function resolveQrToken(token: string): Promise<QrContext> {
  let claims;
  try {
    claims = await qrToken.verify(token);
  } catch {
    throw badRequest('Invalid QR token');
  }

  const qr = await db.query.qrCodes.findFirst({
    where: and(eq(qrCodes.token, token), eq(qrCodes.isActive, true)),
  });
  if (!qr) throw notFound('QR not active');

  return {
    tenantId: claims.tenantId,
    branchId: claims.branchId,
    tableId: claims.tableId,
    qrId: qr.id,
  };
}

export async function publicResolve(token: string) {
  const ctx = await resolveQrToken(token);

  const [tenant, branch, table] = await Promise.all([
    db.query.tenants.findFirst({ where: eq(tenants.id, ctx.tenantId) }),
    db.query.branches.findFirst({ where: eq(branches.id, ctx.branchId) }),
    db.query.tables.findFirst({ where: eq(tables.id, ctx.tableId) }),
  ]);
  if (!tenant || !branch || !table) throw notFound('Restaurant unavailable');

  const settings = tenant.settings as { supportedLocales?: string[] };
  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      brandColor: tenant.brandColor,
      currency: tenant.currency,
      taxConfig: tenant.taxConfig,
      supportedLocales: settings.supportedLocales ?? ['en'],
    },
    branch: {
      id: branch.id,
      name: branch.name,
      phone: branch.phone,
    },
    table: {
      id: table.id,
      number: table.number,
    },
  };
}

export async function publicMenu(token: string, locale?: string) {
  const ctx = await resolveQrToken(token);

  const categories = await db
    .select()
    .from(menuCategories)
    .where(
      and(
        eq(menuCategories.tenantId, ctx.tenantId),
        eq(menuCategories.isActive, true),
      ),
    )
    .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));

  const items = await db
    .select()
    .from(menuItems)
    .where(
      and(
        eq(menuItems.tenantId, ctx.tenantId),
        eq(menuItems.isAvailable, true),
      ),
    )
    .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));

  // Apply locale overlay if requested. We DON'T mutate name/description on
  // the way out; we add a localized copy alongside so the client can fall
  // back when an item's translation is missing.
  const localize = <T extends { name: string; description?: string | null; translations?: { [k: string]: { name?: string; description?: string } } | null }>(
    row: T,
  ): T & { localizedName: string; localizedDescription: string | null } => {
    const t = locale && row.translations ? row.translations[locale] : undefined;
    return {
      ...row,
      localizedName: t?.name ?? row.name,
      localizedDescription: t?.description ?? row.description ?? null,
    };
  };

  const localizedCategories = categories.map(localize);

  const groupsByItem = await getGroupsForItems(
    ctx.tenantId,
    items.map((i) => i.id),
  );

  // Happy-hour: compute current effective price per item.
  const eff = await effectivePrices(
    ctx.tenantId,
    items.map((i) => ({ id: i.id, categoryId: i.categoryId, basePrice: i.basePrice })),
  );

  const itemsWithGroups = items.map((i) => {
    const effectivePrice = eff.get(i.id) ?? i.basePrice;
    return {
      ...localize(i),
      modifierGroups: groupsByItem.get(i.id) ?? [],
      effectivePrice,
      isOnSale: effectivePrice < i.basePrice,
    };
  });

  return { categories: localizedCategories, items: itemsWithGroups };
}
