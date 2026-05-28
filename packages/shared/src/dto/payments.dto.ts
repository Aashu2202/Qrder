import { z } from 'zod';
import { PaymentMethod } from '../enums.js';

export const paymentInitiateInput = z.object({
  /** Optional: server already knows the amount from the order. Provided for double-check. */
  expectedAmount: z.number().int().positive().optional(),
});
export type PaymentInitiateInput = z.infer<typeof paymentInitiateInput>;

export const paymentInitiateResponse = z.object({
  paymentId: z.string().uuid(),
  gateway: z.enum(['razorpay']),
  gatewayOrderId: z.string(),
  publicKey: z.string(),
  amount: z.number().int(),
  currency: z.string(),
});
export type PaymentInitiateResponse = z.infer<typeof paymentInitiateResponse>;

export const paymentVerifyInput = z.object({
  paymentId: z.string().uuid(),
  gatewayOrderId: z.string(),
  gatewayPaymentId: z.string(),
  signature: z.string(),
});
export type PaymentVerifyInput = z.infer<typeof paymentVerifyInput>;

export const manualPaymentInput = z.object({
  orderId: z.string().uuid(),
  method: z.enum([
    PaymentMethod.CASH,
    PaymentMethod.CARD,
    PaymentMethod.UPI,
    PaymentMethod.WALLET,
    PaymentMethod.SPLIT,
  ]),
  amount: z.number().int().min(0),
  note: z.string().max(280).optional(),
});
export type ManualPaymentInput = z.infer<typeof manualPaymentInput>;

export const refundInput = z.object({
  /** Optional partial refund. Omit for full refund. */
  amount: z.number().int().positive().optional(),
  reason: z.string().max(280).optional(),
});
export type RefundInput = z.infer<typeof refundInput>;
