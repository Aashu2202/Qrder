import { z } from 'zod';

const address = z.object({
  line1: z.string().max(255).optional(),
  line2: z.string().max(255).optional(),
  city: z.string().max(64).optional(),
  state: z.string().max(64).optional(),
  country: z.string().max(64).optional(),
  pincode: z.string().max(16).optional(),
});

export const branchInput = z.object({
  name: z.string().min(1).max(128),
  address: address.default({}),
  phone: z.string().max(24).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type BranchInput = z.infer<typeof branchInput>;

export const branchUpdate = branchInput.partial();
export type BranchUpdate = z.infer<typeof branchUpdate>;
