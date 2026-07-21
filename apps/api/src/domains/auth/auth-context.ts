import type { FastifyRequest } from 'fastify';
import { ApplicationError } from '../../common/errors/application-error.js';
import type { AuthUser } from './auth-repository.js';
import type { AuthRepository } from './auth-repository.js';
import type { TokenService } from './token-service.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null;
    authSessionId: string | null;
  }
}

export function createAuthenticate(repository: AuthRepository, tokens: TokenService) {
  return async function authenticate(request: FastifyRequest): Promise<void> {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    const claims = token ? tokens.verifyAccessToken(token) : null;
    if (!claims || !(await repository.isSessionActive(claims.sid, claims.sub))) {
      throw new ApplicationError({ code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 });
    }
    const user = await repository.findActiveUserById(claims.sub);
    if (!user) throw new ApplicationError({ code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 });
    request.authUser = user;
    request.authSessionId = claims.sid;
  };
}

export function requirePermission(permission: string) {
  return function authorize(request: FastifyRequest): Promise<void> {
    const user = request.authUser;
    if (!user || (!user.isMaster && !user.permissions.includes(permission))) {
      return Promise.reject(new ApplicationError({ code: 'FORBIDDEN', message: 'Insufficient permission', statusCode: 403 }));
    }
    return Promise.resolve();
  };
}
