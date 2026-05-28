import { z } from 'zod';

export const addItemsInput = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        cookingNotes: z.string().max(280).optional(),
        modifierIds: z.array(z.string().uuid()).max(20).default([]),
      }),
    )
    .min(1)
    .max(40),
});
export type AddItemsInput = z.infer<typeof addItemsInput>;

export const transferOrderInput = z.object({
  targetTableId: z.string().uuid(),
});
export type TransferOrderInput = z.infer<typeof transferOrderInput>;

export const mergeOrdersInput = z.object({
  /** Order to fold INTO the one in the URL path. The source order is then closed. */
  sourceOrderId: z.string().uuid(),
});
export type MergeOrdersInput = z.infer<typeof mergeOrdersInput>;

export const splitOrderInput = z.object({
  /** Split mode: by-item assigns each existing item to a sub-bill index. */
  mode: z.enum(['by-item', 'evenly']),
  /** For by-item: array of { orderItemId, billIndex }. billIndex 0 = stays with parent. */
  assignments: z
    .array(z.object({ orderItemId: z.string().uuid(), billIndex: z.number().int().min(0).max(9) }))
    .optional(),
  /** For evenly: number of sub-bills to create. */
  splitCount: z.number().int().min(2).max(10).optional(),
});
export type SplitOrderInput = z.infer<typeof splitOrderInput>;

export const applyDiscountInput = z.object({
  /** Either a coupon code or a manual amount must be provided. */
  couponCode: z.string().max(32).optional(),
  flatAmount: z.number().int().min(0).optional(),
  reason: z.string().max(280).optional(),
});
export type ApplyDiscountInput = z.infer<typeof applyDiscountInput>;

export const tableStatusInput = z.object({
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
});
export type TableStatusInput = z.infer<typeof tableStatusInput>;
