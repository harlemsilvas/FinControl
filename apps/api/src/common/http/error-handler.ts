import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApplicationError } from '../errors/application-error.js';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

interface PostgreSqlError extends Error { code?: string; constraint?: string }

function handleError(
  error: FastifyError | ApplicationError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ApplicationError) {
    request.log.warn({ err: error, code: error.code }, 'Application request failed');
    void reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        requestId: request.id,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    } satisfies ErrorResponse);
    return;
  }


  const databaseError = error as PostgreSqlError;
  if (databaseError.code === '23505') {
    void reply.status(409).send({ error: { code: 'RESOURCE_CONFLICT', message: 'A resource with these values already exists',
      requestId: request.id, details: databaseError.constraint ? { constraint: databaseError.constraint } : undefined } });
    return;
  }
  if (databaseError.code === '23503' || databaseError.code === '23514') {
    void reply.status(400).send({ error: { code: 'INVALID_REFERENCE', message: 'The resource contains an invalid reference or value',
      requestId: request.id, details: databaseError.constraint ? { constraint: databaseError.constraint } : undefined } });
    return;
  }

  const statusCode = error.statusCode !== undefined && error.statusCode < 500
    ? error.statusCode
    : 500;
  const code = statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR';
  const message = statusCode === 500 ? 'An unexpected error occurred' : error.message;

  request.log.error({ err: error }, 'Unhandled request error');
  void reply.status(statusCode).send({
    error: { code, message, requestId: request.id },
  } satisfies ErrorResponse);
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(handleError);
  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route not found',
        requestId: request.id,
      },
    } satisfies ErrorResponse);
  });
}
