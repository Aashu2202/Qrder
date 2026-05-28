import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

export interface QrTokenClaims {
  tenantId: string;
  branchId: string;
  tableId: string;
  jti: string;
}

export function createQrToken(config: { secret: string }) {
  const key = encoder.encode(config.secret);
  const issuer = 'qrder:qr';
  const audience = 'qrder:customer';

  return {
    async sign(claims: QrTokenClaims): Promise<string> {
      return new SignJWT({ ...claims })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(issuer)
        .setAudience(audience)
        .sign(key);
    },

    async verify(token: string): Promise<QrTokenClaims> {
      const { payload } = await jwtVerify(token, key, { issuer, audience });
      return {
        tenantId: payload.tenantId as string,
        branchId: payload.branchId as string,
        tableId: payload.tableId as string,
        jti: payload.jti as string,
      };
    },
  };
}
