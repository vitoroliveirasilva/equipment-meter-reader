import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

describe('API documentation', () => {
  it('serves Swagger UI at /docs', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('SwaggerUIBundle');
    expect(response.body).toContain('/docs/openapi.json');

    await app.close();
  });

  it('serves an OpenAPI document for the real API routes', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/docs/openapi.json',
    });

    expect(response.statusCode).toBe(200);

    const document = response.json<{
      openapi: string;
      paths: Record<string, unknown>;
    }>();

    expect(document.openapi).toBe('3.1.0');
    expect(document.paths).toHaveProperty('/health');
    expect(document.paths).toHaveProperty('/readings');
    expect(document.paths).toHaveProperty('/readings/{uuid}/confirm');
    expect(document.paths).toHaveProperty('/equipment/{code}/readings');

    await app.close();
  });
});
