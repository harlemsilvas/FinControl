import { describe, expect, it } from 'vitest';
import type { Environment } from '../src/config/environment.js';
import { hashPassword, verifyPassword } from '../src/domains/auth/password.js';
import { TokenService } from '../src/domains/auth/token-service.js';

const environment = {
  AUTH_ACCESS_TOKEN_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
  AUTH_REFRESH_TOKEN_TTL_DAYS: 30,
  AUTH_ISSUER: 'fincontrol-api',
  AUTH_AUDIENCE: 'fincontrol',
} as Environment;

describe('authentication cryptography', () => {
  it('hashes and verifies passwords without storing plaintext', async () => {
    const hash = await hashPassword('a-secure-password');
    expect(hash).not.toContain('a-secure-password');
    await expect(verifyPassword('a-secure-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('signs, validates and expires access tokens', () => {
    const service = new TokenService(environment);
    const now = new Date('2026-07-16T12:00:00Z');
    const token = service.createAccessToken('user-id', 'session-id', now);
    expect(service.verifyAccessToken(token, now)).toMatchObject({ sub: 'user-id', sid: 'session-id' });
    expect(service.verifyAccessToken(`${token}x`, now)).toBeNull();
    expect(service.verifyAccessToken(token, new Date('2026-07-16T12:16:00Z'))).toBeNull();
  });

  it('creates opaque refresh tokens and stable hashes', () => {
    const service = new TokenService(environment);
    const token = service.createRefreshToken();
    expect(token.length).toBeGreaterThan(32);
    expect(service.hashRefreshToken(token)).toHaveLength(64);
    expect(service.hashRefreshToken(token)).toBe(service.hashRefreshToken(token));
  });
});
