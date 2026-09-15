import Fastify from 'fastify';

import { healthRoutes } from './modules/health/health.routes.js';
import { registerErrorHandler } from './shared/errors/error-handler.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  registerErrorHandler(app);
  healthRoutes(app);

  return app;
}
