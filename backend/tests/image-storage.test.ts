import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { saveImage } from '../src/modules/reading/image-storage.js';
import type { ParsedImage } from '../src/modules/reading/image-validation.js';

describe('saveImage', () => {
  const createdDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdDirectories.map((directory) =>
        rm(directory, {
          recursive: true,
          force: true,
        }),
      ),
    );

    createdDirectories.length = 0;
  });

  it('stores the image using the reading UUID as the file name', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'equipment-meter-reader-'));

    createdDirectories.push(directory);

    const image: ParsedImage = {
      mimeType: 'image/jpeg',
      extension: 'jpg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    };

    const readingUuid = '550e8400-e29b-41d4-a716-446655440000';

    const result = await saveImage({
      uploadsDirectory: directory,
      readingUuid,
      image,
    });

    expect(result.fileName).toBe(`${readingUuid}.jpg`);
    expect(result.imageUrl).toBe(`/uploads/${readingUuid}.jpg`);

    const storedImage = await readFile(result.filePath);

    expect(storedImage).toEqual(image.buffer);
  });
});
