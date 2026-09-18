import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ParsedImage } from './image-validation.js';

interface SaveImageInput {
  uploadsDirectory: string;
  readingUuid: string;
  image: ParsedImage;
}

export interface SavedImage {
  fileName: string;
  filePath: string;
  imageUrl: string;
}

export async function saveImage({
  uploadsDirectory,
  readingUuid,
  image,
}: SaveImageInput): Promise<SavedImage> {
  await mkdir(uploadsDirectory, {
    recursive: true,
  });

  const fileName = `${readingUuid}.${image.extension}`;
  const filePath = join(uploadsDirectory, fileName);

  await writeFile(filePath, image.buffer);

  return {
    fileName,
    filePath,
    imageUrl: `/uploads/${fileName}`,
  };
}

export async function removeImage(filePath: string): Promise<void> {
  await rm(filePath, {
    force: true,
  });
}
