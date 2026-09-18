import { useState } from 'react';

import { ApiRequestError, confirmReading, createReading } from './api';
import { NewReadingForm } from './components/NewReadingForm';
import { ReadingHistory } from './components/ReadingHistory';
import { ReadingResult } from './components/ReadingResult';
import type { CreateReadingRequest, CreateReadingResponse } from './types';

export default function App() {
  const [equipmentCode, setEquipmentCode] = useState('EMP-001');
  const [createdReading, setCreatedReading] = useState<CreateReadingResponse | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [confirmedValue, setConfirmedValue] = useState<number | null>(null);
  const [historyRefreshVersion, setHistoryRefreshVersion] = useState(0);

  function handleEquipmentChange(nextEquipmentCode: string) {
    setEquipmentCode(nextEquipmentCode);
    setCreatedReading(null);
    setCreateError(null);
    setConfirmationError(null);
    setConfirmedValue(null);
  }

  async function handleCreateReading(payload: CreateReadingRequest) {
    setCreateLoading(true);
    setCreateError(null);
    setConfirmationError(null);
    setConfirmedValue(null);

    try {
      const reading = await createReading(payload);
      setCreatedReading(reading);
      setHistoryRefreshVersion((version) => version + 1);
    } catch (error) {
      setCreatedReading(null);
      setCreateError(getErrorMessage(error, 'Não foi possível processar a leitura'));
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleConfirmReading(value: number) {
    if (!createdReading) {
      return;
    }

    setConfirmationLoading(true);
    setConfirmationError(null);

    try {
      await confirmReading(createdReading.reading_uuid, value);
      setConfirmedValue(value);
      setHistoryRefreshVersion((version) => version + 1);
    } catch (error) {
      setConfirmationError(getErrorMessage(error, 'Não foi possível confirmar a leitura'));
    } finally {
      setConfirmationLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="app-header">
        <div>
          <p className="product-name">Equipment Meter Reader</p>
          <h1>Leituras de horímetro e odômetro</h1>
          <p className="header-description">
            Leitura por imagem com confirmação e histórico por equipamento
          </p>
        </div>
      </header>

      <div className="workflow-grid">
        <NewReadingForm
          equipmentCode={equipmentCode}
          loading={createLoading}
          error={createError}
          onEquipmentChange={handleEquipmentChange}
          onSubmit={handleCreateReading}
        />

        <ReadingResult
          reading={createdReading}
          loading={confirmationLoading}
          confirmedValue={confirmedValue}
          error={confirmationError}
          onConfirm={handleConfirmReading}
        />
      </div>

      <ReadingHistory equipmentCode={equipmentCode} refreshVersion={historyRefreshVersion} />
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    return error.message.replace(/[.]$/, '');
  }

  return fallback;
}
