import type { FastifyInstance } from 'fastify';

import { openApiDocument } from '../../docs/openapi.js';

const swaggerUiHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Equipment Meter Reader API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      displayRequestDuration: true,
      tryItOutEnabled: true
    })
  </script>
</body>
</html>`;

export function docsRoutes(app: FastifyInstance): void {
  app.get('/docs/openapi.json', (_request, reply) => {
    return reply.type('application/json').send(openApiDocument);
  });

  app.get('/docs', (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(swaggerUiHtml);
  });

  app.get('/docs/', (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(swaggerUiHtml);
  });
}
