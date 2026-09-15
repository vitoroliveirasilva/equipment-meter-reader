import { z } from 'zod';

export const createReadingBodySchema = z
  .object({
    image: z.string().min(1),
    equipment_code: z.string().trim().min(1).max(50),
    measure_datetime: z.string().datetime({ offset: true }),
    measure_type: z.enum(['HOURMETER', 'ODOMETER']),
  })
  .strict();

export type CreateReadingInput = z.infer<typeof createReadingBodySchema>;
