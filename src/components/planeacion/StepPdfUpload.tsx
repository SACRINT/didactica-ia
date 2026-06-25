'use client';

import { useState, useCallback, useRef } from 'react';
import type { ExtractedPdfData, KeyActivity } from '@/types/planning';

interface Props {
  uacSelection: { uacName: string; semester: number; component: string };
  onNext: (data: ExtractedPdfData) => void;
  onBack: () => void;
}

export default function StepPdfUpload({ uacSelection, onNext, onBack }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<{ confidence: string; errors: string[] } | null>(null);
  const [formData, setFormData] = useState<ExtractedPdfData>({
    uacName: uacSelection.uacName,
    learningOutcome: '',
    totalHours: 54,
    activities: [
      { name: '', hours: 18, order: 1 },
      { name: '', hours: 18, order: 2 },
      { name: '', hours: 18, order: 3 },
    ],
    evidences: [''],
    parseConfidence: 'failed',
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      alert('Solo se aceptan archivos PDF.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert('El archivo no puede superar 10 MB.');
      return;
    }
    setFile(f);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('pdf', f);
      const res = await fetch('/api/pdf/parse', { method: 'POST', body: fd });
      const result = await res.json();

      setParseResult({ confidence: result.confidence || 'failed', errors: result.errors || [] });

      if (result.data) {
        setFormData(prev => ({
          ...prev,
          uacName: result.data.uacName || prev.uacName,
          learningOutcome: result.data.learningOutcome || prev.learningOutcome,
          totalHours: result.data.totalHours || prev.totalHours,
          activities: result.data.activities?.length > 0 ? result.data.activities : prev.activities,
          evidences: result.data.evidences?.length > 0 ? result.data.evidences : prev.evidences,
          rawText: result.data.rawText,
          parseConfidence: result.confidence || 'failed',
        }));
      }
    } catch {
      setParseResult({ confidence: 'failed', errors: ['Error de red al procesar el PDF.'] });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addActivity = () => {
    setFormData(prev => ({
      ...prev,
      activities: [...prev.activities, { name: '', hours: 18, order: prev.activities.length + 1 }],
    }));
  };

  const removeActivity = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities
        .filter((_, i) => i !== idx)
        .map((a, i) => ({ ...a, order: i + 1 })),
    }));
  };

  const updateActivity = (idx: number, field: keyof KeyActivity, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const confidenceLabel: Record<string, string> = {
    high: '✅ Alta confianza — datos extraídos correctamente',
    medium: '⚠️ Confianza media — algunos campos requieren revisión',
    low: '⚠️ Confianza baja — por favor revisa todos los campos',
    failed: '❌ No se pudo extraer — captura los datos manualmente',
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Upload card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title">Paso 2: Subir programa de estudios</h2>
        <p className="card-subtitle">
          Sube el PDF de tu plan y programa de estudios. La plataforma extraerá los datos
          automáticamente. Siempre podrás editar cualquier campo antes de continuar.
        </p>

        {!file ? (
          <div
            className={`pdf-upload-zone ${dragging ? 'dragover' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          >
            <div className="pdf-upload-icon">📄</div>
            <p className="pdf-upload-title">Arrastra tu PDF aquí o haz clic para seleccionar</p>
            <p className="pdf-upload-sub">Solo archivos PDF · Máximo 10 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="pdf-file-info">
            <span className="pdf-file-icon">📄</span>
            <span className="pdf-file-name">{file.name}</span>
            <span className="pdf-file-size">{(file.size / 1024).toFixed(0)} KB</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setFile(null); setParseResult(null); }}
            >
              Cambiar
            </button>
          </div>
        )}

        {loading && (
          <div className="alert alert-info">
            <div className="spinner spinner-dark" />
            <span>Extrayendo datos del programa de estudios...</span>
          </div>
        )}

        {parseResult && (
          <div className={`confidence confidence-${parseResult.confidence}`}>
            {confidenceLabel[parseResult.confidence]}
          </div>
        )}

        {parseResult?.errors?.map((err, i) => (
          <div key={i} className="alert alert-warning">{err}</div>
        ))}
      </div>

      {/* Always-visible editable fields — first option, not a fallback */}
      <div className="card">
        <h3 className="card-title" style={{ fontSize: '16px' }}>
          Revisar y completar datos del programa
        </h3>
        <p className="card-subtitle">
          Verifica que la información extraída sea correcta. Puedes editar todos los campos.
          {!file && ' (Puedes completar los datos manualmente sin subir un PDF.)'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="form-group">
            <label className="form-label form-label-required">Nombre de la UAC</label>
            <input
              className="form-input"
              value={formData.uacName}
              onChange={e => setFormData({ ...formData, uacName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Resultado de aprendizaje</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={formData.learningOutcome}
              onChange={e => setFormData({ ...formData, learningOutcome: e.target.value })}
              placeholder="Al finalizar la UAC, el estudiante será capaz de..."
            />
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Carga horaria total (horas)</label>
            <input
              type="number"
              className="form-input"
              value={formData.totalHours}
              min={10}
              max={200}
              onChange={e => setFormData({ ...formData, totalHours: Number(e.target.value) })}
              style={{ maxWidth: '140px' }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Actividades Clave</label>
            {formData.activities.map((a, idx) => (
              <div key={idx} className="activity-row" style={{ marginBottom: '8px' }}>
                <input
                  className="form-input"
                  placeholder={`Nombre de la Actividad Clave ${idx + 1}`}
                  value={a.name}
                  onChange={e => updateActivity(idx, 'name', e.target.value)}
                  required
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Horas"
                  value={a.hours}
                  min={1}
                  onChange={e => updateActivity(idx, 'hours', Number(e.target.value))}
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeActivity(idx)}
                  disabled={formData.activities.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addActivity}
              style={{ marginTop: '8px' }}
            >
              + Agregar actividad
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Evidencias sugeridas</label>
            {formData.evidences.map((ev, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  className="form-input"
                  placeholder={`Evidencia ${idx + 1}`}
                  value={ev}
                  onChange={e => {
                    const updated = [...formData.evidences];
                    updated[idx] = e.target.value;
                    setFormData({ ...formData, evidences: updated });
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setFormData({ ...formData, evidences: formData.evidences.filter((_, i) => i !== idx) })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFormData({ ...formData, evidences: [...formData.evidences, ''] })}
            >
              + Agregar evidencia
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Atrás</button>
        <button type="submit" className="btn btn-primary">Continuar →</button>
      </div>
    </form>
  );
}
