import Fastify from 'fastify';

import { healthRoutes } from './modules/health/health.routes.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  healthRoutes(app);

  return app;
}
