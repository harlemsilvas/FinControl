import { describe, expect, it, vi } from 'vitest';
import type { Environment } from '../src/config/environment.js';
import type { AuthRepository, AuthUser, RequestContext } from '../src/domains/auth/auth-repository.js';
import { AuthService } from '../src/domains/auth/auth-service.js';
import { hashPassword } from '../src/domains/auth/password.js';
import { TokenService } from '../src/domains/auth/token-service.js';

const context: RequestContext = { ip: '127.0.0.1', userAgent: 'vitest', correlationId: null };
const environment = {
  AUTH_ACCESS_TOKEN_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 900, AUTH_REFRESH_TOKEN_TTL_DAYS: 30,
  AUTH_ISSUER: 'fincontrol-api', AUTH_AUDIENCE: 'fincontrol',
} as Environment;

function repository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findActiveUserByEmail: vi.fn(), findActiveUserById: vi.fn(), createSession: vi.fn(),
    rotateSession: vi.fn(), isSessionActive: vi.fn(), revokeSession: vi.fn(), audit: vi.fn(),
    ...overrides,
  } as unknown as AuthRepository;
}

describe('AuthService', () => {
  it('creates a session and tokens for valid credentials', async () => {
    const user: AuthUser = { id: 'user-id', fullName: 'Master', email: 'master@example.com',
      passwordHash: await hashPassword('valid-password'), isMaster: true, roles: ['MASTER'], permissions: [] };
    const createSession = vi.fn().mockResolvedValue('session-id');
    const audit = vi.fn().mockResolvedValue(undefined);
    const repo = repository({ findActiveUserByEmail: vi.fn().mockResolvedValue(user), createSession, audit });
    const result = await new AuthService(repo, new TokenService(environment))
      .login(user.email, 'valid-password', context);
    expect(result).toMatchObject({ tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'user-id', isMaster: true } });
    expect(createSession).toHaveBeenCalledOnce();
    expect(audit).toHaveBeenCalledWith('LOGIN_SUCCEEDED', 'user-id', 'user-id', context,
      { sessionId: 'session-id' });
  });

  it('returns one generic error and audits invalid credentials', async () => {
    const audit = vi.fn().mockResolvedValue(undefined);
    const repo = repository({ findActiveUserByEmail: vi.fn().mockResolvedValue(null), audit });
    await expect(new AuthService(repo, new TokenService(environment))
      .login('unknown@example.com', 'wrong-password', context))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    expect(audit).toHaveBeenCalledWith('LOGIN_FAILED', expect.any(String), null, context,
      { attemptedEmail: 'unknown@example.com' });
  });

  it('rejects a reused or expired refresh token', async () => {
    const audit = vi.fn().mockResolvedValue(undefined);
    const repo = repository({ rotateSession: vi.fn().mockResolvedValue(null), audit });
    await expect(new AuthService(repo, new TokenService(environment)).refresh('invalid-token', context))
      .rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', statusCode: 401 });
    expect(audit).toHaveBeenCalledWith('REFRESH_FAILED', expect.any(String), null, context);
  });
});
