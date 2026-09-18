import { z } from 'zod';

import { AppError } from '../../shared/errors/app-error.js';

const geminiMeterResponseSchema = z
  .object({
    value: z.number().int().nonnegative(),
  })
  .strict();

export function parseGeminiMeterResponse(responseText: string): number {
  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(responseText);
  } catch {
    throw new AppError(502, 'AI_PROCESSING_ERROR', 'AI returned an invalid JSON response');
  }

  const result = geminiMeterResponseSchema.safeParse(parsedResponse);

  if (!result.success) {
    throw new AppError(502, 'AI_PROCESSING_ERROR', 'AI returned an invalid meter value');
  }

  return result.data.value;
}
