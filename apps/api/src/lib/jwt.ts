import { createJwt, createQrToken } from '@qrder/auth';
import { env } from '../config/env.js';

export const jwt = createJwt({
  secret: env.JWT_SECRET,
  accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
});

export const qrToken = createQrToken({ secret: env.QR_TOKEN_SECRET });
