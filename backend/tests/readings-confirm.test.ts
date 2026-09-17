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

interface SuccessResponse {
  success: boolean;
}

interface ErrorResponse {
  error_code: string;
  error_description: string;
}

class FakeReadingRepository implements ReadingRepository {
  reading: ReadingConfirmationReference | null = {
    id: 10,
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    confirmed: false,
  };

  confirmResult = true;
  confirmedReadings: Array<{ id: number; confirmedValue: number }> = [];

  findEquipmentByCode(code: string): Promise<EquipmentReference | null> {
    void code;

    return Promise.resolve(null);
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
    if (this.reading?.uuid === uuid) {
      return Promise.resolve(this.reading);
    }

    return Promise.resolve(null);
  }

  confirmIfPending(id: number, confirmedValue: number): Promise<boolean> {
    this.confirmedReadings.push({ id, confirmedValue });

    return Promise.resolve(this.confirmResult);
  }

  listByEquipment(equipmentId: number, measureType?: MeasureType): Promise<ReadingHistoryRecord[]> {
    void equipmentId;
    void measureType;

    return Promise.resolve([]);
  }
}

class FakeMeterReader implements MeterReader {
  calls = 0;

  read(input: MeterReaderInput): Promise<number> {
    void input;

    this.calls += 1;

    return Promise.resolve(5487);
  }
}

describe('PATCH /readings/:uuid/confirm', () => {
  let uploadsDirectory: string;
  let repository: FakeReadingRepository;
  let meterReader: FakeMeterReader;

  beforeEach(async () => {
    uploadsDirectory = await mkdtemp(join(tmpdir(), 'equipment-meter-reader-confirm-'));
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

  it('confirms a reading', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/readings/550e8400-e29b-41d4-a716-446655440000/confirm',
      payload: {
        confirmed_value: 5487,
      },
    });

    const body = response.json<SuccessResponse>();

    expect(response.statusCode).toBe(200);
    expect(body).toEqual({ success: true });
    expect(repository.confirmedReadings).toEqual([
      {
        id: 10,
        confirmedValue: 5487,
      },
    ]);
    expect(meterReader.calls).toBe(0);

    await app.close();
  });

  it('allows correcting the detected value during confirmation', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/readings/550e8400-e29b-41d4-a716-446655440000/confirm',
      payload: {
        confirmed_value: 5499,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(repository.confirmedReadings[0]?.confirmedValue).toBe(5499);
    expect(meterReader.calls).toBe(0);

    await app.close();
  });

  it('rejects an invalid UUID', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/readings/not-a-uuid/confirm',
      payload: {
        confirmed_value: 5487,
      },
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(400);
    expect(body.error_code).toBe('INVALID_DATA');
    expect(repository.confirmedReadings).toHaveLength(0);
    expect(meterReader.calls).toBe(0);

    await app.close();
  });

  it('returns 404 when the reading does not exist', async () => {
    repository.reading = null;
    const app = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/readings/550e8400-e29b-41d4-a716-446655440000/confirm',
      payload: {
        confirmed_value: 5487,
      },
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(404);
    expect(body.error_code).toBe('READING_NOT_FOUND');
    expect(meterReader.calls).toBe(0);

    await app.close();
  });

  it('rejects an invalid confirmation value', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/readings/550e8400-e29b-41d4-a716-446655440000/confirm',
      payload: {
        confirmed_value: -1,
      },
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(400);
    expect(body.error_code).toBe('INVALID_DATA');
    expect(repository.confirmedReadings).toHaveLength(0);
    expect(meterReader.calls).toBe(0);

    await app.close();
  });

  it('rejects duplicate confirmation without calling the meter reader', async () => {
    repository.reading = {
      id: 10,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      confirmed: true,
    };

    const app = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/readings/550e8400-e29b-41d4-a716-446655440000/confirm',
      payload: {
        confirmed_value: 5487,
      },
    });

    const body = response.json<ErrorResponse>();

    expect(response.statusCode).toBe(409);
    expect(body.error_code).toBe('CONFIRMATION_DUPLICATE');
    expect(repository.confirmedReadings).toHaveLength(0);
    expect(meterReader.calls).toBe(0);

    await app.close();
  });
});
