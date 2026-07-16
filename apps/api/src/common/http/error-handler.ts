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

