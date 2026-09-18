import type { ParsedImage } from './image-validation.js';

export interface MeterReaderInput {
  image: ParsedImage;
  measureType: 'HOURMETER' | 'ODOMETER';
}

export interface MeterReader {
  read(input: MeterReaderInput): Promise<number>;
}
