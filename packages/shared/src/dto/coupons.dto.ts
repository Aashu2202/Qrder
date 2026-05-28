import { z } from 'zod';

export const couponInput = z.object({
  code: z.string().min(2).max(32).regex(/^[A-Z0-9_-]+$/i, 'Letters, digits, _ and - only'),
  type: z.enum(['flat', 'percent']),
  /** paise for flat, basis-points for percent (e.g. 1000 = 10%) */
  value: z.number().int().positive(),
  minSubtotal: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().positive().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponInput>;

export const couponUpdate = couponInput.partial();
export type CouponUpdate = z.infer<typeof couponUpdate>;

export const couponApply = z.object({
  code: z.string().min(2).max(32),
});
export type CouponApply = z.infer<typeof couponApply>;
