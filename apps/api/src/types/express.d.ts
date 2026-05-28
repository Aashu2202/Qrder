import type { Role, Permission } from '@qrder/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        branchId: string | null;
        role: Role;
        permissions: Permission[];
      };
    }
  }
}

export {};
