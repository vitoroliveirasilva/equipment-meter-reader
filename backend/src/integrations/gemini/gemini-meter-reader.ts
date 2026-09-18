import { GoogleGenAI, ThinkingLevel } from '@google/genai';

import type { MeterReader, MeterReaderInput } from '../../modules/reading/meter-reader.js';
import { AppError } from '../../shared/errors/app-error.js';
import { parseGeminiMeterResponse } from './gemini-response.js';

interface GeminiMeterReaderOptions {
  apiKey: string | undefined;
  model: string;
  timeoutMs: number;
}

export class GeminiMeterReader implements MeterReader {
  private readonly client: GoogleGenAI | null;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiMeterReaderOptions) {
    this.client = options.apiKey
      ? new GoogleGenAI({
          apiKey: options.apiKey,
        })
      : null;

    this.model = options.model;
    this.timeoutMs = options.timeoutMs;
  }

  async read(input: MeterReaderInput): Promise<number> {
    if (!this.client) {
      throw new AppError(502, 'AI_PROCESSING_ERROR', 'Gemini API key is not configured');
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
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
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
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
            timeout: this.timeoutMs,
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

      if (error instanceof Error) {
        const status =
          'status' in error ? (error as Error & { status?: number }).status : undefined;

        console.error('Gemini request failed', {
          name: error.name,
          message: error.message,
          status,
        });
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
