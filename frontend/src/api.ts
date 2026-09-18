import type {
  ApiErrorResponse,
  CreateReadingRequest,
  CreateReadingResponse,
  MeasureType,
  ReadingHistoryResponse,
} from './types';

const API_PREFIX = '/api';

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function createReading(payload: CreateReadingRequest): Promise<CreateReadingResponse> {
  return request<CreateReadingResponse>('/readings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function confirmReading(readingUuid: string, confirmedValue: number): Promise<void> {
  await request<{ success: boolean }>(`/readings/${readingUuid}/confirm`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      confirmed_value: confirmedValue,
    }),
  });
}

export async function getEquipmentReadings(
  equipmentCode: string,
  measureType?: MeasureType,
  signal?: AbortSignal,
): Promise<ReadingHistoryResponse> {
  const searchParams = new URLSearchParams();

  if (measureType) {
    searchParams.set('measure_type', measureType);
  }

  const query = searchParams.toString();
  const path = `/equipment/${encodeURIComponent(equipmentCode)}/readings${query ? `?${query}` : ''}`;

  return request<ReadingHistoryResponse>(path, {
    method: 'GET',
    signal,
  });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, init);

  if (!response.ok) {
    throw await createApiError(response);
  }

  return (await response.json()) as T;
}

async function createApiError(response: Response): Promise<ApiRequestError> {
  let body: ApiErrorResponse | null = null;

  try {
    body = (await response.json()) as ApiErrorResponse;
  } catch {
    // A resposta pode não ser JSON se a infraestrutura falhar antes de chegar à API
  }

  return new ApiRequestError(
    response.status,
    body?.error_code ?? 'REQUEST_FAILED',
    body?.error_description ?? 'Não foi possível concluir a solicitação',
  );
}
