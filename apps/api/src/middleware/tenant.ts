import type { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { unauthorized } from '../lib/errors.js';

export interface TenantContext {
  tenantId: string;
  branchId: string | null;
  /** 'operator' = authenticated staff; 'customer' = QR-token-bearing diner */
  source: 'operator' | 'customer' | 'platform';
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) throw unauthorized('No tenant context');
  return ctx;
}

/**
 * Pulls tenant context from `req.user` (set by requireAuth) and wraps the
 * downstream pipeline in AsyncLocalStorage so service code can read it
 * without threading it through every call.
 */
export function tenantFromUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  const ctx: TenantContext = {
    tenantId: req.user.tenantId,
    branchId: req.user.branchId,
    source: 'operator',
  };
  tenantStorage.run(ctx, () => next());
}
