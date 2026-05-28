import { z } from 'zod';

export const loginInput = z.object({
  email: z.string().email().max(255),
  // Login validates against the stored hash — no length minimum here so legacy
  // / test credentials still work. New-staff creation still requires 8+ chars.
  password: z.string().min(1).max(128),
  tenantSlug: z.string().min(1).max(64).optional(),
});
export type LoginInput = z.infer<typeof loginInput>;

export const refreshInput = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof refreshInput>;

export const meResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid().nullable(),
  permissions: z.array(z.string()),
});
export type MeResponse = z.infer<typeof meResponse>;

export const loginResponse = z.object({
  accessToken: z.string(),
  user: meResponse,
});
export type LoginResponse = z.infer<typeof loginResponse>;
