import { useEffect, useState } from 'react';

import { ApiRequestError, getEquipmentReadings } from '../api';
import type { MeasureType, MeasureTypeFilter, ReadingHistoryItem } from '../types';

interface ReadingHistoryProps {
  equipmentCode: string;
  refreshVersion: number;
}

export function ReadingHistory({ equipmentCode, refreshVersion }: ReadingHistoryProps) {
  const [filter, setFilter] = useState<MeasureTypeFilter>('ALL');
  const [readings, setReadings] = useState<ReadingHistoryItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setStatus('loading');
      setError(null);

      try {
        const response = await getEquipmentReadings(
          equipmentCode,
          filter === 'ALL' ? undefined : (filter as MeasureType),
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setReadings(response.readings);
        setStatus(response.readings.length > 0 ? 'success' : 'empty');
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        if (loadError instanceof ApiRequestError && loadError.errorCode === 'READINGS_NOT_FOUND') {
          setReadings([]);
          setStatus('empty');
          return;
        }

        setReadings([]);
        setStatus('error');
        setError(getErrorMessage(loadError));
      }
    }

    void loadHistory();

    return () => controller.abort();
  }, [equipmentCode, filter, refreshVersion]);

  return (
    <section className="card history-card" aria-labelledby="history-title">
      <div className="history-toolbar">
        <div className="card-heading history-heading">
          <div>
            <p className="eyebrow">Histórico</p>
            <h2 id="history-title">Leituras de {equipmentCode}</h2>
          </div>
        </div>

        <div className="history-controls">
          {status === 'success' ? (
            <span className="history-count">
              {readings.length} {readings.length === 1 ? 'registro' : 'registros'}
            </span>
          ) : null}

          <label>
            <span>Tipo</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as MeasureTypeFilter)}
            >
              <option value="ALL">Todos</option>
              <option value="HOURMETER">Horímetro</option>
              <option value="ODOMETER">Odômetro</option>
            </select>
          </label>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="loading-state">
          <span className="loading-bar" aria-hidden="true" />
          <p>Carregando histórico</p>
        </div>
      ) : null}

      {status === 'empty' ? (
        <div className="empty-state">
          <strong>Nenhuma leitura encontrada</strong>
        </div>
      ) : null}

      {status === 'error' ? <p className="message error history-message">{error}</p> : null}

      {status === 'success' ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Detectado</th>
                <th>Confirmado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.reading_uuid}>
                  <td>
                    <strong className="table-primary">{formatDateTime(reading.measure_datetime)}</strong>
                  </td>
                  <td>{reading.measure_type === 'HOURMETER' ? 'Horímetro' : 'Odômetro'}</td>
                  <td className="numeric-cell">{reading.detected_value}</td>
                  <td className="numeric-cell">{reading.confirmed_value ?? '—'}</td>
                  <td>
                    <span className={`status-pill ${reading.confirmed ? 'confirmed' : 'pending'}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {reading.confirmed ? 'Confirmada' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message.replace(/[.]$/, '');
  }

  return 'Não foi possível carregar o histórico';
}
