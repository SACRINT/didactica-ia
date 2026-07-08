'use client';

import { useState, useEffect } from 'react';
import type { ExtractedPdfData, TeacherContext } from '@/types/planning';

interface Props {
  planningId: string | null;
  extractedData: ExtractedPdfData;
  context: TeacherContext;
  uacSelection: { uacName: string; semester: number; component: string };
  onDone: (id: string) => void;
}

type GenStep = 'preparing' | 'sending' | 'generating' | 'building' | 'done';

const GEN_STEPS: { key: GenStep; label: string }[] = [
  { key: 'preparing',  label: 'Preparando el contexto' },
  { key: 'sending',    label: 'Enviando información...' },
  { key: 'generating', label: 'Generando las 7 secciones del formato DBEPA' },
  { key: 'building',   label: 'Construyendo el documento' },
  { key: 'done',       label: '¡Planeación lista!' },
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function StepGenerate({
  planningId, extractedData, context, onDone,
}: Props) {
  const [currentStep, setCurrentStep] = useState<GenStep>('preparing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runGeneration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runGeneration = async () => {
    setError(null);
    try {
      setCurrentStep('preparing');
      await delay(600);

      if (!planningId) throw new Error('No se pudo crear el registro de la planeación. Intenta de nuevo.');

      setCurrentStep('sending');
      await delay(400);

      setCurrentStep('generating');

      const res = await fetch(`/api/plannings/${planningId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData, context }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar la planeación');

      setCurrentStep('building');
      await delay(900);

      setCurrentStep('done');
      await delay(1200);

      onDone(planningId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al generar la planeación');
    }
  };

  const stepIndex = GEN_STEPS.findIndex(s => s.key === currentStep);

  if (error) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: 'var(--c-error)', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>
            Error al generar
          </h2>
          <p style={{ color: 'var(--c-text-muted)', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px' }}>
            {error}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => runGeneration()}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="generation-container">
        <div className="generation-icon">
          {currentStep === 'done' ? '✨' : '🤖'}
        </div>
        <h2 className="generation-title">
          {currentStep === 'done' ? '¡Planeación generada!' : 'Generando tu planeación...'}
        </h2>
        <p className="generation-subtitle">
          {currentStep === 'done'
            ? 'Tu planeación didáctica está lista para descargar en formato DOCX editable.'
            : 'La inteligencia artificial está construyendo las 7 secciones del formato oficial DBEPA 2026-2027.'}
        </p>

        <div className="generation-steps">
          {GEN_STEPS.map((s, i) => {
            const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending';
            return (
              <div key={s.key} className={`generation-step ${state}`}>
                <span className="step-indicator">
                  {state === 'done'
                    ? '✅'
                    : state === 'active'
                    ? <span className="spinner" />
                    : '○'}
                </span>
                {s.label}
              </div>
            );
          })}
        </div>

        {currentStep !== 'done' && (
          <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--c-text-light)' }}>
            Esto puede tomar entre 15 y 45 segundos
          </p>
        )}
      </div>
    </div>
  );
}
