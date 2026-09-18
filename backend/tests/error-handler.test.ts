import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { AppError } from '../src/shared/errors/app-error.js';

describe('error handler', () => {
  it('returns application errors using the standard format', async () => {
    const app = buildApp();

    app.get('/test-error', () => {
      throw new AppError(409, 'TEST_CONFLICT', 'Test conflict');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error_code: 'TEST_CONFLICT',
      error_description: 'Test conflict',
    });

    await app.close();
  });

  it('does not expose unexpected internal errors', async () => {
    const app = buildApp();

    app.get('/unexpected-error', () => {
      throw new Error('database password should never leak');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/unexpected-error',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error_code: 'INTERNAL_SERVER_ERROR',
      error_description: 'An unexpected error occurred',
    });

    expect(response.body).not.toContain('database password should never leak');

    await app.close();
  });
});
