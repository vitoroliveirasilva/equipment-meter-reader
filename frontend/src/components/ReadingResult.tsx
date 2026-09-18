import { useState } from 'react';

import type { CreateReadingResponse } from '../types';

interface ReadingResultProps {
  reading: CreateReadingResponse | null;
  loading: boolean;
  confirmedValue: number | null;
  error: string | null;
  onConfirm: (value: number) => Promise<void>;
}

export function ReadingResult({
  reading,
  loading,
  confirmedValue,
  error,
  onConfirm,
}: ReadingResultProps) {
  if (!reading) {
    return (
      <section className="card result-card result-card-empty" aria-labelledby="reading-result-title">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Resultado</p>
            <h2 id="reading-result-title">Leitura detectada</h2>
          </div>
        </div>

        <div className="result-placeholder" aria-hidden="true">
          <span>Valor detectado</span>
          <strong>-</strong>
          <small>Aguardando processamento</small>
        </div>
      </section>
    );
  }

  return (
    <ReadingResultContent
      key={reading.reading_uuid}
      reading={reading}
      loading={loading}
      confirmedValue={confirmedValue}
      error={error}
      onConfirm={onConfirm}
    />
  );
}

function ReadingResultContent({
  reading,
  loading,
  confirmedValue,
  error,
  onConfirm,
}: Omit<ReadingResultProps, 'reading'> & { reading: CreateReadingResponse }) {
  const [correctionValue, setCorrectionValue] = useState(String(reading.detected_value));
  const [validationError, setValidationError] = useState<string | null>(null);

  const isConfirmed = confirmedValue !== null;

  async function handleCorrection() {
    const value = Number(correctionValue);

    if (!Number.isInteger(value) || value < 0) {
      setValidationError('Informe um valor inteiro igual ou maior que zero');
      return;
    }

    setValidationError(null);
    await onConfirm(value);
  }

  return (
    <section className="card result-card" aria-labelledby="reading-result-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Resultado</p>
          <h2 id="reading-result-title">Leitura detectada</h2>
        </div>
      </div>

      <div className={`detected-value ${isConfirmed ? 'confirmed' : ''}`}>
        <div className="detected-value-topline">
          <span>Valor detectado</span>
          <span className={`status-indicator ${isConfirmed ? 'confirmed' : 'pending'}`}>
            {isConfirmed ? 'Confirmada' : 'Pendente'}
          </span>
        </div>
        <strong>{reading.detected_value}</strong>
      </div>

      {isConfirmed ? (
        <div className="confirmation-summary">
          <span>Valor confirmado</span>
          <strong>{confirmedValue}</strong>
          <p>Histórico atualizado</p>
        </div>
      ) : (
        <div className="result-actions">
          <button
            className="primary-button"
            type="button"
            disabled={loading}
            onClick={() => onConfirm(reading.detected_value)}
          >
            {loading ? 'Confirmando' : 'Confirmar valor'}
          </button>

          <div className="correction-box">
            <div className="correction-heading">
              <strong>Corrigir valor</strong>
              <span>Informe o valor correto</span>
            </div>
            <label>
              <span>Novo valor</span>
              <input
                type="number"
                min="0"
                step="1"
                value={correctionValue}
                onChange={(event) => setCorrectionValue(event.target.value)}
                disabled={loading}
              />
            </label>
            <button
              className="secondary-button"
              type="button"
              disabled={loading}
              onClick={handleCorrection}
            >
              Corrigir e confirmar
            </button>
          </div>
        </div>
      )}

      {validationError ? <p className="message error">{validationError}</p> : null}
      {error ? <p className="message error">{error.replace(/[.]$/, '')}</p> : null}
    </section>
  );
}
