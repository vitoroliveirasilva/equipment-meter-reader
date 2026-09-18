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

interface ListReadingsResponse {
  equipment_code: string;
  readings: Array<{
    reading_uuid: string;
    measure_datetime: string;
    measure_type: MeasureType;
    detected_value: number;
    confirmed_value: number | null;
    confirmed: boolean;
    image_url: string;
  }>;
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

  readings: ReadingHistoryRecord[] = [
    {
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      measureDatetime: new Date('2026-09-15T10:00:00.000Z'),
      measureType: 'HOURMETER',
      detectedValue: 5487,
      confirmedValue: 5489,
      confirmed: true,
      imagePath: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
    },
    {
      uuid: '550e8400-e29b-41d4-a716-446655440001',
      measureDatetime: new Date('2026-09-14T10:00:00.000Z'),
      measureType: 'ODOMETER',
      detectedValue: 12345,
      confirmedValue: null,
      confirmed: false,
      imagePath: '/uploads/550e8400-e29b-41d4-a716-446655440001.jpg',
    },
  ];

  findEquipmentByCode(code: string): Promise<EquipmentReference | null> {
    return Promise.resolve(this.equipment?.code === code ? this.equipment : null);
  }

  existsForDay(equipmentId: number, measureType: MeasureType, measureDate: Date): Promise<boolean> {
    void equipmentId;
    void measureType;
    void measureDate;

    return Promise.resolve(false);
  }

  create(data: CreateReadingRecord): Promise<void> {
    void data;

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

    if (!measureType) {
      return Promise.resolve(this.readings);
    }

    return Promise.resolve(this.readings.filter((reading) => reading.measureType === measureType));
  }
}

class FakeMeterReader implements MeterReader {
  read(input: MeterReaderInput): Promise<number> {
    void input;

    return Promise.resolve(5487);
  }
}

describe('GET /equipment/:code/readings', () => {
  let uploadsDirectory: string;
  let repository: FakeReadingRepository;

  beforeEach(async () => {
    uploadsDirectory = await mkdtemp(join(tmpdir(), 'equipment-meter-reader-list-'));
    repository = new FakeReadingRepository();
  });

  afterEach(async () => {
    await rm(uploadsDirectory, {
      recursive: true,
      force: true,
    });
  });

  function createApp() {
    const readingService = new ReadingService(repository, new FakeMeterReader(), uploadsDirectory);

    return buildApp({
      readingService,
    });
  }

  it('lists all readings of an equipment', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/equipment/EMP-001/readings',
    });

    const body = response.json<ListReadingsResponse>();

    expect(response.statusCode).toBe(200);
    expect(body.equipment_code).toBe('EMP-001');
    expect(body.readings).toHaveLength(2);
    expect(body.readings[0]).toEqual({
      reading_uuid: '550e8400-e29b-41d4-a716-446655440000',
      measure_datetime: '2026-09-15T10:00:00.000Z',
      measure_type: 'HOURMETER',
      detected_value: 5487,
      confirmed_value: 5489,
      confirmed: true,
      image_url: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
    });

    await app.close();
  });

  it('filters HOURMETER readings', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/equipment/EMP-001/readings?measure_type=HOURMETER',
    });

    const body = response.json<ListReadingsResponse>();

    expect(response.statusCode).toBe(200);
    expect(body.readings).toHaveLength(1);
    expect(body.readings[0]?.measure_type).toBe('HOURMETER');

    await app.close();
  });

  it('filters ODOMETER readings', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/equipment/EMP-001/readings?measure_type=ODOMETER',
    });

    const body = response.json<ListReadingsResponse>();

    expect(response.statusCode).toBe(200);
    expect(body.readings).toHaveLength(1);
    expect(body.readings[0]?.measure_type).toBe('ODOMETER');

    await app.close();
  });

  it('accepts a case-insensitive measure type filter', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/equipment/EMP-001/readings?measure_type=HourMeter',
    });

    const body = response.json<ListReadingsResponse>();

    expect(response.statusCode).toBe(200);
    expect(body.readings).toHaveLength(1);
    expect(body.readings[0]?.measure_type).toBe('HOURMETER');

    await app.close();
  });

  it('rejects an invalid measure type filter', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/equipment/EMP-001/readings?measure_type=TEMPERATURE',
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(400);
    expect(body.error_code).toBe('INVALID_MEASURE_TYPE');

    await app.close();
  });

  it('returns 404 when the equipment does not exist', async () => {
    repository.equipment = null;
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/equipment/EMP-404/readings',
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(404);
    expect(body.error_code).toBe('EQUIPMENT_NOT_FOUND');

    await app.close();
  });

  it('returns 404 when the equipment has no readings', async () => {
    repository.readings = [];
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/equipment/EMP-001/readings',
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(404);
    expect(body.error_code).toBe('READINGS_NOT_FOUND');

    await app.close();
  });
});
