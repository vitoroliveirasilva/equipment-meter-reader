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
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_TIMEOUT_MS;
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

    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.GEMINI_MODEL).toBe('gemini-3.5-flash-lite');
    expect(env.GEMINI_TIMEOUT_MS).toBe(30_000);
  });

  it('uses configured Gemini values when provided', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GEMINI_MODEL = 'custom-gemini-model';
    process.env.GEMINI_TIMEOUT_MS = '45000';

    const { env } = await import('../src/config/env.js');

    expect(env.GEMINI_API_KEY).toBe('test-api-key');
    expect(env.GEMINI_MODEL).toBe('custom-gemini-model');
    expect(env.GEMINI_TIMEOUT_MS).toBe(45_000);
  });

  it('rejects an invalid port', async () => {
    process.env.PORT = 'invalid';

    await expect(import('../src/config/env.js')).rejects.toThrow();
  });

  it('rejects an invalid Gemini timeout', async () => {
    process.env.GEMINI_TIMEOUT_MS = 'invalid';

    await expect(import('../src/config/env.js')).rejects.toThrow();
  });
});
