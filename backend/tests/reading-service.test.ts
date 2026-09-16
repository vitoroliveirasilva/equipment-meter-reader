import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { MeterReader, MeterReaderInput } from '../src/modules/reading/meter-reader.js';
import type {
  CreateReadingRecord,
  EquipmentReference,
  MeasureType,
  ReadingRepository,
} from '../src/modules/reading/reading.repository.js';
import { ReadingService } from '../src/modules/reading/reading.service.js';

class FakeReadingRepository implements ReadingRepository {
  equipment: EquipmentReference | null = {
    id: 1,
    code: 'EMP-001',
  };

  duplicate = false;

  createdReadings: CreateReadingRecord[] = [];

  findEquipmentByCode(code: string): Promise<EquipmentReference | null> {
    if (this.equipment?.code === code) {
      return Promise.resolve(this.equipment);
    }

    return Promise.resolve(null);
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
}

class FakeMeterReader implements MeterReader {
  calls = 0;

  constructor(
    private readonly value = 5487,
    private readonly failure?: Error,
  ) {}

  read(input: MeterReaderInput): Promise<number> {
    void input;

    this.calls += 1;

    if (this.failure) {
      return Promise.reject(this.failure);
    }

    return Promise.resolve(this.value);
  }
}

describe('ReadingService', () => {
  let uploadsDirectory: string;

  beforeEach(async () => {
    uploadsDirectory = await mkdtemp(join(tmpdir(), 'equipment-meter-reader-'));
  });

  afterEach(async () => {
    await rm(uploadsDirectory, {
      recursive: true,
      force: true,
    });
  });

  const validInput = {
    image: `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64')}`,
    equipment_code: 'EMP-001',
    measure_datetime: '2026-09-15T10:00:00.000Z',
    measure_type: 'HOURMETER' as const,
  };

  it('creates a reading using the detected meter value', async () => {
    const repository = new FakeReadingRepository();
    const meterReader = new FakeMeterReader(5487);

    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    const result = await service.create(validInput);

    expect(result.detectedValue).toBe(5487);
    expect(result.readingUuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(repository.createdReadings).toHaveLength(1);
    expect(repository.createdReadings[0]?.detectedValue).toBe(5487);
    expect(meterReader.calls).toBe(1);

    const files = await readdir(uploadsDirectory);

    expect(files).toHaveLength(1);
    expect(files[0]).toBe(`${result.readingUuid}.jpg`);
  });

  it('rejects an unknown equipment', async () => {
    const repository = new FakeReadingRepository();
    repository.equipment = null;

    const meterReader = new FakeMeterReader();

    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await expect(service.create(validInput)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'EQUIPMENT_NOT_FOUND',
    });

    expect(meterReader.calls).toBe(0);
    expect(repository.createdReadings).toHaveLength(0);
  });

  it('rejects a duplicate reading before calling the meter reader', async () => {
    const repository = new FakeReadingRepository();
    repository.duplicate = true;

    const meterReader = new FakeMeterReader();

    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await expect(service.create(validInput)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'READING_DUPLICATE',
    });

    expect(meterReader.calls).toBe(0);
    expect(repository.createdReadings).toHaveLength(0);
  });

  it('removes the stored image when meter reading fails', async () => {
    const repository = new FakeReadingRepository();

    const meterReader = new FakeMeterReader(5487, new Error('AI failure'));

    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await expect(service.create(validInput)).rejects.toThrow('AI failure');

    const files = await readdir(uploadsDirectory);

    expect(files).toHaveLength(0);
    expect(repository.createdReadings).toHaveLength(0);
  });
});
