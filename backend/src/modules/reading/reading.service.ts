import { randomUUID } from 'node:crypto';

import type { MeterReader } from './meter-reader.js';
import { removeImage, saveImage } from './image-storage.js';
import { parseBase64Image } from './image-validation.js';
import type { MeasureType, ReadingRepository } from './reading.repository.js';
import type { CreateReadingInput } from './reading.schema.js';
import { AppError } from '../../shared/errors/app-error.js';

export interface CreateReadingResult {
  readingUuid: string;
  detectedValue: number;
  imageUrl: string;
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
}

function getMeasureDate(measureDatetime: string): Date {
  const calendarDate = measureDatetime.slice(0, 10);

  return new Date(`${calendarDate}T00:00:00.000Z`);
}
