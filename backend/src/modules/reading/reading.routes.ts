import type { FastifyInstance } from 'fastify';

import { AppError } from '../../shared/errors/app-error.js';
import type { ReadingService } from './reading.service.js';
import { createReadingBodySchema } from './reading.schema.js';

export function readingRoutes(app: FastifyInstance, readingService: ReadingService): void {
  app.post('/readings', async (request, reply) => {
    const result = createReadingBodySchema.safeParse(request.body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const field = firstIssue?.path.join('.') || 'body';

      throw new AppError(
        400,
        'INVALID_DATA',
        `${field}: ${firstIssue?.message ?? 'Invalid request body'}`,
      );
    }

    const reading = await readingService.create(result.data);

    return reply.status(201).send({
      reading_uuid: reading.readingUuid,
      detected_value: reading.detectedValue,
      image_url: reading.imageUrl,
    });
  });
}
