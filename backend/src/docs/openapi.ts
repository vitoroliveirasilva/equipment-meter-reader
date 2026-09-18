export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Equipment Meter Reader API',
    version: '1.0.0',
    description:
      'API for extracting hourmeter and odometer readings from equipment panel images, confirming detected values and consulting reading history',
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Application health',
    },
    {
      name: 'Readings',
      description: 'Meter reading extraction and confirmation',
    },
    {
      name: 'Equipment',
      description: 'Reading history by equipment',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check application health',
        responses: {
          '200': {
            description: 'Application is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['ok'],
                    },
                  },
                },
                example: {
                  status: 'ok',
                },
              },
            },
          },
        },
      },
    },
    '/readings': {
      post: {
        tags: ['Readings'],
        summary: 'Create a meter reading from an equipment panel image',
        description:
          'Accepts a JPEG or PNG image encoded as a Base64 data URL, validates duplicate readings, sends the panel image to Gemini and persists the detected value',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateReadingRequest',
              },
              example: {
                image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
                equipment_code: 'EMP-001',
                measure_datetime: '2026-09-18T11:00:00.000Z',
                measure_type: 'HOURMETER',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Reading created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateReadingResponse',
                },
                example: {
                  reading_uuid: '550e8400-e29b-41d4-a716-446655440000',
                  detected_value: 5487,
                  image_url: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
                },
              },
            },
          },
          '400': {
            description: 'Invalid request data or image',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  invalidData: {
                    value: {
                      error_code: 'INVALID_DATA',
                      error_description: 'measure_datetime: Invalid ISO datetime',
                    },
                  },
                  invalidImage: {
                    value: {
                      error_code: 'INVALID_IMAGE',
                      error_description: 'Image MIME type is not allowed',
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Equipment not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error_code: 'EQUIPMENT_NOT_FOUND',
                  error_description: 'Equipment was not found',
                },
              },
            },
          },
          '409': {
            description: 'A reading of the same type already exists for the equipment on that day',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error_code: 'READING_DUPLICATE',
                  error_description:
                    'A reading of this type already exists for this equipment on this day',
                },
              },
            },
          },
          '502': {
            description: 'Gemini could not process the image',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error_code: 'AI_PROCESSING_ERROR',
                  error_description: 'Unable to process the equipment image',
                },
              },
            },
          },
        },
      },
    },
    '/readings/{uuid}/confirm': {
      patch: {
        tags: ['Readings'],
        summary: 'Confirm or correct a detected reading value',
        parameters: [
          {
            name: 'uuid',
            in: 'path',
            required: true,
            description: 'Reading UUID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ConfirmReadingRequest',
              },
              example: {
                confirmed_value: 5489,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reading confirmed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success'],
                  properties: {
                    success: {
                      type: 'boolean',
                      const: true,
                    },
                  },
                },
                example: {
                  success: true,
                },
              },
            },
          },
          '400': {
            description: 'Invalid UUID or confirmed value',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error_code: 'INVALID_DATA',
                  error_description: 'confirmed_value: Too small: expected number to be >=0',
                },
              },
            },
          },
          '404': {
            description: 'Reading not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error_code: 'READING_NOT_FOUND',
                  error_description: 'Reading was not found',
                },
              },
            },
          },
          '409': {
            description: 'Reading has already been confirmed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error_code: 'CONFIRMATION_DUPLICATE',
                  error_description: 'Reading has already been confirmed',
                },
              },
            },
          },
        },
      },
    },
    '/equipment/{code}/readings': {
      get: {
        tags: ['Equipment'],
        summary: 'List readings for an equipment',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            description: 'Equipment code',
            schema: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
            },
            example: 'EMP-001',
          },
          {
            name: 'measure_type',
            in: 'query',
            required: false,
            description: 'Optional case-insensitive reading type filter',
            schema: {
              type: 'string',
            },
            example: 'odometer',
          },
        ],
        responses: {
          '200': {
            description: 'Reading history',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ReadingHistoryResponse',
                },
                example: {
                  equipment_code: 'EMP-001',
                  readings: [
                    {
                      reading_uuid: '550e8400-e29b-41d4-a716-446655440000',
                      measure_datetime: '2026-09-18T11:00:00.000Z',
                      measure_type: 'ODOMETER',
                      detected_value: 234568,
                      confirmed_value: 234569,
                      confirmed: true,
                      image_url: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
                    },
                  ],
                },
              },
            },
          },
          '400': {
            description: 'Invalid equipment code or measure type filter',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error_code: 'INVALID_MEASURE_TYPE',
                  error_description: 'Invalid option: expected one of "HOURMETER"|"ODOMETER"',
                },
              },
            },
          },
          '404': {
            description: 'Equipment or readings not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  equipmentNotFound: {
                    value: {
                      error_code: 'EQUIPMENT_NOT_FOUND',
                      error_description: 'Equipment was not found',
                    },
                  },
                  readingsNotFound: {
                    value: {
                      error_code: 'READINGS_NOT_FOUND',
                      error_description: 'No readings were found for this equipment',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      MeasureType: {
        type: 'string',
        enum: ['HOURMETER', 'ODOMETER'],
      },
      CreateReadingRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['image', 'equipment_code', 'measure_datetime', 'measure_type'],
        properties: {
          image: {
            type: 'string',
            description:
              'JPEG or PNG image encoded as a Base64 data URL, maximum decoded size 5 MiB',
            pattern: '^data:image\\/(jpeg|png);base64,',
          },
          equipment_code: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
          },
          measure_datetime: {
            type: 'string',
            format: 'date-time',
          },
          measure_type: {
            $ref: '#/components/schemas/MeasureType',
          },
        },
      },
      CreateReadingResponse: {
        type: 'object',
        required: ['reading_uuid', 'detected_value', 'image_url'],
        properties: {
          reading_uuid: {
            type: 'string',
            format: 'uuid',
          },
          detected_value: {
            type: 'integer',
            minimum: 0,
          },
          image_url: {
            type: 'string',
          },
        },
      },
      ConfirmReadingRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['confirmed_value'],
        properties: {
          confirmed_value: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
      ReadingHistoryItem: {
        type: 'object',
        required: [
          'reading_uuid',
          'measure_datetime',
          'measure_type',
          'detected_value',
          'confirmed_value',
          'confirmed',
          'image_url',
        ],
        properties: {
          reading_uuid: {
            type: 'string',
            format: 'uuid',
          },
          measure_datetime: {
            type: 'string',
            format: 'date-time',
          },
          measure_type: {
            $ref: '#/components/schemas/MeasureType',
          },
          detected_value: {
            type: 'integer',
            minimum: 0,
          },
          confirmed_value: {
            type: ['integer', 'null'],
            minimum: 0,
          },
          confirmed: {
            type: 'boolean',
          },
          image_url: {
            type: 'string',
          },
        },
      },
      ReadingHistoryResponse: {
        type: 'object',
        required: ['equipment_code', 'readings'],
        properties: {
          equipment_code: {
            type: 'string',
          },
          readings: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ReadingHistoryItem',
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error_code', 'error_description'],
        properties: {
          error_code: {
            type: 'string',
          },
          error_description: {
            type: 'string',
          },
        },
      },
    },
  },
} as const;
