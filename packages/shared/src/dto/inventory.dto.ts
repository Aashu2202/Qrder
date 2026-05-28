import { z } from 'zod';

export const inventoryItemInput = z.object({
  name: z.string().min(1).max(128),
  unit: z.enum(['kg', 'g', 'l', 'ml', 'pcs']),
  stockQty: z.number().min(0),
  reorderLevel: z.number().min(0).optional().nullable(),
  costPerUnit: z.number().int().min(0).optional().nullable(),
});
export type InventoryItemInput = z.infer<typeof inventoryItemInput>;

export const inventoryItemUpdate = inventoryItemInput.partial();
export type InventoryItemUpdate = z.infer<typeof inventoryItemUpdate>;

export const stockMovementInput = z.object({
  /** Positive for purchase / adjustment-up, negative for consumption / wastage. */
  changeQty: z.number(),
  reason: z.enum(['purchase', 'consumption', 'wastage', 'adjustment']),
  note: z.string().max(280).optional(),
});
export type StockMovementInput = z.infer<typeof stockMovementInput>;
