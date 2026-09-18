import { describe, expect, it } from 'vitest';

import {
  confirmReadingBodySchema,
  confirmReadingParamsSchema,
  createReadingBodySchema,
  listReadingsQuerySchema,
} from '../src/modules/reading/reading.schema.js';

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

describe('confirmation schemas', () => {
  it('accepts a valid UUID and confirmation value', () => {
    expect(
      confirmReadingParamsSchema.safeParse({
        uuid: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);

    expect(
      confirmReadingBodySchema.safeParse({
        confirmed_value: 5489,
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid UUID', () => {
    expect(
      confirmReadingParamsSchema.safeParse({
        uuid: 'invalid-uuid',
      }).success,
    ).toBe(false);
  });

  it('rejects a negative or decimal confirmation value', () => {
    expect(
      confirmReadingBodySchema.safeParse({
        confirmed_value: -1,
      }).success,
    ).toBe(false);

    expect(
      confirmReadingBodySchema.safeParse({
        confirmed_value: 10.5,
      }).success,
    ).toBe(false);
  });
});

describe('listReadingsQuerySchema', () => {
  it.each([
    ['HOURMETER', 'HOURMETER'],
    ['hourmeter', 'HOURMETER'],
    ['HourMeter', 'HOURMETER'],
    ['ODOMETER', 'ODOMETER'],
    ['odometer', 'ODOMETER'],
  ])('normalizes %s to %s', (input, expected) => {
    const result = listReadingsQuerySchema.parse({
      measure_type: input,
    });

    expect(result.measure_type).toBe(expected);
  });

  it('rejects an invalid measure type', () => {
    expect(
      listReadingsQuerySchema.safeParse({
        measure_type: 'TEMPERATURE',
      }).success,
    ).toBe(false);
  });
});
