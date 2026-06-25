'use client';

import { useState } from 'react';

interface UACSelection {
  uacName: string;
  semester: number;
  component: string;
  curriculumName?: string;
}

interface Props {
  onNext: (data: UACSelection) => void;
}

// Formación Laboral is NOT available in semester 1 or 2
const SEMESTERS_WITHOUT_LABORAL = [1, 2];

export default function StepUAC({ onNext }: Props) {
  const [form, setForm] = useState<UACSelection>({
    uacName: '',
    semester: 3,
    component: 'laboral',
    curriculumName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isLaboralDisabled = SEMESTERS_WITHOUT_LABORAL.includes(form.semester);

  // When semester changes, auto-switch to 'fundamental' if laboral is not available
  const handleSemesterChange = (newSemester: number) => {
    const nextComponent =
      SEMESTERS_WITHOUT_LABORAL.includes(newSemester) && form.component === 'laboral'
        ? 'fundamental'
        : form.component;
    setForm({ ...form, semester: newSemester, component: nextComponent });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.uacName.trim()) e.uacName = 'El nombre de la UAC es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext(form);
  };

  return (
    <div className="card">
      <h2 className="card-title">Paso 1: Datos de la UAC</h2>
      <p className="card-subtitle">
        Ingresa los datos básicos de la Unidad de Aprendizaje Curricular que vas a planear.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="form-group">
            <label className="form-label form-label-required">Nombre de la UAC</label>
            <input
              className="form-input"
              placeholder="Ej: Despacha medicamentos y material de curación de acuerdo con prescripciones médicas"
              value={form.uacName}
              onChange={e => setForm({ ...form, uacName: e.target.value })}
            />
            {errors.uacName && <span className="form-error">{errors.uacName}</span>}
            <span className="form-hint">
              Copia exactamente el nombre de la UAC como aparece en tu programa de estudios.
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-required">Semestre</label>
              <select
                className="form-select"
                value={form.semester}
                onChange={e => handleSemesterChange(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(s => (
                  <option key={s} value={s}>{s}° Semestre</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label form-label-required">Componente curricular</label>
              <select
                className="form-select"
                value={form.component}
                onChange={e => setForm({ ...form, component: e.target.value })}
              >
                <option value="fundamental">Currículum Fundamental</option>
                <option value="ampliado">Currículum Ampliado</option>
                <option
                  value="laboral"
                  disabled={isLaboralDisabled}
                  style={isLaboralDisabled ? { color: '#aaa' } : {}}
                >
                  Formación Laboral{isLaboralDisabled ? ' (3°-6° sem.)' : ''}
                </option>
              </select>
              {isLaboralDisabled && (
                <span className="form-hint" style={{ color: 'var(--c-amber)', fontWeight: 500 }}>
                  ⚠️ Formación Laboral no aplica para 1° y 2° semestre.
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del currículo / especialidad</label>
            <input
              className="form-input"
              placeholder="Ej: Área de la Salud, Turismo, Administración..."
              value={form.curriculumName || ''}
              onChange={e => setForm({ ...form, curriculumName: e.target.value })}
            />
            <span className="form-hint">
              Opcional. El nombre de la especialidad o currículo al que pertenece esta UAC.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button type="submit" className="btn btn-primary">
              Continuar →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
