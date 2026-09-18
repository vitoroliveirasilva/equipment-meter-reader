import { describe, expect, it } from 'vitest';

import { parseGeminiMeterResponse } from '../src/integrations/gemini/gemini-response.js';

describe('parseGeminiMeterResponse', () => {
  it('returns a valid integer meter value', () => {
    const result = parseGeminiMeterResponse(
      JSON.stringify({
        value: 5487,
      }),
    );

    expect(result).toBe(5487);
  });

  it('accepts zero as a valid value', () => {
    const result = parseGeminiMeterResponse(
      JSON.stringify({
        value: 0,
      }),
    );

    expect(result).toBe(0);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseGeminiMeterResponse('not-json')).toThrowError();
  });

  it('rejects a response without value', () => {
    expect(() =>
      parseGeminiMeterResponse(
        JSON.stringify({
          result: 5487,
        }),
      ),
    ).toThrowError();
  });

  it('rejects a decimal value', () => {
    expect(() =>
      parseGeminiMeterResponse(
        JSON.stringify({
          value: 5487.5,
        }),
      ),
    ).toThrowError();
  });

  it('rejects a negative value', () => {
    expect(() =>
      parseGeminiMeterResponse(
        JSON.stringify({
          value: -1,
        }),
      ),
    ).toThrowError();
  });
});
