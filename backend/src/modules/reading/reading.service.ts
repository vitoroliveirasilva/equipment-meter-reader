import { randomUUID } from 'node:crypto';

import { AppError } from '../../shared/errors/app-error.js';
import { removeImage, saveImage } from './image-storage.js';
import { parseBase64Image } from './image-validation.js';
import type { MeterReader } from './meter-reader.js';
import type { MeasureType, ReadingRepository } from './reading.repository.js';
import type { CreateReadingInput } from './reading.schema.js';

export interface CreateReadingResult {
  readingUuid: string;
  detectedValue: number;
  imageUrl: string;
}

export interface ReadingHistoryItem {
  readingUuid: string;
  measureDatetime: string;
  measureType: MeasureType;
  detectedValue: number;
  confirmedValue: number | null;
  confirmed: boolean;
  imageUrl: string;
}

export interface ListReadingsResult {
  equipmentCode: string;
  readings: ReadingHistoryItem[];
}

export class ReadingService {
  constructor(
    private readonly repository: ReadingRepository,
    private readonly meterReader: MeterReader,
    private readonly uploadsDirectory: string,
  ) {}

  async create(input: CreateReadingInput): Promise<CreateReadingResult> {
    const image = parseBase64Image(input.image);

    const equipment = await this.repository.findEquipmentByCode(input.equipment_code);

    if (!equipment) {
      throw new AppError(404, 'EQUIPMENT_NOT_FOUND', 'Equipment was not found');
    }

    const measureType: MeasureType = input.measure_type;

    const measureDatetime = new Date(input.measure_datetime);
    const measureDate = getMeasureDate(input.measure_datetime);

    const duplicate = await this.repository.existsForDay(equipment.id, measureType, measureDate);

    if (duplicate) {
      throw new AppError(
        409,
        'READING_DUPLICATE',
        'A reading of this type already exists for this equipment on this day',
      );
    }

    const readingUuid = randomUUID();

    const savedImage = await saveImage({
      uploadsDirectory: this.uploadsDirectory,
      readingUuid,
      image,
    });

    try {
      const detectedValue = await this.meterReader.read({
        image,
        measureType,
      });

      await this.repository.create({
        uuid: readingUuid,
        equipmentId: equipment.id,
        measureType,
        measureDatetime,
        measureDate,
        detectedValue,
        imagePath: savedImage.filePath,
      });

      return {
        readingUuid,
        detectedValue,
        imageUrl: savedImage.imageUrl,
      };
    } catch (error) {
      await removeImage(savedImage.filePath);

      throw error;
    }
  }

  async confirm(readingUuid: string, confirmedValue: number): Promise<void> {
    const reading = await this.repository.findByUuid(readingUuid);

    if (!reading) {
      throw new AppError(404, 'READING_NOT_FOUND', 'Reading was not found');
    }

    if (reading.confirmed) {
      throw new AppError(409, 'CONFIRMATION_DUPLICATE', 'Reading has already been confirmed');
    }

    const confirmed = await this.repository.confirmIfPending(reading.id, confirmedValue);

    if (!confirmed) {
      throw new AppError(409, 'CONFIRMATION_DUPLICATE', 'Reading has already been confirmed');
    }
  }

  async listByEquipmentCode(
    equipmentCode: string,
    measureType?: MeasureType,
  ): Promise<ListReadingsResult> {
    const equipment = await this.repository.findEquipmentByCode(equipmentCode);

    if (!equipment) {
      throw new AppError(404, 'EQUIPMENT_NOT_FOUND', 'Equipment was not found');
    }

    const readings = await this.repository.listByEquipment(equipment.id, measureType);

    if (readings.length === 0) {
      throw new AppError(404, 'READINGS_NOT_FOUND', 'No readings were found for this equipment');
    }

    return {
      equipmentCode: equipment.code,
      readings: readings.map((reading) => ({
        readingUuid: reading.uuid,
        measureDatetime: reading.measureDatetime.toISOString(),
        measureType: reading.measureType,
        detectedValue: reading.detectedValue,
        confirmedValue: reading.confirmedValue,
        confirmed: reading.confirmed,
        imageUrl: toImageUrl(reading.imagePath),
      })),
    };
  }
}

function getMeasureDate(measureDatetime: string): Date {
  const calendarDate = measureDatetime.slice(0, 10);

  return new Date(`${calendarDate}T00:00:00.000Z`);
}

function toImageUrl(imagePath: string): string {
  const normalizedPath = imagePath.replaceAll('\\', '/');

  if (normalizedPath.startsWith('/uploads/')) {
    return normalizedPath;
  }

  const fileName = normalizedPath.split('/').at(-1);

  return `/uploads/${fileName ?? normalizedPath}`;
}
