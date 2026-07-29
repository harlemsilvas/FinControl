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
  AUTH_PASSWORD_RESET_TTL_MINUTES: 60,
  PASSWORD_RESET_BASE_URL: 'http://localhost:5173/password-reset',
} as Environment;

function repository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findActiveUserByEmail: vi.fn(), findActiveUserById: vi.fn(), createSession: vi.fn(),
    rotateSession: vi.fn(), isSessionActive: vi.fn(), revokeSession: vi.fn(), audit: vi.fn(),
    findPasswordResetUserByEmail: vi.fn(), findPasswordResetUserById: vi.fn(),
    createPasswordResetRequest: vi.fn(), consumePasswordResetToken: vi.fn(),
    ...overrides,
  } as unknown as AuthRepository;
}

describe('AuthService', () => {
  it('creates a session and tokens for valid credentials', async () => {
    const user: AuthUser = { id: 'user-id', fullName: 'Master', email: 'master@example.com',
      passwordHash: await hashPassword('valid-password'), isMaster: true, roles: ['MASTER'], permissions: [], companies: [], defaultCompanyId: null };
    const createSession = vi.fn().mockResolvedValue('session-id');
    const audit = vi.fn().mockResolvedValue(undefined);
    const repo = repository({ findActiveUserByEmail: vi.fn().mockResolvedValue(user), createSession, audit });
    const result = await new AuthService(repo, new TokenService(environment))
      .login(user.email, 'valid-password', context);
    expect(result).toMatchObject({ tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'user-id', isMaster: true, companies: [], defaultCompanyId: null } });
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

  it('queues password reset instructions for an active user without exposing the token', async () => {
    const user = { id: 'user-id', fullName: 'Operadora', email: 'operadora@example.com' };
    const createPasswordResetRequest = vi.fn<(...args: Parameters<AuthRepository['createPasswordResetRequest']>) => Promise<void>>()
      .mockResolvedValue(undefined);
    const audit = vi.fn().mockResolvedValue(undefined);
    const repo = repository({
      findPasswordResetUserByEmail: vi.fn().mockResolvedValue(user),
      createPasswordResetRequest,
      audit,
    });

    const result = await new AuthService(repo, new TokenService(environment)).requestPasswordReset(user.email, context);

    expect((result as { message?: unknown }).message).toEqual(expect.any(String));
    expect(result).not.toHaveProperty('token');
    expect(createPasswordResetRequest).toHaveBeenCalledOnce();
    const [resetUser, tokenHash, expiresAt, resetUrl, requestContext, createdBy] = createPasswordResetRequest.mock.calls[0]!;
    expect(resetUser).toEqual(user);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(expiresAt).toBeInstanceOf(Date);
    expect(resetUrl).toContain('/password-reset?token=');
    expect(requestContext).toBe(context);
    expect(createdBy).toBeNull();
    expect(audit).toHaveBeenCalledWith('PASSWORD_RESET_REQUESTED', 'user-id', 'user-id', context, { channel: 'EMAIL', source: 'PUBLIC' });
  });

  it('rejects invalid or expired password reset tokens', async () => {
    const repo = repository({ consumePasswordResetToken: vi.fn().mockResolvedValue(false) });

    await expect(new AuthService(repo, new TokenService(environment)).resetPassword('invalid-token-value-that-is-long-enough', 'new-password', context))
      .rejects.toMatchObject({ code: 'INVALID_PASSWORD_RESET_TOKEN', statusCode: 400 });
  });
});
