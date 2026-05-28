import { z } from 'zod';

export const modifierGroupInput = z.object({
  name: z.string().min(1).max(64),
  selectionType: z.enum(['single', 'multiple']),
  minSelect: z.number().int().min(0).max(20).default(0),
  maxSelect: z.number().int().min(1).max(20).default(1),
});
export type ModifierGroupInput = z.infer<typeof modifierGroupInput>;

export const modifierGroupUpdate = modifierGroupInput.partial();
export type ModifierGroupUpdate = z.infer<typeof modifierGroupUpdate>;

export const modifierInput = z.object({
  name: z.string().min(1).max(64),
  priceDelta: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});
export type ModifierInput = z.infer<typeof modifierInput>;

export const modifierUpdate = modifierInput.partial();
export type ModifierUpdate = z.infer<typeof modifierUpdate>;

export const attachGroupsInput = z.object({
  groupIds: z.array(z.string().uuid()),
});
export type AttachGroupsInput = z.infer<typeof attachGroupsInput>;
