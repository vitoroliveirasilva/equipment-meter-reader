import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('environment configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();

    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/test',
    };

    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.UPLOADS_DIR;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('uses default values when optional variables are not provided', async () => {
    const { env } = await import('../src/config/env.js');

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3333);
    expect(env.DATABASE_URL).toBe('postgresql://user:password@localhost:5432/test');
    expect(env.UPLOADS_DIR).toBe('../uploads');
  });

  it('rejects an invalid port', async () => {
    process.env.PORT = 'invalid';

    await expect(import('../src/config/env.js')).rejects.toThrow();
  });
});
