import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role, Permission } from '@qrder/shared';

const encoder = new TextEncoder();

export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  tenantId: string;
  branchId: string | null;
  role: Role;
  perms: Permission[];
}

export interface RefreshTokenClaims extends JWTPayload {
  sub: string;
  tenantId: string;
  jti: string;
}

export interface JwtConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  accessExpiresIn?: string; // e.g. '15m'
  refreshExpiresIn?: string; // e.g. '30d'
}

export function createJwt(config: JwtConfig) {
  const key = encoder.encode(config.secret);
  const issuer = config.issuer ?? 'qrder';
  const audience = config.audience ?? 'qrder';
  const accessExp = config.accessExpiresIn ?? '15m';
  const refreshExp = config.refreshExpiresIn ?? '30d';

  return {
    async signAccess(claims: Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss' | 'aud'>) {
      return new SignJWT(claims)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(issuer)
        .setAudience(audience)
        .setExpirationTime(accessExp)
        .sign(key);
    },

    async signRefresh(claims: Omit<RefreshTokenClaims, 'iat' | 'exp' | 'iss' | 'aud'>) {
      return new SignJWT(claims)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(issuer)
        .setAudience(audience)
        .setExpirationTime(refreshExp)
        .sign(key);
    },

    async verifyAccess(token: string): Promise<AccessTokenClaims> {
      const { payload } = await jwtVerify(token, key, { issuer, audience });
      return payload as AccessTokenClaims;
    },

    async verifyRefresh(token: string): Promise<RefreshTokenClaims> {
      const { payload } = await jwtVerify(token, key, { issuer, audience });
      return payload as RefreshTokenClaims;
    },
  };
}
