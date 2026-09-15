import type { FastifyInstance } from 'fastify';

import { AppError } from './app-error.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error_code: error.errorCode,
        error_description: error.message,
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      error_code: 'INTERNAL_SERVER_ERROR',
      error_description: 'An unexpected error occurred',
    });
  });
}
