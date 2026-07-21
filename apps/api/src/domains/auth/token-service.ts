import { createHmac, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { Environment } from '../../config/environment.js';

interface AccessClaims {
  sub: string;
  sid: string;
  type: 'access';
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export class TokenService {
  constructor(private readonly environment: Environment) {}

  createAccessToken(userId: string, sessionId: string, now = new Date()): string {
    const issuedAt = Math.floor(now.getTime() / 1000);
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({
      sub: userId,
      sid: sessionId,
      type: 'access',
      iss: this.environment.AUTH_ISSUER,
      aud: this.environment.AUTH_AUDIENCE,
      iat: issuedAt,
      exp: issuedAt + this.environment.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    } satisfies AccessClaims);
    const unsigned = `${header}.${payload}`;
    return `${unsigned}.${this.sign(unsigned)}`;
  }

  verifyAccessToken(token: string, now = new Date()): AccessClaims | null {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const expected = Buffer.from(this.sign(`${header}.${payload}`));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccessClaims;
      const current = Math.floor(now.getTime() / 1000);
      if (claims.type !== 'access' || claims.iss !== this.environment.AUTH_ISSUER ||
          claims.aud !== this.environment.AUTH_AUDIENCE || claims.exp <= current ||
          typeof claims.sub !== 'string' || typeof claims.sid !== 'string') return null;
      return claims;
    } catch {
      return null;
    }
  }

  createRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  refreshExpiry(now = new Date()): Date {
    return new Date(now.getTime() + this.environment.AUTH_REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  }

  get accessTokenTtlSeconds(): number {
    return this.environment.AUTH_ACCESS_TOKEN_TTL_SECONDS;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.environment.AUTH_ACCESS_TOKEN_SECRET)
      .update(value).digest('base64url');
  }
}
