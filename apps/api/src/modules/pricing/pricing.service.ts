import { and, asc, eq } from 'drizzle-orm';
import { pricingRules, tenants } from '@qrder/db';
import type { PricingRule } from '@qrder/db';
import type { PricingRuleInput, PricingRuleUpdate } from '@qrder/shared';
import { db } from '../../lib/db';
import { notFound } from '../../lib/errors';

export async function listRules(tenantId: string) {
  return db
    .select()
    .from(pricingRules)
    .where(eq(pricingRules.tenantId, tenantId))
    .orderBy(asc(pricingRules.name));
}

export async function createRule(tenantId: string, input: PricingRuleInput) {
  const [row] = await db
    .insert(pricingRules)
    .values({
      tenantId,
      name: input.name,
      type: input.type,
      value: input.value,
      menuItemIds: input.menuItemIds ?? null,
      categoryIds: input.categoryIds ?? null,
      daysOfWeek: input.daysOfWeek ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      isActive: input.isActive,
    })
    .returning();
  return row!;
}

export async function updateRule(tenantId: string, id: string, input: PricingRuleUpdate) {
  const patch: Record<string, unknown> = { ...input };
  if (input.validFrom !== undefined) patch.validFrom = input.validFrom ? new Date(input.validFrom) : null;
  if (input.validUntil !== undefined) patch.validUntil = input.validUntil ? new Date(input.validUntil) : null;
  const [row] = await db
    .update(pricingRules)
    .set(patch)
    .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)))
    .returning();
  if (!row) throw notFound('Rule not found');
  return row;
}

export async function deleteRule(tenantId: string, id: string) {
  const [row] = await db
    .delete(pricingRules)
    .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)))
    .returning({ id: pricingRules.id });
  if (!row) throw notFound('Rule not found');
}

/** True if the rule is currently active and the local time falls inside its window. */
export function ruleApplies(rule: PricingRule, now: Date, tzOffsetMinutes: number): boolean {
  if (!rule.isActive) return false;
  if (rule.validFrom && now < rule.validFrom) return false;
  if (rule.validUntil && now > rule.validUntil) return false;

  // Shift to tenant local time using the simple offset (we don't store IANA tz on rules)
  const local = new Date(now.getTime() + tzOffsetMinutes * 60_000);
  const dow = local.getUTCDay(); // 0=Sunday
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dow)) return false;

  if (rule.startTime && rule.endTime) {
    const hhmm = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
    // Handles overnight windows e.g. 22:00–02:00
    if (rule.startTime <= rule.endTime) {
      if (hhmm < rule.startTime || hhmm > rule.endTime) return false;
    } else {
      if (hhmm < rule.startTime && hhmm > rule.endTime) return false;
    }
  }
  return true;
}

/** Apply a single rule to a base price. Returns the new effective price (>=0). */
export function applyRule(basePrice: number, rule: PricingRule): number {
  if (rule.type === 'fixed') return Math.max(0, rule.value);
  if (rule.type === 'flat') return Math.max(0, basePrice - rule.value);
  // percent (basis points)
  const discount = Math.round((basePrice * rule.value) / 10000);
  return Math.max(0, basePrice - discount);
}

/**
 * For a given set of menu items, compute the current effective price for each.
 * If multiple rules apply, picks the LOWEST (best deal for customer).
 */
export async function effectivePrices(
  tenantId: string,
  items: Array<{ id: string; categoryId: string; basePrice: number }>,
): Promise<Map<string, number>> {
  const result = new Map<string, number>(items.map((i) => [i.id, i.basePrice]));
  if (items.length === 0) return result;

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  // For simplicity assume Asia/Kolkata (+5:30) if not parseable
  const tz = tenant?.timezone ?? 'Asia/Kolkata';
  const tzOffset = tz === 'Asia/Kolkata' ? 330 : 0;
  const now = new Date();

  const rules = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.tenantId, tenantId), eq(pricingRules.isActive, true)));

  for (const item of items) {
    let best = item.basePrice;
    for (const rule of rules) {
      const targetsItem = !rule.menuItemIds || rule.menuItemIds.length === 0 || rule.menuItemIds.includes(item.id);
      const targetsCat =
        !rule.categoryIds || rule.categoryIds.length === 0 || rule.categoryIds.includes(item.categoryId);
      if (!(targetsItem && targetsCat)) continue;
      if (!ruleApplies(rule, now, tzOffset)) continue;
      const candidate = applyRule(item.basePrice, rule);
      if (candidate < best) best = candidate;
    }
    result.set(item.id, best);
  }
  return result;
}
