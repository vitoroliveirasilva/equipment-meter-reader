import { GoogleGenAI } from '@google/genai';

import type { MeterReader, MeterReaderInput } from '../../modules/reading/meter-reader.js';
import { AppError } from '../../shared/errors/app-error.js';
import { parseGeminiMeterResponse } from './gemini-response.js';

const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_TIMEOUT_MS = 10_000;

export class GeminiMeterReader implements MeterReader {
  private readonly client: GoogleGenAI | null;

  constructor(apiKey?: string) {
    this.client = apiKey
      ? new GoogleGenAI({
          apiKey,
        })
      : null;
  }

  async read(input: MeterReaderInput): Promise<number> {
    if (!this.client) {
      throw new AppError(502, 'AI_PROCESSING_ERROR', 'Gemini API key is not configured');
    }

    try {
      const response = await this.client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            text: buildPrompt(input.measureType),
          },
          {
            inlineData: {
              mimeType: input.image.mimeType,
              data: input.image.buffer.toString('base64'),
            },
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              value: {
                type: 'integer',
                minimum: 0,
              },
            },
            required: ['value'],
            additionalProperties: false,
          },
          httpOptions: {
            timeout: GEMINI_TIMEOUT_MS,
          },
        },
      });

      if (!response.text) {
        throw new AppError(502, 'AI_PROCESSING_ERROR', 'AI did not return a meter value');
      }

      return parseGeminiMeterResponse(response.text);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(502, 'AI_PROCESSING_ERROR', 'Unable to process the equipment image');
    }
  }
}

function buildPrompt(measureType: MeterReaderInput['measureType']): string {
  const meterName = measureType === 'HOURMETER' ? 'hourmeter' : 'odometer';

  return [
    `Read the ${meterName} shown on this equipment panel.`,
    'Return only the numeric value displayed by the meter.',
    'Do not infer or estimate a value that is not clearly visible.',
    'Return the result as JSON in this exact format: {"value": 123}.',
  ].join(' ');
}
