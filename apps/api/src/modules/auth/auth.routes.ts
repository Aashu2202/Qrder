import { Router, type Router as ExpressRouter } from 'express';
import { loginInput } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { unauthorized } from '../../lib/errors.js';
import * as service from './auth.service.js';
import { env } from '../../config/env.js';

const router: ExpressRouter = Router();

const REFRESH_COOKIE = 'qrder_refresh';
const refreshCookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  // 'lax' so the cookie reliably accompanies cross-port XHR in dev
  // (admin :3001 / kitchen :3002 → api :4000). 'strict' broke this in some browsers.
  sameSite: 'lax' as const,
  path: '/v1/auth',
  // Session cap: refresh cookie expires when the JWT itself does (8h).
  maxAge: 8 * 60 * 60 * 1000,
};

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = loginInput.parse(req.body);
    const { accessToken, refreshToken, user } = await service.login(body);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOpts);
    res.json({ accessToken, user });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const cookieToken = req.cookies?.[REFRESH_COOKIE];
    if (!cookieToken) throw unauthorized('No refresh token');
    const { accessToken, refreshToken } = await service.refresh(cookieToken);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOpts);
    res.json({ accessToken });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.clearCookie(REFRESH_COOKIE, { path: '/v1/auth' });
    res.status(204).end();
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json({
      id: req.user.id,
      tenantId: req.user.tenantId,
      branchId: req.user.branchId,
      role: req.user.role,
      permissions: req.user.permissions,
    });
  }),
);

export const authRouter = router;
