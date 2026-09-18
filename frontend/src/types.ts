export type MeasureType = 'HOURMETER' | 'ODOMETER';
export type MeasureTypeFilter = 'ALL' | MeasureType;

export interface CreateReadingRequest {
  image: string;
  equipment_code: string;
  measure_datetime: string;
  measure_type: MeasureType;
}

export interface CreateReadingResponse {
  reading_uuid: string;
  detected_value: number;
  image_url: string;
}

export interface ReadingHistoryItem {
  reading_uuid: string;
  measure_datetime: string;
  measure_type: MeasureType;
  detected_value: number;
  confirmed_value: number | null;
  confirmed: boolean;
  image_url: string;
}

export interface ReadingHistoryResponse {
  equipment_code: string;
  readings: ReadingHistoryItem[];
}

export interface ApiErrorResponse {
  error_code: string;
  error_description: string;
}
