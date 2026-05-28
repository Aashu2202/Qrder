import type { Request, Response, NextFunction } from 'express';
import type { Role, Permission } from '@qrder/shared';
import { jwt } from '../lib/jwt.js';
import { unauthorized, forbidden } from '../lib/errors.js';

export interface AuthUser {
  id: string;
  tenantId: string;
  branchId: string | null;
  role: Role;
  permissions: Permission[];
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthorized();
    const token = header.slice('Bearer '.length).trim();
    if (!token) throw unauthorized();

    const claims = await jwt.verifyAccess(token);
    req.user = {
      id: claims.sub,
      tenantId: claims.tenantId,
      branchId: claims.branchId,
      role: claims.role,
      permissions: claims.perms,
    };
    next();
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) next(err);
    else next(unauthorized('Invalid or expired token'));
  }
}

export function requirePerm(...required: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const has = required.every((p) => req.user!.permissions.includes(p));
    if (!has) return next(forbidden(`Missing permission: ${required.join(', ')}`));
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('Role not allowed'));
    next();
  };
}
