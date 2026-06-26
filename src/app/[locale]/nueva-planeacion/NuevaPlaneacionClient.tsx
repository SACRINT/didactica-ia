'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExtractedPdfData, TeacherContext } from '@/types/planning';
import StepUAC from '@/components/planeacion/StepUAC';
import StepPdfUpload from '@/components/planeacion/StepPdfUpload';
import StepContext from '@/components/planeacion/StepContext';
import StepGenerate from '@/components/planeacion/StepGenerate';

const STEPS = [
  { num: 1, label: 'Datos UAC' },
  { num: 2, label: 'Programa' },
  { num: 3, label: 'Contexto' },
  { num: 4, label: 'Generar' },
];

interface UACSelection {
  uacName: string;
  semester: number;
  component: string;
  curriculumName?: string;
}

interface Props {
  locale: string;
}

export default function NuevaPlaneacionClient({ locale }: Props) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [uacSelection, setUacSelection] = useState<UACSelection | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPdfData | null>(null);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);

  const handleUACNext = (data: UACSelection, initialData?: ExtractedPdfData) => {
    setUacSelection(data);
    if (initialData) {
      setExtractedData(initialData);
    } else {
      setExtractedData(null);
    }
    setStep(2);
  };

  const handlePdfNext = (data: ExtractedPdfData) => {
    setExtractedData(data);
    setStep(3);
  };

  const handleContextNext = async (ctx: TeacherContext) => {
    setContext(ctx);
    try {
      const res = await fetch('/api/plannings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uacName: uacSelection!.uacName,
          semester: uacSelection!.semester,
          component: uacSelection!.component,
          curriculumName: uacSelection!.curriculumName,
          paecContext: ctx.paecProblem,
          extractedData,
        }),
      });
      const data = await res.json();
      if (data.planning?.id) {
        setPlanningId(data.planning.id);
      }
    } catch (err) {
      console.error('Error creating planning record:', err);
    }
    setStep(4);
  };

  const handleDone = (id: string) => {
    router.push(`/${locale}/planeacion/${id}`);
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Nueva planeación didáctica</h1>
        <p className="page-subtitle">Ciclo escolar 2026-2027 · Formato oficial DBEPA</p>
      </div>

      <div style={{ maxWidth: '820px' }}>
        {/* Step progress indicator */}
        <div className="step-wizard">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`step-item ${
                s.num < step ? 'done' : s.num === step ? 'active' : ''
              }`}
            >
              <div className="step-num">
                {s.num < step ? '✓' : s.num}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 1 && (
          <StepUAC onNext={handleUACNext} />
        )}

        {step === 2 && uacSelection && (
          <StepPdfUpload
            uacSelection={uacSelection}
            initialData={extractedData}
            onNext={handlePdfNext}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && extractedData && (
          <StepContext
            extractedData={extractedData}
            onNext={handleContextNext}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && extractedData && context && (
          <StepGenerate
            planningId={planningId}
            extractedData={extractedData}
            context={context}
            uacSelection={uacSelection!}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
}
