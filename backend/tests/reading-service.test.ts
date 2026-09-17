import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

class FakeReadingRepository implements ReadingRepository {
  equipment: EquipmentReference | null = {
    id: 1,
    code: 'EMP-001',
  };

  duplicate = false;
  reading: ReadingConfirmationReference | null = null;
  confirmResult = true;

  createdReadings: CreateReadingRecord[] = [];
  confirmedReadings: Array<{ id: number; confirmedValue: number }> = [];
  readings: ReadingHistoryRecord[] = [];
  lastListMeasureType: MeasureType | undefined;

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

    this.lastListMeasureType = measureType;

    if (!measureType) {
      return Promise.resolve(this.readings);
    }

    return Promise.resolve(this.readings.filter((reading) => reading.measureType === measureType));
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
    expect(repository.createdReadings[0]?.imagePath).toBe(
      join(uploadsDirectory, `${result.readingUuid}.jpg`),
    );
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

  it('confirms a reading using the provided value without calling the meter reader', async () => {
    const repository = new FakeReadingRepository();
    repository.reading = {
      id: 10,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      confirmed: false,
    };

    const meterReader = new FakeMeterReader();
    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await service.confirm(repository.reading.uuid, 5489);

    expect(repository.confirmedReadings).toEqual([
      {
        id: 10,
        confirmedValue: 5489,
      },
    ]);
    expect(meterReader.calls).toBe(0);
  });

  it('allows confirming a corrected value', async () => {
    const repository = new FakeReadingRepository();
    repository.reading = {
      id: 10,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      confirmed: false,
    };

    const meterReader = new FakeMeterReader(5487);
    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await service.confirm(repository.reading.uuid, 5499);

    expect(repository.confirmedReadings[0]?.confirmedValue).toBe(5499);
    expect(meterReader.calls).toBe(0);
  });

  it('rejects confirmation when the reading does not exist', async () => {
    const repository = new FakeReadingRepository();
    const meterReader = new FakeMeterReader();
    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await expect(
      service.confirm('550e8400-e29b-41d4-a716-446655440000', 5489),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'READING_NOT_FOUND',
    });

    expect(repository.confirmedReadings).toHaveLength(0);
    expect(meterReader.calls).toBe(0);
  });

  it('rejects an already confirmed reading', async () => {
    const repository = new FakeReadingRepository();
    repository.reading = {
      id: 10,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      confirmed: true,
    };

    const meterReader = new FakeMeterReader();
    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await expect(service.confirm(repository.reading.uuid, 5489)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CONFIRMATION_DUPLICATE',
    });

    expect(repository.confirmedReadings).toHaveLength(0);
    expect(meterReader.calls).toBe(0);
  });

  it('rejects a concurrent duplicate confirmation', async () => {
    const repository = new FakeReadingRepository();
    repository.reading = {
      id: 10,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      confirmed: false,
    };
    repository.confirmResult = false;

    const meterReader = new FakeMeterReader();
    const service = new ReadingService(repository, meterReader, uploadsDirectory);

    await expect(service.confirm(repository.reading.uuid, 5489)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CONFIRMATION_DUPLICATE',
    });

    expect(meterReader.calls).toBe(0);
  });

  it('lists the readings of an equipment', async () => {
    const repository = new FakeReadingRepository();
    repository.readings = [
      {
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        measureDatetime: new Date('2026-09-15T10:00:00.000Z'),
        measureType: 'HOURMETER',
        detectedValue: 5487,
        confirmedValue: 5489,
        confirmed: true,
        imagePath: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
      },
    ];

    const service = new ReadingService(repository, new FakeMeterReader(), uploadsDirectory);

    const result = await service.listByEquipmentCode('EMP-001');

    expect(result).toEqual({
      equipmentCode: 'EMP-001',
      readings: [
        {
          readingUuid: '550e8400-e29b-41d4-a716-446655440000',
          measureDatetime: '2026-09-15T10:00:00.000Z',
          measureType: 'HOURMETER',
          detectedValue: 5487,
          confirmedValue: 5489,
          confirmed: true,
          imageUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
        },
      ],
    });
  });

  it('passes the optional measure type filter to the repository', async () => {
    const repository = new FakeReadingRepository();
    repository.readings = [
      {
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        measureDatetime: new Date('2026-09-15T10:00:00.000Z'),
        measureType: 'ODOMETER',
        detectedValue: 12345,
        confirmedValue: null,
        confirmed: false,
        imagePath: '../uploads/550e8400-e29b-41d4-a716-446655440000.png',
      },
    ];

    const service = new ReadingService(repository, new FakeMeterReader(), uploadsDirectory);

    const result = await service.listByEquipmentCode('EMP-001', 'ODOMETER');

    expect(repository.lastListMeasureType).toBe('ODOMETER');
    expect(result.readings[0]?.imageUrl).toBe('/uploads/550e8400-e29b-41d4-a716-446655440000.png');
  });

  it('rejects listing when the equipment does not exist', async () => {
    const repository = new FakeReadingRepository();
    repository.equipment = null;

    const service = new ReadingService(repository, new FakeMeterReader(), uploadsDirectory);

    await expect(service.listByEquipmentCode('EMP-404')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'EQUIPMENT_NOT_FOUND',
    });
  });

  it('rejects listing when the equipment has no readings', async () => {
    const repository = new FakeReadingRepository();
    const service = new ReadingService(repository, new FakeMeterReader(), uploadsDirectory);

    await expect(service.listByEquipmentCode('EMP-001')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'READINGS_NOT_FOUND',
    });
  });
});
