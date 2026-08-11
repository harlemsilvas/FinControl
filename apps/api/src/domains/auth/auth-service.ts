import { ApplicationError } from '../../common/errors/application-error.js';
import type { EmailSender } from '../../infrastructure/email/email-sender.js';
import type { AuthRepository, AuthUser, RequestContext } from './auth-repository.js';
import { hashPassword, verifyPassword } from './password.js';
import type { TokenService } from './token-service.js';

const UNKNOWN_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly tokens: TokenService,
    private readonly emailSender?: EmailSender,
  ) {}

  async login(email: string, password: string, context: RequestContext): Promise<object> {
    const user = await this.repository.findActiveUserByEmail(email);
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      await this.repository.audit('LOGIN_FAILED', user?.id ?? UNKNOWN_ENTITY_ID, user?.id ?? null, context,
        { attemptedEmail: email.toLowerCase() });
      throw new ApplicationError({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.', statusCode: 401 });
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

  async requestPasswordReset(email: string, context: RequestContext): Promise<object> {
    const user = await this.repository.findPasswordResetUserByEmail(email);
    if (user) {
      await this.createPasswordReset(user, context, null);
      await this.repository.audit('PASSWORD_RESET_REQUESTED', user.id, user.id, context, { channel: 'EMAIL', source: 'PUBLIC' });
    }
    return { message: 'Se o e-mail estiver cadastrado e ativo, enviaremos as instrucoes de redefinicao.' };
  }

  async requestPasswordResetForUser(userId: string, actorId: string, context: RequestContext): Promise<object> {
    const user = await this.repository.findPasswordResetUserById(userId);
    if (!user) {
      throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Active user not found', statusCode: 404 });
    }
    const result = await this.createPasswordReset(user, context, actorId);
    await this.repository.audit('PASSWORD_RESET_REQUESTED', user.id, actorId, context, { channel: 'EMAIL', source: 'ADMIN' });
    return result;
  }

  async resetPassword(token: string, password: string, context: RequestContext): Promise<object> {
    const changed = await this.repository.consumePasswordResetToken(
      this.tokens.hashPasswordResetToken(token),
      await hashPassword(password),
      context,
    );
    if (!changed) {
      throw new ApplicationError({ code: 'INVALID_PASSWORD_RESET_TOKEN', message: 'Password reset link is invalid or expired', statusCode: 400 });
    }
    return { message: 'Senha redefinida com sucesso. Entre novamente com a nova senha.' };
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
      roles: user.roles, permissions: user.permissions, companies: user.companies, defaultCompanyId: user.defaultCompanyId };
  }

  private async createPasswordReset(
    user: { id: string; fullName: string; email: string },
    context: RequestContext,
    createdBy: string | null,
  ): Promise<object> {
    const token = this.tokens.createPasswordResetToken();
    const expiresAt = this.tokens.passwordResetExpiry();
    const resetUrl = this.passwordResetUrl(token);
    const email = await this.repository.createPasswordResetRequest(
      user,
      this.tokens.hashPasswordResetToken(token),
      expiresAt,
      resetUrl,
      context,
      createdBy,
    );
    const emailStatus = await this.deliverPasswordResetEmail(email);
    return { message: this.passwordResetMessage(emailStatus), emailStatus, expiresAt: expiresAt.toISOString() };
  }

  private passwordResetUrl(token: string): string {
    const url = new URL(this.tokens.passwordResetBaseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async deliverPasswordResetEmail(email: {
    id: string;
    to: string;
    recipientName: string | null;
    subject: string;
    text: string;
    html: string | null;
  }): Promise<'PENDING' | 'SENT' | 'FAILED'> {
    if (!this.emailSender?.enabled) return 'PENDING';

    try {
      const result = await this.emailSender.send(email);
      await this.repository.markEmailOutboxSent(email.id, result.providerMessageId);
      return 'SENT';
    } catch (error) {
      await this.repository.markEmailOutboxFailed(email.id, error instanceof Error ? error.message : 'Unknown SMTP failure');
      return 'FAILED';
    }
  }

  private passwordResetMessage(status: 'PENDING' | 'SENT' | 'FAILED'): string {
    if (status === 'SENT') return 'Instrucoes de redefinicao enviadas por e-mail.';
    if (status === 'FAILED') return 'Instrucoes de redefinicao geradas, mas o envio por e-mail falhou. Verifique a outbox.';
    return 'Instrucoes de redefinicao enfileiradas para envio por e-mail.';
  }
}
