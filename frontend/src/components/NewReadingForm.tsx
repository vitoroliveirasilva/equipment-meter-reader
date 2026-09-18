import { useState, type ChangeEvent, type FormEvent } from 'react';

import { EQUIPMENTS } from '../equipment';
import type { CreateReadingRequest, MeasureType } from '../types';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

interface NewReadingFormProps {
  equipmentCode: string;
  loading: boolean;
  error: string | null;
  onEquipmentChange: (equipmentCode: string) => void;
  onSubmit: (payload: CreateReadingRequest) => Promise<void>;
}

export function NewReadingForm({
  equipmentCode,
  loading,
  error,
  onEquipmentChange,
  onSubmit,
}: NewReadingFormProps) {
  const [measureType, setMeasureType] = useState<MeasureType>('HOURMETER');
  const [measureDatetime, setMeasureDatetime] = useState(getCurrentLocalDateTime());
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setImageError(null);
    setImageDataUrl(null);
    setImageName(null);

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageError('Selecione uma imagem JPEG ou PNG');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('A imagem deve ter no máximo 5 MB');
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
    } catch {
      setImageError('Não foi possível ler a imagem selecionada');
      event.target.value = '';
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!imageDataUrl) {
      setImageError('Selecione uma imagem antes de processar a leitura');
      return;
    }

    await onSubmit({
      image: imageDataUrl,
      equipment_code: equipmentCode,
      measure_datetime: new Date(measureDatetime).toISOString(),
      measure_type: measureType,
    });
  }

  return (
    <section className="card form-card" aria-labelledby="new-reading-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Nova leitura</p>
          <h2 id="new-reading-title">Processar painel</h2>
          <p className="section-description">
            Selecione o equipamento, o tipo de leitura e a imagem do painel
          </p>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          <span>Equipamento</span>
          <select
            value={equipmentCode}
            onChange={(event) => onEquipmentChange(event.target.value)}
            disabled={loading}
          >
            {EQUIPMENTS.map((equipment) => (
              <option key={equipment.code} value={equipment.code}>
                {equipment.code} · {equipment.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Tipo de leitura</span>
          <select
            value={measureType}
            onChange={(event) => setMeasureType(event.target.value as MeasureType)}
            disabled={loading}
          >
            <option value="HOURMETER">Horímetro</option>
            <option value="ODOMETER">Odômetro</option>
          </select>
        </label>

        <label className="full-width">
          <span>Data e hora</span>
          <input
            type="datetime-local"
            value={measureDatetime}
            onChange={(event) => setMeasureDatetime(event.target.value)}
            required
            disabled={loading}
          />
        </label>

        <label className="full-width file-field">
          <span>Imagem do painel</span>
          <div className="file-control">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              disabled={loading}
            />
            <small>JPEG ou PNG · até 5 MB</small>
          </div>
        </label>

        {imageError ? <p className="message error full-width">{imageError}</p> : null}

        {imageDataUrl ? (
          <div className="image-preview full-width">
            <img src={imageDataUrl} alt="Preview do painel selecionado" />
            <div className="image-preview-copy">
              <span className="preview-state">Imagem selecionada</span>
              <strong>{imageName}</strong>
            </div>
          </div>
        ) : (
          <div className="empty-preview full-width">
            <div>
              <strong>Nenhuma imagem selecionada</strong>
              <small>O preview será exibido aqui</small>
            </div>
          </div>
        )}

        {error ? <p className="message error full-width">{error}</p> : null}

        <button className="primary-button full-width" type="submit" disabled={loading}>
          {loading ? 'Processando leitura' : 'Processar leitura'}
        </button>
      </form>
    </section>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unexpected FileReader result'));
    };

    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localTime.toISOString().slice(0, 16);
}
