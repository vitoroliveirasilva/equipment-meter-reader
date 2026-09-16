import { Prisma, type PrismaClient } from '@prisma/client';

import { AppError } from '../../shared/errors/app-error.js';

export type MeasureType = 'HOURMETER' | 'ODOMETER';

export interface EquipmentReference {
  id: number;
  code: string;
}

export interface CreateReadingRecord {
  uuid: string;
  equipmentId: number;
  measureType: MeasureType;
  measureDatetime: Date;
  measureDate: Date;
  detectedValue: number;
  imagePath: string;
}

export interface ReadingRepository {
  findEquipmentByCode(code: string): Promise<EquipmentReference | null>;

  existsForDay(equipmentId: number, measureType: MeasureType, measureDate: Date): Promise<boolean>;

  create(data: CreateReadingRecord): Promise<void>;
}

export class PrismaReadingRepository implements ReadingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findEquipmentByCode(code: string): Promise<EquipmentReference | null> {
    return this.prisma.equipment.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
        code: true,
      },
    });
  }

  async existsForDay(
    equipmentId: number,
    measureType: MeasureType,
    measureDate: Date,
  ): Promise<boolean> {
    const reading = await this.prisma.reading.findFirst({
      where: {
        equipmentId,
        measureType,
        measureDate,
      },
      select: {
        id: true,
      },
    });

    return reading !== null;
  }

  async create(data: CreateReadingRecord): Promise<void> {
    try {
      await this.prisma.reading.create({
        data: {
          uuid: data.uuid,
          equipmentId: data.equipmentId,
          measureType: data.measureType,
          measureDatetime: data.measureDatetime,
          measureDate: data.measureDate,
          detectedValue: data.detectedValue,
          confirmedValue: null,
          confirmed: false,
          imagePath: data.imagePath,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'READING_DUPLICATE',
          'A reading of this type already exists for this equipment on this day',
        );
      }

      throw error;
    }
  }
}
