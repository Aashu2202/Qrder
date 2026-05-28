import { z } from 'zod';

export const waiterCallInput = z.object({
  reason: z.enum(['service', 'water', 'cutlery', 'bill', 'other']).default('service'),
});
export type WaiterCallInput = z.infer<typeof waiterCallInput>;

export const feedbackInput = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackInput>;
