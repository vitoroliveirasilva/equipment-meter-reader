import type { FastifyInstance } from 'fastify';

import { AppError } from '../../shared/errors/app-error.js';
import {
  confirmReadingBodySchema,
  confirmReadingParamsSchema,
  createReadingBodySchema,
  listReadingsParamsSchema,
  listReadingsQuerySchema,
} from './reading.schema.js';
import type { ReadingService } from './reading.service.js';

export function readingRoutes(app: FastifyInstance, readingService: ReadingService): void {
  app.post('/readings', async (request, reply) => {
    const result = createReadingBodySchema.safeParse(request.body);

    if (!result.success) {
      throwInvalidData(result.error.issues[0]);
    }

    const reading = await readingService.create(result.data);

    return reply.status(201).send({
      reading_uuid: reading.readingUuid,
      detected_value: reading.detectedValue,
      image_url: reading.imageUrl,
    });
  });

  app.patch('/readings/:uuid/confirm', async (request, reply) => {
    const paramsResult = confirmReadingParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throwInvalidData(paramsResult.error.issues[0]);
    }

    const bodyResult = confirmReadingBodySchema.safeParse(request.body);

    if (!bodyResult.success) {
      throwInvalidData(bodyResult.error.issues[0]);
    }

    await readingService.confirm(paramsResult.data.uuid, bodyResult.data.confirmed_value);

    return reply.status(200).send({
      success: true,
    });
  });

  app.get('/equipment/:code/readings', async (request, reply) => {
    const paramsResult = listReadingsParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throwInvalidData(paramsResult.error.issues[0]);
    }

    const queryResult = listReadingsQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0];

      throw new AppError(
        400,
        'INVALID_MEASURE_TYPE',
        firstIssue?.message ?? 'Invalid measure type',
      );
    }

    const result = await readingService.listByEquipmentCode(
      paramsResult.data.code,
      queryResult.data.measure_type,
    );

    return reply.status(200).send({
      equipment_code: result.equipmentCode,
      readings: result.readings.map((reading) => ({
        reading_uuid: reading.readingUuid,
        measure_datetime: reading.measureDatetime,
        measure_type: reading.measureType,
        detected_value: reading.detectedValue,
        confirmed_value: reading.confirmedValue,
        confirmed: reading.confirmed,
        image_url: reading.imageUrl,
      })),
    });
  });
}

interface ValidationIssue {
  path: PropertyKey[];
  message: string;
}

function throwInvalidData(issue: ValidationIssue | undefined): never {
  const field = issue?.path.map(String).join('.') || 'body';

  throw new AppError(400, 'INVALID_DATA', `${field}: ${issue?.message ?? 'Invalid request data'}`);
}
