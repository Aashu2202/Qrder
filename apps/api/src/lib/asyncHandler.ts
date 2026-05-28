import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so thrown errors propagate to Express's
 * error-handling middleware instead of becoming unhandled rejections.
 * Express 5 does this natively; this shim keeps us safe on Express 4.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
