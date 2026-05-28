import { z } from 'zod';
import { Role } from '../enums.js';

const roleSchema = z.enum([
  Role.SUPER_ADMIN,
  Role.MANAGER,
  Role.CASHIER,
  Role.WAITER,
  Role.KITCHEN,
  Role.BAR,
]);

export const staffInput = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(128),
  phone: z.string().max(24).optional().nullable(),
  role: roleSchema,
  /** null = "all branches" (super_admin); otherwise pin to one branch */
  branchId: z.string().uuid().nullable().default(null),
  /** Initial password — owner sets it, user changes later. Required on create. */
  password: z.string().min(8).max(128),
  stationIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().default(true),
});
export type StaffInput = z.infer<typeof staffInput>;

export const staffUpdate = z.object({
  name: z.string().min(1).max(128).optional(),
  phone: z.string().max(24).optional().nullable(),
  role: roleSchema.optional(),
  branchId: z.string().uuid().nullable().optional(),
  stationIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});
export type StaffUpdate = z.infer<typeof staffUpdate>;

export const resetPasswordInput = z.object({
  newPassword: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;
