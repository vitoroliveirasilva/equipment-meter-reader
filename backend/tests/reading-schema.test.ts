import { describe, expect, it } from 'vitest';

import { createReadingBodySchema } from '../src/modules/reading/reading.schema.js';

describe('createReadingBodySchema', () => {
  const validPayload = {
    image: 'data:image/jpeg;base64,/9j/2Q==',
    equipment_code: 'EMP-001',
    measure_datetime: '2026-09-15T10:00:00.000Z',
    measure_type: 'HOURMETER',
  };

  it('accepts a valid reading payload', () => {
    const result = createReadingBodySchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it('rejects an invalid measure type', () => {
    const result = createReadingBodySchema.safeParse({
      ...validPayload,
      measure_type: 'TEMPERATURE',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid measure datetime', () => {
    const result = createReadingBodySchema.safeParse({
      ...validPayload,
      measure_datetime: '15/09/2026',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown properties', () => {
    const result = createReadingBodySchema.safeParse({
      ...validPayload,
      unexpected_field: true,
    });

    expect(result.success).toBe(false);
  });
});
