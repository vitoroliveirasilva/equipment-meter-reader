import { z } from 'zod';

export const measureTypeSchema = z.enum(['HOURMETER', 'ODOMETER']);

export const createReadingBodySchema = z
  .object({
    image: z.string().min(1),
    equipment_code: z.string().trim().min(1).max(50),
    measure_datetime: z.string().datetime({ offset: true }),
    measure_type: measureTypeSchema,
  })
  .strict();

export const confirmReadingParamsSchema = z
  .object({
    uuid: z.string().uuid(),
  })
  .strict();

export const confirmReadingBodySchema = z
  .object({
    confirmed_value: z.number().int().nonnegative(),
  })
  .strict();

const caseInsensitiveMeasureTypeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(measureTypeSchema);

export const listReadingsParamsSchema = z
  .object({
    code: z.string().trim().min(1).max(50),
  })
  .strict();

export const listReadingsQuerySchema = z
  .object({
    measure_type: caseInsensitiveMeasureTypeSchema.optional(),
  })
  .strict();

export type CreateReadingInput = z.infer<typeof createReadingBodySchema>;
