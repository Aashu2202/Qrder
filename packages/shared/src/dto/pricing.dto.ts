import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');

export const pricingRuleInput = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(['percent', 'flat', 'fixed']),
  /** For percent: basis points (1500 = 15% off). For flat: paise off. For fixed: paise replacement price. */
  value: z.number().int().positive(),
  menuItemIds: z.array(z.string().uuid()).optional().nullable(),
  categoryIds: z.array(z.string().uuid()).optional().nullable(),
  /** Days of week 0..6 (Sunday=0). null/empty = every day. */
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  startTime: hhmm.optional().nullable(),
  endTime: hhmm.optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
});
export type PricingRuleInput = z.infer<typeof pricingRuleInput>;

export const pricingRuleUpdate = pricingRuleInput.partial();
export type PricingRuleUpdate = z.infer<typeof pricingRuleUpdate>;
