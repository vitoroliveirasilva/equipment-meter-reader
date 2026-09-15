import { describe, expect, it } from 'vitest';

import { MAX_IMAGE_SIZE_BYTES, parseBase64Image } from '../src/modules/reading/image-validation.js';

describe('parseBase64Image', () => {
  it('parses a valid JPEG image', () => {
    const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const base64 = imageBytes.toString('base64');

    const result = parseBase64Image(`data:image/jpeg;base64,${base64}`);

    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
    expect(result.buffer).toEqual(imageBytes);
  });

  it('rejects invalid Base64 data', () => {
    expect(() => parseBase64Image('data:image/jpeg;base64,not@@base64')).toThrowError();
  });

  it('rejects unsupported MIME types', () => {
    const base64 = Buffer.from('fake-image').toString('base64');

    expect(() => parseBase64Image(`data:image/gif;base64,${base64}`)).toThrowError();
  });

  it('rejects images larger than the allowed limit', () => {
    const oversizedImage = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1);
    const base64 = oversizedImage.toString('base64');

    expect(() => parseBase64Image(`data:image/jpeg;base64,${base64}`)).toThrowError();
  });
});
