import { AppError } from '../../shared/errors/app-error.js';

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const;

type AllowedImageMimeType = keyof typeof ALLOWED_IMAGE_TYPES;
type ImageExtension = (typeof ALLOWED_IMAGE_TYPES)[AllowedImageMimeType];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export interface ParsedImage {
  mimeType: AllowedImageMimeType;
  extension: ImageExtension;
  buffer: Buffer;
}

const dataUrlPattern = /^data:([^;,]+);base64,(.+)$/;

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function parseBase64Image(image: string): ParsedImage {
  const match = dataUrlPattern.exec(image);

  if (!match) {
    throw new AppError(400, 'INVALID_IMAGE', 'Image must be a valid Base64 data URL');
  }

  const [, mimeType, base64] = match;

  if (!mimeType || !(mimeType in ALLOWED_IMAGE_TYPES)) {
    throw new AppError(400, 'INVALID_IMAGE', 'Image MIME type is not allowed');
  }

  if (!base64 || !base64Pattern.test(base64)) {
    throw new AppError(400, 'INVALID_IMAGE', 'Image contains invalid Base64 data');
  }

  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length === 0) {
    throw new AppError(400, 'INVALID_IMAGE', 'Image must not be empty');
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError(400, 'INVALID_IMAGE', 'Image exceeds the maximum allowed size');
  }

  const allowedMimeType = mimeType as AllowedImageMimeType;

  return {
    mimeType: allowedMimeType,
    extension: ALLOWED_IMAGE_TYPES[allowedMimeType],
    buffer,
  };
}
