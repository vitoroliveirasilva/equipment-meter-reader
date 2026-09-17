import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import type { MeterReader, MeterReaderInput } from '../src/modules/reading/meter-reader.js';
import type {
  CreateReadingRecord,
  EquipmentReference,
  MeasureType,
  ReadingConfirmationReference,
  ReadingHistoryRecord,
  ReadingRepository,
} from '../src/modules/reading/reading.repository.js';
import { ReadingService } from '../src/modules/reading/reading.service.js';
import { AppError } from '../src/shared/errors/app-error.js';

interface CreateReadingResponse {
  reading_uuid: string;
  detected_value: number;
  image_url: string;
}

interface ErrorResponse {
  error_code: string;
  error_description: string;
}

class FakeReadingRepository implements ReadingRepository {
  equipment: EquipmentReference | null = {
    id: 1,
    code: 'EMP-001',
  };

  duplicate = false;

  createdReadings: CreateReadingRecord[] = [];

  findEquipmentByCode(code: string): Promise<EquipmentReference | null> {
    return Promise.resolve(this.equipment?.code === code ? this.equipment : null);
  }

  existsForDay(equipmentId: number, measureType: MeasureType, measureDate: Date): Promise<boolean> {
    void equipmentId;
    void measureType;
    void measureDate;

    return Promise.resolve(this.duplicate);
  }

  create(data: CreateReadingRecord): Promise<void> {
    this.createdReadings.push(data);

    return Promise.resolve();
  }

  findByUuid(uuid: string): Promise<ReadingConfirmationReference | null> {
    void uuid;

    return Promise.resolve(null);
  }

  confirmIfPending(id: number, confirmedValue: number): Promise<boolean> {
    void id;
    void confirmedValue;

    return Promise.resolve(false);
  }

  listByEquipment(equipmentId: number, measureType?: MeasureType): Promise<ReadingHistoryRecord[]> {
    void equipmentId;
    void measureType;

    return Promise.resolve([]);
  }
}

class FakeMeterReader implements MeterReader {
  error: Error | null = null;
  value = 5487;

  read(input: MeterReaderInput): Promise<number> {
    void input;

    if (this.error) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.value);
  }
}

describe('POST /readings', () => {
  let uploadsDirectory: string;
  let repository: FakeReadingRepository;
  let meterReader: FakeMeterReader;

  const validImage = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString(
    'base64',
  )}`;

  const validPayload = {
    image: validImage,
    equipment_code: 'EMP-001',
    measure_datetime: '2026-09-15T10:00:00.000Z',
    measure_type: 'HOURMETER',
  };

  beforeEach(async () => {
    uploadsDirectory = await mkdtemp(join(tmpdir(), 'equipment-meter-reader-http-'));

    repository = new FakeReadingRepository();
    meterReader = new FakeMeterReader();
  });

  afterEach(async () => {
    await rm(uploadsDirectory, {
      recursive: true,
      force: true,
    });
  });

  function createApp() {
    const readingService = new ReadingService(repository, meterReader, uploadsDirectory);

    return buildApp({
      readingService,
    });
  }

  it('creates a valid reading', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);

    const body = response.json<CreateReadingResponse>();

    expect(body).toMatchObject({
      detected_value: 5487,
    });

    expect(body.reading_uuid).toEqual(expect.any(String));
    expect(body.image_url).toMatch(/^\/uploads\/.+\.jpg$/);

    expect(repository.createdReadings).toHaveLength(1);

    await app.close();
  });

  it('rejects an invalid body', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorResponse>();

    expect(body.error_code).toBe('INVALID_DATA');

    await app.close();
  });

  it('rejects an invalid measure type', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: {
        ...validPayload,
        measure_type: 'TEMPERATURE',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorResponse>();

    expect(body.error_code).toBe('INVALID_DATA');

    await app.close();
  });

  it('rejects an invalid datetime', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: {
        ...validPayload,
        measure_datetime: '15/09/2026',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorResponse>();

    expect(body.error_code).toBe('INVALID_DATA');

    await app.close();
  });

  it('rejects invalid Base64 data', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: {
        ...validPayload,
        image: 'data:image/jpeg;base64,invalid@@base64',
      },
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(400);
    expect(body.error_code).toBe('INVALID_IMAGE');

    await app.close();
  });

  it('rejects an unsupported MIME type', async () => {
    const app = createApp();

    const image = Buffer.from('fake-image').toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: {
        ...validPayload,
        image: `data:image/gif;base64,${image}`,
      },
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(400);
    expect(body.error_code).toBe('INVALID_IMAGE');

    await app.close();
  });

  it('returns 404 when the equipment does not exist', async () => {
    repository.equipment = null;

    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: validPayload,
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(404);
    expect(body.error_code).toBe('EQUIPMENT_NOT_FOUND');

    await app.close();
  });

  it('rejects a duplicate reading', async () => {
    repository.duplicate = true;

    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: validPayload,
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(409);
    expect(body.error_code).toBe('READING_DUPLICATE');

    await app.close();
  });

  it('returns 502 when AI processing fails', async () => {
    meterReader.error = new AppError(
      502,
      'AI_PROCESSING_ERROR',
      'Unable to process the equipment image',
    );

    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: validPayload,
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(502);
    expect(body.error_code).toBe('AI_PROCESSING_ERROR');

    await app.close();
  });

  it('returns 502 when AI returns an invalid response', async () => {
    meterReader.error = new AppError(
      502,
      'AI_PROCESSING_ERROR',
      'AI returned an invalid meter value',
    );

    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: validPayload,
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(502);
    expect(body.error_code).toBe('AI_PROCESSING_ERROR');

    await app.close();
  });

  it('rejects a request body larger than the server limit', async () => {
    const app = createApp();

    const oversizedPayload = Buffer.alloc(8 * 1024 * 1024 + 1, 1).toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/readings',
      payload: {
        ...validPayload,
        image: `data:image/jpeg;base64,${oversizedPayload}`,
      },
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(400);
    expect(body.error_code).toBe('INVALID_IMAGE');

    await app.close();
  });
});
