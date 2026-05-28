import { z } from 'zod';
import { OrderStatus } from '../enums.js';

export const placeOrderItem = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  cookingNotes: z.string().max(280).optional(),
  modifierIds: z.array(z.string().uuid()).max(20).default([]),
});
export type PlaceOrderItem = z.infer<typeof placeOrderItem>;

export const placeOrderInput = z.object({
  items: z.array(placeOrderItem).min(1).max(40),
  notes: z.string().max(280).optional(),
  customerPhone: z.string().max(24).optional(),
  customerName: z.string().max(128).optional(),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInput>;

export const orderStatusUpdate = z.object({
  status: z.enum([
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.SERVED,
    OrderStatus.COMPLETED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELED,
  ]),
  reason: z.string().max(280).optional(),
});
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdate>;
