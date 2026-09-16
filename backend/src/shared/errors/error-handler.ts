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

    if ('code' in error && error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.status(400).send({
        error_code: 'INVALID_IMAGE',
        error_description: 'Image exceeds the maximum allowed size',
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      error_code: 'INTERNAL_SERVER_ERROR',
      error_description: 'An unexpected error occurred',
    });
  });
}
