import { ApplicationError } from '../../common/errors/application-error.js';
import type { AuthRepository, AuthUser, RequestContext } from './auth-repository.js';
import { verifyPassword } from './password.js';
import type { TokenService } from './token-service.js';

const UNKNOWN_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

export class AuthService {
  constructor(private readonly repository: AuthRepository, private readonly tokens: TokenService) {}

  async login(email: string, password: string, context: RequestContext): Promise<object> {
    const user = await this.repository.findActiveUserByEmail(email);
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      await this.repository.audit('LOGIN_FAILED', user?.id ?? UNKNOWN_ENTITY_ID, user?.id ?? null, context,
        { attemptedEmail: email.toLowerCase() });
      throw new ApplicationError({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', statusCode: 401 });
    }

    const refreshToken = this.tokens.createRefreshToken();
    const sessionId = await this.repository.createSession(
      user.id, this.tokens.hashRefreshToken(refreshToken), this.tokens.refreshExpiry(), context,
    );
    await this.repository.audit('LOGIN_SUCCEEDED', user.id, user.id, context, { sessionId });
    return this.tokenResponse(user, sessionId, refreshToken);
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<object> {
    const replacement = this.tokens.createRefreshToken();
    const rotated = await this.repository.rotateSession(
      this.tokens.hashRefreshToken(refreshToken), this.tokens.hashRefreshToken(replacement), this.tokens.refreshExpiry(),
    );
    if (!rotated) {
      await this.repository.audit('REFRESH_FAILED', UNKNOWN_ENTITY_ID, null, context);
      throw new ApplicationError({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token', statusCode: 401 });
    }
    const user = await this.repository.findActiveUserById(rotated.userId);
    if (!user) throw new ApplicationError({ code: 'USER_INACTIVE', message: 'User is inactive', statusCode: 401 });
    await this.repository.audit('TOKEN_REFRESHED', user.id, user.id, context, { sessionId: rotated.sessionId });
    return this.tokenResponse(user, rotated.sessionId, replacement);
  }

  private tokenResponse(user: AuthUser, sessionId: string, refreshToken: string): object {
    return {
      accessToken: this.tokens.createAccessToken(user.id, sessionId), refreshToken,
      tokenType: 'Bearer', expiresIn: this.tokens.accessTokenTtlSeconds,
      user: this.publicUser(user),
    };
  }

  publicUser(user: AuthUser): object {
    return { id: user.id, fullName: user.fullName, email: user.email, isMaster: user.isMaster,
      roles: user.roles, permissions: user.permissions };
  }
}
