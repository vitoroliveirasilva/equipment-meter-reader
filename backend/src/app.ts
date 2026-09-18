import Fastify from 'fastify';

import { docsRoutes } from './modules/docs/docs.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { readingRoutes } from './modules/reading/reading.routes.js';
import type { ReadingService } from './modules/reading/reading.service.js';
import { registerErrorHandler } from './shared/errors/error-handler.js';

interface BuildAppOptions {
  readingService?: ReadingService;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: true,
    bodyLimit: 8 * 1024 * 1024,
  });

  registerErrorHandler(app);
  docsRoutes(app);
  healthRoutes(app);

  if (options.readingService) {
    readingRoutes(app, options.readingService);
  }

  return app;
}
